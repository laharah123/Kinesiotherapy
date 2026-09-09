import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import type { Database } from '@/lib/database.types';

const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL     ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** True when both Supabase env vars are present. */
export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

if (!isSupabaseConfigured) {
  // One clear warning instead of a crash at import time.
  console.warn(
    'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY ' +
    'to your .env file, then restart the bundler. Sign in and data sync stay unavailable until then.',
  );
}

// Placeholders keep createClient from throwing when the env vars are missing.
export const supabase = createClient<Database>(
  isSupabaseConfigured ? SUPABASE_URL : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? SUPABASE_ANON_KEY : 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,   // not a web app
    },
  },
);

// ─── Date helpers ──────────────────────────────────────────────────────────────

/** YYYY-MM-DD for the device's local calendar day (not UTC). */
export function localDateString(d: Date = new Date()): string {
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Local date, `days` days before/after `from`, as YYYY-MM-DD. */
function localDateOffset(days: number, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + days);
  return localDateString(d);
}

// ─── Auth helpers ──────────────────────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Deep link Supabase redirects back to after an external auth flow. */
export function authRedirectUrl(path = '/auth/callback'): string {
  return Linking.createURL(path);
}

/** Pull key/value pairs out of both the query string and the hash fragment. */
function parseAuthParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const withoutScheme = url.split('://').slice(1).join('://') || url;
  const query    = withoutScheme.split('?')[1]?.split('#')[0];
  const fragment = withoutScheme.split('#')[1];

  for (const chunk of [query, fragment]) {
    if (!chunk) continue;
    for (const pair of chunk.split('&')) {
      if (!pair) continue;
      const idx = pair.indexOf('=');
      const key = idx === -1 ? pair : pair.slice(0, idx);
      const val = idx === -1 ? ''   : pair.slice(idx + 1);
      out[decodeURIComponent(key)] = decodeURIComponent(val.replace(/\+/g, ' '));
    }
  }
  return out;
}

/**
 * Native OAuth: open the provider in an auth session browser, then turn the
 * redirect back into a Supabase session.
 *
 * Handles both flows: an implicit redirect carries access/refresh tokens in the
 * hash fragment, a PKCE redirect carries a `code` we exchange for a session.
 * Returns null when the user dismissed the browser.
 */
export async function signInWithOAuth(provider: 'google' | 'apple') {
  const redirectTo = authRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Could not start sign in. Please try again.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (!('url' in result) || typeof result.url !== 'string') return null;   // cancelled

  const params = parseAuthParams(result.url);

  if (params.error_description) throw new Error(params.error_description);
  if (params.error) throw new Error(params.error);

  if (params.code) {
    const exchanged = await supabase.auth.exchangeCodeForSession(params.code);
    if (exchanged.error) throw exchanged.error;
    return exchanged.data.session;
  }

  if (params.access_token && params.refresh_token) {
    const restored = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (restored.error) throw restored.error;
    return restored.data.session;
  }

  throw new Error('Sign in did not complete. Please try again.');
}

/** Sends a password reset email pointing back into the app. */
export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authRedirectUrl('/auth/reset'),
  });
  if (error) throw error;
}

// ─── Profile helpers ───────────────────────────────────────────────────────────

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function upsertProfile(
  userId: string,
  patch: { display_name?: string; streak_days?: number; last_session?: string },
) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...patch })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Subscription helpers ──────────────────────────────────────────────────────

export async function fetchSubscription(userId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;   // PGRST116 = not found
  return data ?? null;
}

// ─── Plan helpers ──────────────────────────────────────────────────────────────

export async function savePlan(userId: string, plan: {
  condition_id: string | null;
  title: string;
  effort: string;
  duration_days: number;
  exercise_pool: string[];
  user_tier: number;
  pain_ema: number;
}) {
  const { data, error } = await supabase
    .from('plans')
    .insert({ user_id: userId, active: true, ...plan })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchActivePlan(userId: string) {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function updatePlanAdaptation(planId: string, patch: {
  user_tier?: number;
  pain_ema?: number;
  promotion_streak?: number;
  demotion_trigger?: number;
}) {
  const { error } = await supabase
    .from('plans')
    .update(patch)
    .eq('id', planId);
  if (error) throw error;
}

// ─── Session helpers ───────────────────────────────────────────────────────────

export async function createSession(userId: string, planId: string, day?: number) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: userId, plan_id: planId, completed: false, ...(day != null ? { day } : {}) })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function completeSession(sessionId: string, patch: {
  duration_secs: number;
  avg_pain: number;
}) {
  const { error } = await supabase
    .from('sessions')
    .update({ completed: true, ...patch })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function saveExerciseLogs(
  sessionId: string,
  logs: {
    exercise_id: string;
    pain_level: number;
    feedback_tags: string[];
    notes?: string;
  }[],
) {
  const rows = logs.map((l) => ({ session_id: sessionId, ...l }));
  const { error } = await supabase.from('exercise_logs').insert(rows);
  if (error) throw error;
}

export async function fetchRecentSessions(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, date, duration_secs, avg_pain, plan_id, plans(title)')
    .eq('user_id', userId)
    .eq('completed', true)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ─── Progress helpers ──────────────────────────────────────────────────────────

/** Returns the last 7 local calendar days of avg_pain for a user */
export async function fetchWeeklyPain(userId: string): Promise<number[]> {
  const sevenDaysAgo = localDateOffset(-6);
  const { data, error } = await supabase
    .from('sessions')
    .select('date, avg_pain')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('date', sevenDaysAgo)
    .order('date', { ascending: true });
  if (error) throw error;

  // Build a 7-element array aligned to the last 7 calendar days
  const painByDate: Record<string, number> = {};
  (data ?? []).forEach((row) => {
    if (row.date && row.avg_pain != null) painByDate[row.date] = Number(row.avg_pain);
  });

  return Array.from({ length: 7 }, (_, i) => {
    const d = localDateOffset(i - 6);
    return painByDate[d] ?? 0;
  });
}
