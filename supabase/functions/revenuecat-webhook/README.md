# revenuecat-webhook

Server side truth for subscriptions. RevenueCat posts every purchase event here,
and this function is the only thing that writes paid state into the
`subscriptions` table (with the service role key, so it bypasses RLS).

The app can read its own row and nothing more, so an entitlement cannot be
forged from the client. See `supabase/migrations/003_subscriptions.sql`.

## Secrets

Set these on the project before deploying:

```bash
supabase secrets set REVENUECAT_WEBHOOK_SECRET="<a long random string>"

# Optional. Only needed if the store product ids differ from the defaults,
# which match PRICING in lib/tokens.ts.
supabase secrets set RC_MONTHLY_PRODUCT_ID="com.kinesiotherapy.monthly"
supabase secrets set RC_YEARLY_PRODUCT_ID="com.kinesiotherapy.yearly"
```

| Secret | Required | Notes |
| --- | --- | --- |
| `REVENUECAT_WEBHOOK_SECRET` | yes | Shared bearer token. Paste the same value into the RevenueCat dashboard. |
| `SUPABASE_URL` | yes | Injected automatically by Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Injected automatically. Never ship it in the app. |
| `RC_MONTHLY_PRODUCT_ID` | no | Defaults to `com.kinesiotherapy.monthly`. |
| `RC_YEARLY_PRODUCT_ID` | no | Defaults to `com.kinesiotherapy.yearly`. |

## Deploy

```bash
supabase functions deploy revenuecat-webhook --no-verify-jwt
```

`--no-verify-jwt` is required: RevenueCat sends its own bearer secret, not a
Supabase user JWT. The function checks that secret itself and returns 401 when
it does not match.

## Wire up RevenueCat

RevenueCat dashboard, Project settings, Integrations, Webhooks:

- URL: `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`
- Authorization header: `Bearer <REVENUECAT_WEBHOOK_SECRET>`

The app identifies the customer with `Purchases.logIn(<supabase user id>)`
(`identifyRevenueCatUser` in `lib/revenuecat.ts`), so `app_user_id` on every
event is the Supabase user id, which is how the row is found.

## Event mapping

| RevenueCat event | `status` | `current_period_ends` | Effect in the app |
| --- | --- | --- | --- |
| `INITIAL_PURCHASE` | `active` | `expiration_at_ms` | Full access |
| `RENEWAL` | `active` | `expiration_at_ms` | Full access |
| `PRODUCT_CHANGE` | `active` | `expiration_at_ms` | Full access, `plan_type` follows the new product |
| `UNCANCELLATION` | `active` | `expiration_at_ms` | Full access |
| `CANCELLATION` | `cancelled` | `expiration_at_ms` | Access stays until the period ends |
| `BILLING_ISSUE` | `cancelled` | `expiration_at_ms` | Grace period: access until the period ends |
| `EXPIRATION` | `none` | `expiration_at_ms` | Access ends, the app drops to the limited tier |
| anything else | not written | | Acknowledged with `{"ok":true,"ignored":...}` |

`plan_type` comes from `product_id` (the Google Play `:base-plan` suffix is
stripped) and is set to null on `EXPIRATION`. `trial_ends_at` is never touched
here: the trial row is created by the `on_profile_created_subscription` trigger.

## Responses

| Status | Body | Meaning |
| --- | --- | --- |
| 200 | `{"ok":true,"status":"active","type":"RENEWAL"}` | Row upserted |
| 200 | `{"ok":true,"ignored":"TEST"}` | Event deliberately not acted on |
| 400 | `{"error":"invalid json"}` / `{"error":"missing event"}` | Malformed payload |
| 401 | `{"error":"unauthorized"}` | Bad or missing bearer secret |
| 405 | `{"error":"method not allowed"}` | Not a POST |
| 500 | `{"error":"database write failed"}` | Write failed, RevenueCat retries |

Events whose `app_user_id` is not a Supabase uuid (anonymous RevenueCat ids) are
acknowledged and ignored: there is no row to attach them to.

## Local check

```bash
supabase functions serve revenuecat-webhook --no-verify-jwt

curl -i -X POST http://localhost:54321/functions/v1/revenuecat-webhook \
  -H "Authorization: Bearer $REVENUECAT_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"event":{"type":"INITIAL_PURCHASE","app_user_id":"<a real user uuid>",
       "product_id":"com.kinesiotherapy.yearly","expiration_at_ms":1788000000000}}'
```

This file is Deno, not React Native: it is excluded from the app's TypeScript
build in `tsconfig.json`.
