// RevenueCat webhook -> Supabase `subscriptions`
//
// Deno edge function. Deploy with:
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
//
// This is the only writer of paid subscription state. The client can read its
// own row and nothing else (see supabase/migrations/003_subscriptions.sql), so
// entitlements cannot be forged from the app.
//
// Request contract
//   POST /functions/v1/revenuecat-webhook
//   Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>
//   Content-Type: application/json
//   Body: RevenueCat webhook payload, { "event": { ... } }
//
// Responses
//   200 {"ok":true,"status":...}   row upserted
//   200 {"ok":true,"ignored":...}  event we deliberately do not act on
//   401 {"error":"unauthorized"}   missing or wrong bearer secret
//   400 {"error":...}              unparsable body or missing app_user_id
//   500 {"error":...}              database write failed (RevenueCat retries)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '';

// Product ids, overridable per environment so the store ids can change without a
// code change. Defaults match PRICING in lib/tokens.ts.
const MONTHLY_PRODUCT_ID = Deno.env.get('RC_MONTHLY_PRODUCT_ID') ?? 'com.kinesiotherapy.monthly';
const YEARLY_PRODUCT_ID = Deno.env.get('RC_YEARLY_PRODUCT_ID') ?? 'com.kinesiotherapy.yearly';

type SubStatus = 'trialing' | 'active' | 'cancelled' | 'none';

interface RevenueCatEvent {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  period_type?: string;
  expiration_at_ms?: number | null;
  event_timestamp_ms?: number | null;
}

/**
 * How each RevenueCat event maps onto our row.
 *
 *   INITIAL_PURCHASE / RENEWAL / PRODUCT_CHANGE / UNCANCELLATION -> active
 *   CANCELLATION   -> cancelled. Auto renew is off but the user paid through
 *                     current_period_ends, and the app keeps access until then.
 *   BILLING_ISSUE  -> cancelled. Same grace behaviour: access until the period
 *                     ends, then EXPIRATION closes it out.
 *   EXPIRATION     -> none. Access ends now.
 *
 * Anything else (TEST, TRANSFER, SUBSCRIBER_ALIAS, ...) is acknowledged and
 * ignored so RevenueCat does not retry it.
 */
const STATUS_BY_EVENT: Record<string, SubStatus> = {
  INITIAL_PURCHASE: 'active',
  RENEWAL: 'active',
  PRODUCT_CHANGE: 'active',
  UNCANCELLATION: 'active',
  CANCELLATION: 'cancelled',
  BILLING_ISSUE: 'cancelled',
  EXPIRATION: 'none',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Strips the Google Play base-plan suffix, e.g. "com.x.yearly:annual". */
function planTypeFor(productId: string | undefined): 'monthly' | 'yearly' | null {
  if (!productId) return null;
  const base = productId.split(':')[0];
  if (base === MONTHLY_PRODUCT_ID) return 'monthly';
  if (base === YEARLY_PRODUCT_ID) return 'yearly';
  // Fall back to a name check so a renamed store product still lands sensibly.
  if (/year|annual/i.test(base)) return 'yearly';
  if (/month/i.test(base)) return 'monthly';
  return null;
}

function isoOrNull(ms: number | null | undefined): string | null {
  if (!ms || !Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

/**
 * The Supabase user id. The client calls Purchases.logIn(session.user.id), so
 * app_user_id is that uuid; anonymous ids ("$RCAnonymousID:...") belong to a
 * customer we cannot match to a row.
 */
function supabaseUserId(event: RevenueCatEvent): string | null {
  const candidates = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])];
  for (const candidate of candidates) {
    if (candidate && UUID_RE.test(candidate)) return candidate;
  }
  return null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  // ─── Auth: shared bearer secret, also set in the RevenueCat dashboard ────────
  if (!WEBHOOK_SECRET) {
    console.error('REVENUECAT_WEBHOOK_SECRET is not set');
    return json({ error: 'server not configured' }, 500);
  }
  const authorization = req.headers.get('Authorization') ?? '';
  if (authorization !== `Bearer ${WEBHOOK_SECRET}`) {
    return json({ error: 'unauthorized' }, 401);
  }

  // ─── Payload ────────────────────────────────────────────────────────────────
  let payload: { event?: RevenueCatEvent };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const event = payload.event;
  if (!event || typeof event.type !== 'string') {
    return json({ error: 'missing event' }, 400);
  }

  const status = STATUS_BY_EVENT[event.type];
  if (!status) {
    return json({ ok: true, ignored: event.type });
  }

  const userId = supabaseUserId(event);
  if (!userId) {
    // Nothing to attach the purchase to. Acknowledge so RevenueCat stops retrying.
    return json({ ok: true, ignored: 'no supabase user id on event' });
  }

  // ─── Write ──────────────────────────────────────────────────────────────────
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const row = {
    user_id: userId,
    status,
    plan_type: status === 'none' ? null : planTypeFor(event.product_id),
    product_id: event.product_id ?? null,
    current_period_ends: isoOrNull(event.expiration_at_ms),
    revenuecat_app_user_id: event.app_user_id ?? userId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('subscriptions')
    .upsert(row, { onConflict: 'user_id' });

  if (error) {
    console.error('subscriptions upsert failed', { userId, type: event.type, error });
    // 500 so RevenueCat retries with its own backoff.
    return json({ error: 'database write failed' }, 500);
  }

  return json({ ok: true, status, type: event.type });
});
