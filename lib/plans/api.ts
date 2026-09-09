/**
 * Supabase queries for plans, their day-by-day schedule and day completion.
 *
 * lib/supabase.ts keeps the generic helpers; anything that has to read or write
 * the full schedule lives here so the plan feature owns its own queries.
 */

import { supabase } from '@/lib/supabase';
import type { DaySchedule, EffortLabel, Plan, PlanExercise } from '@/lib/routines';
import { localDateString } from '@/lib/plans/dates';

/** A plan as it exists remotely: the plan itself plus what the user has done. */
export interface LoadedPlan {
  planId: string;
  plan: Plan;
  completedDays: number[];
  startedAt: string | null;
  lastCompletedOn: string | null;
}

function toEffort(value: string | null | undefined): EffortLabel {
  return value === 'Moderate' || value === 'Vigorous' ? value : 'Light';
}

function toTier(value: number | null | undefined): 1 | 2 | 3 {
  return value === 2 || value === 3 ? value : 1;
}

function scheduleRows(planId: string, schedule: DaySchedule[]) {
  return schedule.flatMap((day) =>
    day.exercises.map((pe, index) => ({
      plan_id:      planId,
      exercise_id:  pe.exerciseId,
      day:          day.day,
      sequence:     index,
      reps:         pe.reps,
      sets:         pe.sets,
      hold_seconds: pe.holdSeconds,
      rest_seconds: pe.restSeconds,
    })),
  );
}

/**
 * Saves a freshly generated plan and its whole schedule.
 *
 * Any previously active plan is deactivated first: `plans_user_active_idx` is a
 * unique partial index on (user_id) where active, so two active plans would
 * collide.
 *
 * Returns the new plan id.
 */
export async function savePlanWithSchedule(userId: string, plan: Plan): Promise<string> {
  const { error: deactivateError } = await supabase
    .from('plans')
    .update({ active: false })
    .eq('user_id', userId)
    .eq('active', true);
  if (deactivateError) throw deactivateError;

  const { data, error } = await supabase
    .from('plans')
    .insert({
      user_id:          userId,
      active:           true,
      condition_id:     plan.conditionId,
      title:            plan.title,
      effort:           plan.effort,
      duration_days:    plan.durationDays,
      exercise_pool:    plan.exercisePool,
      user_tier:        plan.userTier,
      pain_ema:         plan.painEMA,
      promotion_streak: plan.promotionStreak,
      demotion_trigger: plan.demotionTrigger,
      started_at:       localDateString(),
      completed_days:   [],
    })
    .select('id')
    .single();
  if (error) throw error;

  const planId = data.id;
  const rows = scheduleRows(planId, plan.schedule);
  if (rows.length > 0) {
    const { error: rowsError } = await supabase.from('plan_exercises').insert(rows);
    if (rowsError) throw rowsError;
  }

  return planId;
}

/**
 * Reads the user's active plan, its schedule and which days are done.
 * Returns null when the user has no active plan.
 */
export async function loadActivePlan(userId: string): Promise<LoadedPlan | null> {
  const { data: planRow, error } = await supabase
    .from('plans')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!planRow) return null;

  const { data: exerciseRows, error: exercisesError } = await supabase
    .from('plan_exercises')
    .select('day, sequence, exercise_id, reps, sets, hold_seconds, rest_seconds')
    .eq('plan_id', planRow.id)
    .order('day', { ascending: true })
    .order('sequence', { ascending: true });
  if (exercisesError) throw exercisesError;

  const byDay = new Map<number, PlanExercise[]>();
  (exerciseRows ?? []).forEach((row) => {
    const list = byDay.get(row.day) ?? [];
    list.push({
      exerciseId:  row.exercise_id,
      reps:        row.reps,
      sets:        row.sets,
      holdSeconds: row.hold_seconds,
      restSeconds: row.rest_seconds,
    });
    byDay.set(row.day, list);
  });

  const schedule: DaySchedule[] = Array.from(
    { length: planRow.duration_days },
    (_, i) => {
      const day = i + 1;
      const exercises = byDay.get(day) ?? [];
      return { day, isRest: exercises.length === 0, exercises };
    },
  );

  const { data: sessionRows, error: sessionsError } = await supabase
    .from('sessions')
    .select('date, day')
    .eq('user_id', userId)
    .eq('plan_id', planRow.id)
    .eq('completed', true)
    .order('date', { ascending: true });
  if (sessionsError) throw sessionsError;

  // The plan row is the source of truth for completed days; sessions fill in
  // anything recorded before the plan row was last written.
  const completed = new Set<number>(planRow.completed_days ?? []);
  (sessionRows ?? []).forEach((row) => {
    if (typeof row.day === 'number') completed.add(row.day);
  });

  const lastSessionDate = (sessionRows ?? []).length > 0
    ? sessionRows![sessionRows!.length - 1].date
    : null;

  const plan: Plan = {
    conditionId:         planRow.condition_id,
    bodyRegions:         [],
    exercisePool:        planRow.exercise_pool ?? [],
    userTier:            toTier(planRow.user_tier),
    painEMA:             Number(planRow.pain_ema ?? 2),
    promotionStreak:     planRow.promotion_streak ?? 0,
    demotionTrigger:     planRow.demotion_trigger ?? 0,
    schedule,
    effort:              toEffort(planRow.effort),
    title:               planRow.title,
    durationDays:        planRow.duration_days,
    excludedExerciseIds: [],
  };

  return {
    planId:          planRow.id,
    plan,
    completedDays:   Array.from(completed).sort((a, b) => a - b),
    startedAt:       planRow.started_at ?? null,
    lastCompletedOn: planRow.last_completed_on ?? lastSessionDate,
  };
}

/** Records a schedule day as done on the plan row. */
export async function markDayCompleted(planId: string, day: number): Promise<void> {
  const { data, error } = await supabase
    .from('plans')
    .select('completed_days')
    .eq('id', planId)
    .single();
  if (error) throw error;

  const completed = new Set<number>(data?.completed_days ?? []);
  completed.add(day);

  const { error: updateError } = await supabase
    .from('plans')
    .update({
      completed_days:    Array.from(completed).sort((a, b) => a - b),
      last_completed_on: localDateString(),
    })
    .eq('id', planId);
  if (updateError) throw updateError;
}

/** Rewrites one day of the schedule (delete then insert). */
export async function replaceDayExercises(
  planId: string,
  day: number,
  exercises: PlanExercise[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('plan_exercises')
    .delete()
    .eq('plan_id', planId)
    .eq('day', day);
  if (deleteError) throw deleteError;

  if (exercises.length === 0) return;

  const { error } = await supabase
    .from('plan_exercises')
    .insert(scheduleRows(planId, [{ day, isRest: false, exercises }]));
  if (error) throw error;
}

/** Keeps the stored effort label in step with the adapted pain EMA. */
export async function updatePlanEffort(planId: string, effort: EffortLabel): Promise<void> {
  const { error } = await supabase
    .from('plans')
    .update({ effort })
    .eq('id', planId);
  if (error) throw error;
}
