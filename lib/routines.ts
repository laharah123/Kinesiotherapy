import { EXERCISES, EXERCISE_MAP, type Exercise } from '@/data/exercises';
import { CONDITION_MAP } from '@/data/conditions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IntakeAnswers {
  conditionId: string | null;
  bodyRegions: string[];
  painDuration: 'acute' | 'subacute' | 'persistent' | 'chronic';
  painIntensity: number;   // 0–4
  aggravatingFactors: string[];
  previousTreatment: string[];
  goals: string[];
}

export interface PlanExercise {
  exerciseId: string;
  reps: number;
  sets: number;
  holdSeconds: number;
  restSeconds: number;
}

export interface DaySchedule {
  day: number;   // 1-based
  isRest: boolean;
  exercises: PlanExercise[];
}

export interface Plan {
  conditionId: string | null;
  bodyRegions: string[];
  exercisePool: string[];   // all exercise IDs for this plan (all tiers)
  userTier: 1 | 2 | 3;
  painEMA: number;
  promotionStreak: number;
  demotionTrigger: number;
  schedule: DaySchedule[];
  effort: 'Light' | 'Moderate' | 'Vigorous';
  title: string;
  durationDays: number;
}

export interface CompletedExerciseLog {
  exerciseId: string;
  painLevel: number;    // 0–4
  feedbackTags: string[];
  notes?: string;
}

export interface CompletedSession {
  logs: CompletedExerciseLog[];
}

export interface SessionAdaptation {
  newTier: 1 | 2 | 3;
  painEMA: number;
  promotionStreak: number;
  demotionTrigger: number;
  nextExercises: PlanExercise[];
  promoted: boolean;
  demoted: boolean;
  parameterNote?: string;
}

// ─── Pool building ─────────────────────────────────────────────────────────────

function buildExercisePool(conditionId: string | null, bodyRegions: string[]): string[] {
  const ids = new Set<string>();

  if (conditionId) {
    const condition = CONDITION_MAP[conditionId];
    if (condition) condition.exerciseIds.forEach((id) => ids.add(id));
  }

  // Supplement with exercises matching any selected body region
  EXERCISES.forEach((ex) => {
    if (ex.bodyRegions.some((r) => bodyRegions.includes(r))) {
      ids.add(ex.id);
    }
  });

  // Fallback: if pool is empty, include all tier-1 exercises
  if (ids.size === 0) {
    EXERCISES.filter((e) => e.intensityTier === 1).forEach((e) => ids.add(e.id));
  }

  return Array.from(ids);
}

function exercisesForTier(pool: string[], maxTier: 1 | 2 | 3): Exercise[] {
  return pool
    .map((id) => EXERCISE_MAP[id])
    .filter((e): e is Exercise => !!e && e.intensityTier <= maxTier);
}

// ─── Session exercise selection ────────────────────────────────────────────────

function pickExercisesForDay(
  pool: string[],
  tier: 1 | 2 | 3,
  dayIndex: number,
  count: number,
  adjustment?: ParameterAdjustment,
): PlanExercise[] {
  const available = exercisesForTier(pool, tier);
  if (available.length === 0) return [];

  // Deterministic rotation: shift start index by dayIndex
  const start = dayIndex % available.length;
  const selected: Exercise[] = [];
  for (let i = 0; i < count; i++) {
    selected.push(available[(start + i) % available.length]);
  }

  return selected.map((ex) => applyAdjustment(ex, adjustment));
}

function applyAdjustment(ex: Exercise, adj?: ParameterAdjustment): PlanExercise {
  if (!adj) {
    return {
      exerciseId: ex.id,
      reps: ex.defaultReps,
      sets: ex.defaultSets,
      holdSeconds: ex.defaultHoldSeconds,
      restSeconds: ex.defaultRestSeconds,
    };
  }

  const maxReps = ex.defaultReps * 2;
  const reps  = Math.min(maxReps, Math.round(ex.defaultReps * adj.repsFactor));
  const sets  = Math.max(1, ex.defaultSets + adj.setsDelta);
  const hold  = Math.max(0, ex.defaultHoldSeconds + adj.holdDelta);
  const rest  = Math.max(10, Math.round(ex.defaultRestSeconds * adj.restFactor));

  return { exerciseId: ex.id, reps, sets, holdSeconds: hold, restSeconds: rest };
}

// ─── Plan generation ──────────────────────────────────────────────────────────

export function generatePlan(intake: IntakeAnswers): Plan {
  const pool = buildExercisePool(intake.conditionId, intake.bodyRegions);

  const conditionTemplate = intake.conditionId
    ? CONDITION_MAP[intake.conditionId]?.routineTemplate
    : null;

  const durationDays = conditionTemplate?.durationDays ?? 28;
  const exercisesPerSession = conditionTemplate?.exercisesPerSession ?? 6;
  const effort = conditionTemplate?.effort ?? 'Light';
  const title  = conditionTemplate?.title ?? 'Your personalised plan';

  const schedule: DaySchedule[] = [];
  let activeDay = 0;

  for (let day = 1; day <= durationDays; day++) {
    // Week pattern: 5 active days + 2 rest days (days 6 & 7 of each week)
    const weekDay = ((day - 1) % 7) + 1;
    const isRest  = weekDay === 6 || weekDay === 7;

    if (isRest) {
      schedule.push({ day, isRest: true, exercises: [] });
    } else {
      const exercises = pickExercisesForDay(pool, 1, activeDay, exercisesPerSession);
      schedule.push({ day, isRest: false, exercises });
      activeDay++;
    }
  }

  return {
    conditionId: intake.conditionId,
    bodyRegions: intake.bodyRegions,
    exercisePool: pool,
    userTier: 1,
    painEMA: intake.painIntensity,
    promotionStreak: 0,
    demotionTrigger: 0,
    schedule,
    effort,
    title,
    durationDays,
  };
}

