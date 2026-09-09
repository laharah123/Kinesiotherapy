import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

const SUPABASE_URL     = process.env.EXPO_PUBLIC_SUPABASE_URL     ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,   // not a web app
  },
});

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

export async function signInWithOAuth(provider: 'google' | 'apple') {
  const { data, error } = await supabase.auth.signInWithOAuth({ provider });
  if (error) throw error;
  return data;
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

export async function createTrialSubscription(userId: string) {
  const trialEndsAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan_type: null,
      status: 'trialing',
      trial_ends_at: trialEndsAt,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
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

export async function createSession(userId: string, planId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: userId, plan_id: planId, completed: false })
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

/** Returns the last 7 days of avg_pain for a user */
export async function fetchWeeklyPain(userId: string): Promise<number[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
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
    const d = new Date(Date.now() - (6 - i) * 86_400_000).toISOString().slice(0, 10);
    return painByDate[d] ?? 0;
  });
}