// ─── Pain score helpers ────────────────────────────────────────────────────────

function meanPainScore(session: CompletedSession): number {
  if (session.logs.length === 0) return 0;
  const sum = session.logs.reduce((acc, log) => acc + log.painLevel, 0);
  return sum / session.logs.length;
}

function collectAllTags(session: CompletedSession): string[] {
  return session.logs.flatMap((log) => log.feedbackTags);
}

// ─── Parameter adjustment ─────────────────────────────────────────────────────

interface ParameterAdjustment {
  repsFactor: number;
  setsDelta: number;
  restFactor: number;
  holdDelta: number;
}

function computeParameterAdjustment(
  score: number,
  tags: string[],
): { adj: ParameterAdjustment; note: string } {
  let repsFactor = 1;
  let setsDelta  = 0;
  let restFactor = 1;
  let holdDelta  = 0;
  let note = '';

  if (score >= 3.5) {
    repsFactor = 0.8; setsDelta = -1; restFactor = 1.5;
    note = "We've scaled things back a little — you've been working hard.";
  } else if (score >= 2.5) {
    repsFactor = 0.9; restFactor = 1.3;
    note = 'Easing off slightly for the next session.';
  } else if (score >= 0.5 && score < 1.5) {
    repsFactor = 1.1; restFactor = 0.9;
    note = 'Great progress — gently building from here.';
  } else if (score < 0.5) {
    repsFactor = 1.1; setsDelta = 1; restFactor = 0.8;
    note = "Excellent session. You're ready for more.";
  }

  // Tag-based modifiers (applied on top of score-based)
  if (tags.includes('Easy')) {
    repsFactor = Math.min(2, repsFactor + 0.1);
  }
  if (tags.includes('Tightness')) {
    holdDelta += 5;
  }

  return { adj: { repsFactor, setsDelta, restFactor, holdDelta }, note };
}

// ─── Tier logic ───────────────────────────────────────────────────────────────

function tierThreshold(tier: 1 | 2 | 3): number {
  if (tier === 1) return 2.0;
  if (tier === 2) return 1.0;
  return 0.5;
}

function computeNewTier(
  current: 1 | 2 | 3,
  promotionStreak: number,
  demotionTrigger: number,
  painEMA: number,
): 1 | 2 | 3 {
  // Promotion
  if (current === 1 && promotionStreak >= 2 && painEMA <= 2.0) return 2;
  if (current === 2 && promotionStreak >= 3 && painEMA <= 1.0) return 3;

  // Demotion
  if (current === 3 && demotionTrigger >= 2) return 2;
  if (current === 2 && demotionTrigger >= 2) return 1;

  return current;
}

// ─── Session adaptation ───────────────────────────────────────────────────────

export function adaptSession(plan: Plan, completedSession: CompletedSession): SessionAdaptation {
  const score = meanPainScore(completedSession);
  const tags  = collectAllTags(completedSession);

  // 'Felt good' gives a bonus push toward promotion
  const effectiveScore = tags.includes('Felt good') ? Math.max(0, score - 0.5) : score;

  // Update EMA
  const painEMA = 0.4 * score + 0.6 * plan.painEMA;

  // Update streaks
  let { promotionStreak, demotionTrigger } = plan;
  if (effectiveScore <= tierThreshold(plan.userTier)) {
    promotionStreak++;
    demotionTrigger = 0;
  } else if (score >= 3.0) {
    demotionTrigger++;
    promotionStreak = 0;
  } else {
    promotionStreak = 0;
    demotionTrigger = 0;
  }

  const newTier = computeNewTier(plan.userTier, promotionStreak, demotionTrigger, painEMA);
  const promoted = newTier > plan.userTier;
  const demoted  = newTier < plan.userTier;

  const { adj, note } = computeParameterAdjustment(score, tags);

  // Build next session exercises, replacing any "Pinched" exercise
  const pinnedExercises = completedSession.logs
    .filter((l) => l.feedbackTags.includes('Pinched'))
    .map((l) => l.exerciseId);

  const availablePool = pinnedExercises.length > 0
    ? plan.exercisePool.filter((id) => !pinnedExercises.includes(id))
    : plan.exercisePool;

  const conditionTemplate = plan.conditionId
    ? CONDITION_MAP[plan.conditionId]?.routineTemplate
    : null;
  const count = conditionTemplate?.exercisesPerSession ?? 6;

  // Use current active day count as offset for rotation
  const activeDaysCompleted = plan.schedule.filter((d) => !d.isRest && d.exercises.length > 0).length;
  const nextExercises = pickExercisesForDay(availablePool, newTier, activeDaysCompleted, count, adj);

  return {
    newTier,
    painEMA,
    promotionStreak,
    demotionTrigger,
    nextExercises,
    promoted,
    demoted,
    parameterNote: note || undefined,
  };
}

// ─── Helpers consumed by UI ───────────────────────────────────────────────────

/** Returns exercises for a specific day in the plan (UI use) */
export function getSessionExercises(plan: Plan, day: number): PlanExercise[] {
  const daySchedule = plan.schedule.find((d) => d.day === day);
  return daySchedule?.exercises ?? [];
}

/** Checks if a given exercise is currently visible to the user (tier gate) */
export function isExerciseUnlocked(exerciseId: string, userTier: 1 | 2 | 3): boolean {
  const ex = EXERCISE_MAP[exerciseId];
  if (!ex) return false;
  return ex.intensityTier <= userTier;
}

/** Effort label from plan pain EMA for display */
export function effortLabel(painEMA: number): string {
  if (painEMA >= 3) return 'Light';
  if (painEMA >= 1.5) return 'Moderate';
  return 'Vigorous';
}
