/**
 * Comprehensive unit tests for lib/routines.ts.
 *
 * Covers:
 *   - generatePlan: pool building, schedule layout, field defaults
 *   - adaptSession: EMA, tier promotion/demotion, tag modifiers
 *                   (Felt good / Easy / Tightness / Pinched), parameter notes
 *   - isExerciseUnlocked: tier gating
 *   - effortLabel: all boundary values
 *   - getSessionExercises: day look-up
 *
 * No mocks required — all functions are pure.
 */

import {
  generatePlan, adaptSession, isExerciseUnlocked, effortLabel,
  getSessionExercises,
} from '@/lib/routines';
import type { IntakeAnswers, Plan, CompletedSession } from '@/lib/routines';
import { EXERCISE_MAP } from '@/data/exercises';
import { CONDITION_MAP } from '@/data/conditions';

// ---------------------------------------------------------------------------
// Fixtures / helpers
// ---------------------------------------------------------------------------

const baseIntake: IntakeAnswers = {
  conditionId:        'low-back-pain',
  bodyRegions:        ['lowBack'],
  painDuration:       'subacute',
  painIntensity:      2,
  aggravatingFactors: [],
  previousTreatment:  [],
  goals:              ['reduce-pain'],
};

/** Minimal IntakeAnswers for any condition. */
function intakeFor(conditionId: string, overrides: Partial<IntakeAnswers> = {}): IntakeAnswers {
  return {
    conditionId,
    bodyRegions: [],
    painDuration: 'subacute',
    painIntensity: 2,
    aggravatingFactors: [],
    previousTreatment: [],
    goals: [],
    ...overrides,
  };
}

/**
 * Build a session where every log entry has the same painLevel.
 * `tags` is applied to *all* logs.
 */
function makeSession(painLevels: number[], tags: string[][] = []): CompletedSession {
  return {
    logs: painLevels.map((painLevel, i) => ({
      exerciseId:   'pelvic-tilt',
      painLevel,
      feedbackTags: tags[i] ?? [],
    })),
  };
}

/** Session with explicit per-exercise entries (richer than makeSession). */
function makeSessionFor(
  entries: { exerciseId: string; painLevel: number; feedbackTags?: string[] }[],
): CompletedSession {
  return {
    logs: entries.map(({ exerciseId, painLevel, feedbackTags = [] }) => ({
      exerciseId, painLevel, feedbackTags,
    })),
  };
}

/** Advance a plan with the results of adaptSession. */
function advancePlan(plan: Plan, result: ReturnType<typeof adaptSession>): Plan {
  return {
    ...plan,
    userTier:        result.newTier,
    painEMA:         result.painEMA,
    promotionStreak: result.promotionStreak,
    demotionTrigger: result.demotionTrigger,
  };
}

// ---------------------------------------------------------------------------
// generatePlan — low-back-pain (canonical 28-day plan)
// ---------------------------------------------------------------------------

describe('generatePlan', () => {
  it('returns a plan with exercisePool and schedule', () => {
    const plan = generatePlan(baseIntake);
    expect(plan.exercisePool.length).toBeGreaterThan(0);
    expect(plan.schedule.length).toBeGreaterThan(0);
  });

  it('starts at tier 1', () => {
    const plan = generatePlan(baseIntake);
    expect(plan.userTier).toBe(1);
  });

  it('seeds painEMA from intake.painIntensity', () => {
    const plan = generatePlan({ ...baseIntake, painIntensity: 3 });
    expect(plan.painEMA).toBe(3);
  });

  it('sets promotionStreak and demotionTrigger to 0', () => {
    const plan = generatePlan(baseIntake);
    expect(plan.promotionStreak).toBe(0);
    expect(plan.demotionTrigger).toBe(0);
  });

  it('sets conditionId correctly', () => {
    const plan = generatePlan(baseIntake);
    expect(plan.conditionId).toBe('low-back-pain');
  });

  it('generates a 28-day schedule for low-back-pain', () => {
    const plan = generatePlan(baseIntake);
    expect(plan.durationDays).toBe(28);
    expect(plan.schedule.length).toBe(28);
  });

  it('uses the condition routineTemplate title', () => {
    const plan = generatePlan(baseIntake);
    expect(plan.title).toBe(CONDITION_MAP['low-back-pain'].routineTemplate.title);
  });

  it('uses the condition routineTemplate effort', () => {
    const plan = generatePlan(baseIntake);
    expect(plan.effort).toBe('Light');
  });

  it('exercisePool includes all condition exerciseIds', () => {
    const plan      = generatePlan(baseIntake);
    const condExIds = CONDITION_MAP['low-back-pain'].exerciseIds;
    for (const id of condExIds) {
      expect(plan.exercisePool).toContain(id);
    }
  });

  it('schedule day numbers run from 1 to durationDays', () => {
    const plan = generatePlan(baseIntake);
    const days = plan.schedule.map((d) => d.day);
    expect(days).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
  });

  // ── Week-pattern tests ──────────────────────────────────────────────────

  it('schedule has 5 active + 2 rest days per week', () => {
    const plan   = generatePlan(baseIntake);
    const week1  = plan.schedule.slice(0, 7);
    const rest   = week1.filter((d) => d.isRest);
    const active = week1.filter((d) => !d.isRest);
    expect(rest.length).toBe(2);
    expect(active.length).toBe(5);
  });

  it('days 6 and 7 of each week are always rest (positions 6,7,13,14,20,21,27,28)', () => {
    const plan     = generatePlan(baseIntake);
    const restDays = plan.schedule.filter((d) => d.isRest).map((d) => d.day);
    expect(restDays).toEqual([6, 7, 13, 14, 20, 21, 27, 28]);
  });

  it('has exactly 20 active and 8 rest days over 28 days', () => {
    const plan = generatePlan(baseIntake);
    expect(plan.schedule.filter((d) => !d.isRest).length).toBe(20);
    expect(plan.schedule.filter((d) => d.isRest).length).toBe(8);
  });

  it('rest days have no exercises', () => {
    const plan = generatePlan(baseIntake);
    plan.schedule.filter((d) => d.isRest).forEach((d) => {
      expect(d.exercises.length).toBe(0);
    });
  });

  it('active days have exercises', () => {
    const plan = generatePlan(baseIntake);
    plan.schedule.filter((d) => !d.isRest).forEach((d) => {
      expect(d.exercises.length).toBeGreaterThan(0);
    });
  });

  it('only tier-1 exercises appear in the initial schedule', () => {
    const plan = generatePlan(baseIntake);
    plan.schedule.filter((d) => !d.isRest).forEach((d) => {
      d.exercises.forEach((pe) => {
        const ex = EXERCISE_MAP[pe.exerciseId];
        expect(ex).toBeDefined();
        expect(ex.intensityTier).toBe(1);
      });
    });
  });

  it('each active day has exactly exercisesPerSession exercises', () => {
    const plan = generatePlan(baseIntake); // low-back-pain = 6 per session
    plan.schedule.filter((d) => !d.isRest).forEach((d) => {
      expect(d.exercises.length).toBe(6);
    });
  });

  it('plan exercises have reps, sets, hold, rest values', () => {
    const plan = generatePlan(baseIntake);
    const day  = plan.schedule.find((d) => !d.isRest)!;
    day.exercises.forEach((pe) => {
      expect(pe.reps).toBeGreaterThanOrEqual(1);
      expect(pe.sets).toBeGreaterThanOrEqual(1);
      expect(pe.holdSeconds).toBeGreaterThanOrEqual(0);
      expect(pe.restSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Alternative plan configurations ────────────────────────────────────

  it('tech-neck generates a 21-day plan with 15 active + 6 rest days', () => {
    const plan = generatePlan(intakeFor('tech-neck'));
    expect(plan.durationDays).toBe(21);
    expect(plan.schedule.filter((d) => !d.isRest).length).toBe(15);
    expect(plan.schedule.filter((d) => d.isRest).length).toBe(6);
  });

  it('lumbar-disc generates a 42-day plan with 30 active + 12 rest days', () => {
    const plan = generatePlan(intakeFor('lumbar-disc'));
    expect(plan.durationDays).toBe(42);
    expect(plan.schedule.filter((d) => !d.isRest).length).toBe(30);
    expect(plan.schedule.filter((d) => d.isRest).length).toBe(12);
  });

  // ── No condition, body-regions only ────────────────────────────────────

  it('works with no conditionId — pool built from bodyRegions', () => {
    const intake: IntakeAnswers = {
      conditionId: null,
      bodyRegions: ['neck'],
      painDuration: 'chronic',
      painIntensity: 1,
      aggravatingFactors: [],
      previousTreatment: [],
      goals: [],
    };
    const plan = generatePlan(intake);
    expect(plan.conditionId).toBeNull();
    expect(plan.exercisePool.length).toBeGreaterThan(0);
    // Every pooled exercise must target neck
    for (const id of plan.exercisePool) {
      expect(EXERCISE_MAP[id].bodyRegions).toContain('neck');
    }
  });

  it('chin-tuck appears in pool when bodyRegions includes neck', () => {
    const plan = generatePlan({ ...baseIntake, conditionId: null, bodyRegions: ['neck'] });
    expect(plan.exercisePool).toContain('chin-tuck');
  });

  it('uses fallback title and defaults when no condition template', () => {
    const plan = generatePlan({ ...baseIntake, conditionId: null, bodyRegions: ['neck'] });
    expect(plan.title).toBe('Your personalised plan');
    expect(plan.effort).toBe('Light');
    expect(plan.durationDays).toBe(28);
  });

  // ── Empty intake → fallback to all tier-1 exercises ────────────────────

  it('falls back to all tier-1 exercises when pool would be empty', () => {
    const plan = generatePlan({ ...baseIntake, conditionId: null, bodyRegions: [] });
    expect(plan.exercisePool.length).toBeGreaterThan(0);
    for (const id of plan.exercisePool) {
      expect(EXERCISE_MAP[id].intensityTier).toBe(1);
    }
  });

  it('empty-intake fallback still generates a valid 28-day schedule', () => {
    const plan = generatePlan({ ...baseIntake, conditionId: null, bodyRegions: [] });
    expect(plan.schedule.length).toBe(28);
    plan.schedule.filter((d) => !d.isRest).forEach((d) => {
      expect(d.exercises.length).toBeGreaterThan(0);
    });
  });

  // ── Deterministic rotation ──────────────────────────────────────────────

  it('exercise rotation is deterministic — same plan generates identical schedules', () => {
    const plan1 = generatePlan(baseIntake);
    const plan2 = generatePlan(baseIntake);
    const ids1  = plan1.schedule.find((d) => !d.isRest)!.exercises.map((e) => e.exerciseId);
    const ids2  = plan2.schedule.find((d) => !d.isRest)!.exercises.map((e) => e.exerciseId);
    expect(ids1).toEqual(ids2);
  });

  it('consecutive active days have different exercise orderings (rotation advances)', () => {
    const plan = generatePlan(baseIntake);
    const activeDays = plan.schedule.filter((d) => !d.isRest);
    const day1Ids = activeDays[0].exercises.map((e) => e.exerciseId);
    const day2Ids = activeDays[1].exercises.map((e) => e.exerciseId);
    // Pool has more than 1 exercise so rotation shifts the order
    expect(day1Ids).not.toEqual(day2Ids);
  });

  it('first active day (activeDay=0) starts at pool index 0', () => {
    const plan = generatePlan(intakeFor('low-back-pain'));
    const tier1Pool = plan.exercisePool
      .map((id) => EXERCISE_MAP[id])
      .filter((ex) => ex && ex.intensityTier <= 1);
    const day1 = getSessionExercises(plan, 1);
    expect(day1.length).toBeGreaterThan(0);
    if (tier1Pool.length > 0) {
      expect(day1[0].exerciseId).toBe(tier1Pool[0].id);
    }
  });
});

// ---------------------------------------------------------------------------
// Schedule week-pattern invariants (parameterised)
// ---------------------------------------------------------------------------

describe('Schedule week pattern — 5 active + 2 rest per week', () => {
  const cases: [string, number][] = [
    ['low-back-pain', 28],
    ['lumbar-disc', 42],
    ['tech-neck', 21],
  ];

  test.each(cases)('%s (%d days): correct split every week', (condId, days) => {
    const plan = generatePlan(intakeFor(condId));
    for (let week = 0; week < days / 7; week++) {
      const slice  = plan.schedule.slice(week * 7, week * 7 + 7);
      const active = slice.filter((d) => !d.isRest);
      const rest   = slice.filter((d) => d.isRest);
      expect(active.length).toBe(5);
      expect(rest.length).toBe(2);
      expect(slice[5].isRest).toBe(true);
      expect(slice[6].isRest).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// adaptSession — EMA calculation
// ---------------------------------------------------------------------------

describe('adaptSession — EMA', () => {
  it('updates painEMA correctly: 0.4 * score + 0.6 * previousEMA', () => {
    const plan = generatePlan(baseIntake); // painEMA = 2
    const result = adaptSession(plan, makeSession([1, 1, 1])); // mean = 1
    // EMA = 0.4 * 1 + 0.6 * 2 = 1.6
    expect(result.painEMA).toBeCloseTo(1.6, 5);
  });

  it('EMA converges toward repeated score', () => {
    let plan = generatePlan({ ...baseIntake, painIntensity: 4 });
    for (let i = 0; i < 20; i++) {
      const result = adaptSession(plan, makeSession([0]));
      plan = advancePlan(plan, result);
    }
    expect(plan.painEMA).toBeLessThan(0.5);
  });

  it('EMA accuracy across three sequential sessions (starting EMA=3.0)', () => {
    let plan = generatePlan({ ...baseIntake, painIntensity: 3.0 });
    const scores = [2.0, 1.5, 0.5];
    let expectedEMA = 3.0;
    for (const score of scores) {
      const result = adaptSession(plan, makeSession([score]));
      expectedEMA = 0.4 * score + 0.6 * expectedEMA;
      expect(result.painEMA).toBeCloseTo(expectedEMA, 5);
      plan = advancePlan(plan, result);
    }
  });

  it('EMA uses raw score, not effectiveScore (Felt good does not alter EMA)', () => {
    // Felt good reduces effectiveScore by 0.5 for promotion, but EMA uses raw score
    const plan = generatePlan({ ...baseIntake, painIntensity: 2.0 });
    const session = makeSessionFor([
      { exerciseId: 'pelvic-tilt', painLevel: 2.2, feedbackTags: ['Felt good'] },
    ]);
    const result = adaptSession(plan, session);
    // EMA = 0.4 * 2.2 + 0.6 * 2.0 = 0.88 + 1.20 = 2.08
    expect(result.painEMA).toBeCloseTo(2.08, 5);
  });
});

// ---------------------------------------------------------------------------
// adaptSession — tier promotion streak
// ---------------------------------------------------------------------------

describe('adaptSession — tier promotion', () => {
  it('increments promotionStreak when score <= tier-1 threshold (2.0)', () => {
    const plan   = generatePlan(baseIntake);
    const result = adaptSession(plan, makeSession([1.5, 2.0])); // mean = 1.75 ≤ 2.0
    expect(result.promotionStreak).toBe(1);
    expect(result.demotionTrigger).toBe(0);
  });

  it('does NOT increment promotionStreak when effectiveScore > threshold', () => {
    const plan   = generatePlan(baseIntake);
    const result = adaptSession(plan, makeSession([2.5, 2.5])); // mean = 2.5 > 2.0
    expect(result.promotionStreak).toBe(0);
  });

  it('resets promotionStreak to 0 in neutral band (score > threshold, score < 3.0)', () => {
    let plan = generatePlan({ ...baseIntake, painIntensity: 1 });
    // Build streak of 1
    let result = adaptSession(plan, makeSession([1]));
    plan = advancePlan(plan, result);
    expect(plan.promotionStreak).toBe(1);
    // Neutral score (2.5: above threshold 2.0, below 3.0)
    result = adaptSession(plan, makeSession([2.5]));
    expect(result.promotionStreak).toBe(0);
    expect(result.demotionTrigger).toBe(0);
  });

  it('promotes tier 1 → 2 after promotionStreak >= 2 AND painEMA <= 2.0', () => {
    let plan   = generatePlan({ ...baseIntake, painIntensity: 1 });
    // Session 1: score=1 → streak=1, EMA=0.4*1+0.6*1=1.0 ≤ 2.0 → tier stays 1
    let result = adaptSession(plan, makeSession([1]));
    plan = advancePlan(plan, result);
    expect(plan.userTier).toBe(1);
    expect(plan.promotionStreak).toBe(1);

    // Session 2: score=1 → streak=2, EMA ≤ 2.0 → promote to tier 2
    result = adaptSession(plan, makeSession([1]));
    expect(result.newTier).toBe(2);
    expect(result.promoted).toBe(true);
    expect(result.demoted).toBe(false);
  });

  it('does NOT promote when streak >= 2 but painEMA > 2.0', () => {
    // Craft a plan with high EMA that won't drop below 2.0 even after a good session
    let plan: Plan = {
      ...generatePlan({ ...baseIntake, painIntensity: 3.0 }),
      painEMA:         2.5,
      promotionStreak: 1,
      demotionTrigger: 0,
      userTier:        1,
    };
    // score=2.0: effectiveScore=2.0 ≤ 2.0 → streak becomes 2
    // but EMA = 0.4*2.0 + 0.6*2.5 = 0.8+1.5 = 2.3 > 2.0 → no promotion
    const result = adaptSession(plan, makeSession([2.0]));
    expect(result.painEMA).toBeCloseTo(2.3, 5);
    expect(result.promotionStreak).toBe(2);
    expect(result.newTier).toBe(1); // EMA still above 2.0
    expect(result.promoted).toBe(false);
  });

  it('promotes tier 2 → 3 after promotionStreak >= 3 AND painEMA <= 1.0', () => {
    let plan = generatePlan({ ...baseIntake, painIntensity: 0 });
    plan = { ...plan, userTier: 2, painEMA: 0.5, promotionStreak: 0, demotionTrigger: 0 };

    // Three sessions with score=0 (≤ tier-2 threshold of 1.0)
    let result = adaptSession(plan, makeSession([0]));
    plan = advancePlan(plan, result);
    result = adaptSession(plan, makeSession([0]));
    plan = advancePlan(plan, result);
    result = adaptSession(plan, makeSession([0]));

    expect(result.newTier).toBe(3);
    expect(result.promoted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// adaptSession — tier demotion
// ---------------------------------------------------------------------------

describe('adaptSession — tier demotion', () => {
  it('increments demotionTrigger when score >= 3.0', () => {
    const plan   = generatePlan(baseIntake);
    const result = adaptSession(plan, makeSession([3.5]));
    expect(result.demotionTrigger).toBe(1);
    expect(result.promotionStreak).toBe(0);
  });

  it('demotes tier 2 → 1 when demotionTrigger reaches 2', () => {
    let plan: Plan = {
      ...generatePlan(baseIntake),
      userTier:        2,
      painEMA:         2,
      promotionStreak: 0,
      demotionTrigger: 0,
    };

    let result = adaptSession(plan, makeSession([3.5]));
    plan = advancePlan(plan, result);
    expect(plan.userTier).toBe(2); // dt=1, not yet demoted

    result = adaptSession(plan, makeSession([3.5]));
    expect(result.newTier).toBe(1); // dt=2 → demote
    expect(result.demoted).toBe(true);
    expect(result.promoted).toBe(false);
  });

  it('demotes tier 3 → 2 when demotionTrigger reaches 2', () => {
    let plan: Plan = {
      ...generatePlan(baseIntake),
      userTier:        3,
      painEMA:         1,
      promotionStreak: 0,
      demotionTrigger: 0,
    };

    let result = adaptSession(plan, makeSession([3.5]));
    plan = advancePlan(plan, result);

    result = adaptSession(plan, makeSession([3.5]));
    expect(result.newTier).toBe(2);
    expect(result.demoted).toBe(true);
  });

  it('resets demotionTrigger to 0 when score falls within promotion range', () => {
    const plan: Plan = {
      ...generatePlan(baseIntake),
      userTier:        2,
      promotionStreak: 0,
      demotionTrigger: 1,
    };
    // score=0.8 ≤ tier-2 threshold (1.0) → promotion streak path → dt reset
    const result = adaptSession(plan, makeSession([0.8]));
    expect(result.demotionTrigger).toBe(0);
    expect(result.promotionStreak).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// adaptSession — parameter adjustments (nextExercises)
// ---------------------------------------------------------------------------

describe('adaptSession — parameter adjustments', () => {
  it('high pain (≥3.5) reduces reps, reduces sets, increases rest', () => {
    const plan: Plan = { ...generatePlan(baseIntake), exercisePool: ['pelvic-tilt'] };
    // pelvic-tilt: defaultReps=10, defaultSets=2, defaultRestSeconds=20
    const result = adaptSession(plan, makeSession([4, 4]));
    const pe = result.nextExercises.find((e) => e.exerciseId === 'pelvic-tilt')!;
    expect(pe).toBeDefined();
    expect(pe.reps).toBe(8);       // round(10 * 0.8)
    expect(pe.sets).toBe(1);       // max(1, 2 - 1)
    expect(pe.restSeconds).toBe(30); // max(10, round(20 * 1.5))
  });

  it('score in 2.5–3.4 reduces reps ~10% and increases rest ~30%', () => {
    const plan: Plan = { ...generatePlan(baseIntake), exercisePool: ['pelvic-tilt'] };
    const result = adaptSession(plan, makeSession([3.0]));
    const pe = result.nextExercises.find((e) => e.exerciseId === 'pelvic-tilt')!;
    expect(pe.reps).toBe(9);       // round(10 * 0.9)
    expect(pe.restSeconds).toBe(26); // max(10, round(20 * 1.3))
  });

  it('score in 0.5–1.4 increases reps ~10% and reduces rest ~10%', () => {
    const plan: Plan = { ...generatePlan(baseIntake), exercisePool: ['pelvic-tilt'] };
    const result = adaptSession(plan, makeSession([1.0]));
    const pe = result.nextExercises.find((e) => e.exerciseId === 'pelvic-tilt')!;
    expect(pe.reps).toBe(11);      // round(10 * 1.1)
    expect(pe.restSeconds).toBe(18); // max(10, round(20 * 0.9))
  });

  it('score < 0.5 increases reps ~10%, adds a set, reduces rest ~20%', () => {
    const plan: Plan = { ...generatePlan(baseIntake), exercisePool: ['pelvic-tilt'] };
    const result = adaptSession(plan, makeSession([0.3]));
    const pe = result.nextExercises.find((e) => e.exerciseId === 'pelvic-tilt')!;
    expect(pe.reps).toBe(11);      // round(10 * 1.1)
    expect(pe.sets).toBe(3);       // max(1, 2 + 1)
    expect(pe.restSeconds).toBe(16); // max(10, round(20 * 0.8))
  });

  it('low pain (<0.5) produces reps >= default across all exercises', () => {
    const plan   = generatePlan({ ...baseIntake, painIntensity: 0 });
    const result = adaptSession(plan, makeSession([0, 0]));
    result.nextExercises.forEach((pe) => {
      const base = EXERCISE_MAP[pe.exerciseId];
      if (!base) return;
      expect(pe.reps).toBeGreaterThanOrEqual(base.defaultReps);
    });
  });

  it('reps are capped at 2× the exercise defaultReps', () => {
    let currentPlan = { ...generatePlan({ ...baseIntake, painIntensity: 0 }), painEMA: 0 };
    for (let i = 0; i < 5; i++) {
      const result = adaptSession(currentPlan, makeSession([0]));
      currentPlan  = advancePlan(currentPlan, result);
      result.nextExercises.forEach((pe) => {
        const base = EXERCISE_MAP[pe.exerciseId];
        if (!base) return;
        expect(pe.reps).toBeLessThanOrEqual(base.defaultReps * 2);
      });
    }
  });

  it('sets never drops below 1 regardless of setsDelta', () => {
    // cat-cow defaultSets=1; score≥3.5 → setsDelta=-1 → max(1,0)=1
    const plan: Plan = { ...generatePlan(baseIntake), exercisePool: ['cat-cow'] };
    const result = adaptSession(plan, makeSession([3.5]));
    result.nextExercises.forEach((pe) => expect(pe.sets).toBeGreaterThanOrEqual(1));
  });

  it('restSeconds floor is 10 regardless of restFactor', () => {
    let currentPlan = { ...generatePlan({ ...baseIntake, painIntensity: 0 }), painEMA: 0 };
    for (let i = 0; i < 5; i++) {
      const result = adaptSession(currentPlan, makeSession([0]));
      currentPlan  = advancePlan(currentPlan, result);
      result.nextExercises.forEach((pe) => expect(pe.restSeconds).toBeGreaterThanOrEqual(10));
    }
  });

  it('holdSeconds never drops below 0', () => {
    const plan   = generatePlan(baseIntake);
    const result = adaptSession(plan, makeSession([3.5]));
    result.nextExercises.forEach((pe) => expect(pe.holdSeconds).toBeGreaterThanOrEqual(0));
  });

  it('neutral score band (1.5–2.4) leaves parameters at default', () => {
    const plan: Plan = { ...generatePlan(baseIntake), exercisePool: ['pelvic-tilt'] };
    const result = adaptSession(plan, makeSession([2.0]));
    const pe = result.nextExercises.find((e) => e.exerciseId === 'pelvic-tilt')!;
    const base = EXERCISE_MAP['pelvic-tilt'];
    expect(pe.reps).toBe(base.defaultReps);
    expect(pe.sets).toBe(base.defaultSets);
    expect(pe.restSeconds).toBe(base.defaultRestSeconds);
  });
});

// ---------------------------------------------------------------------------
// adaptSession — parameter notes
// ---------------------------------------------------------------------------

describe('adaptSession — parameterNote', () => {
  const plan = generatePlan(baseIntake);

  it('provides a note for score >= 3.5 (scale back)', () => {
    const r = adaptSession(plan, makeSession([3.5]));
    expect(r.parameterNote).toBeDefined();
    expect((r.parameterNote ?? '').length).toBeGreaterThan(0);
  });

  it('provides a note for score in 2.5–3.4 (ease off)', () => {
    const r = adaptSession(plan, makeSession([3.0]));
    expect(r.parameterNote).toBeDefined();
  });

  it('provides a note for score in 0.5–1.4 (gently building)', () => {
    const r = adaptSession(plan, makeSession([1.0]));
    expect(r.parameterNote).toBeDefined();
  });

  it('provides a note for score < 0.5 (excellent session)', () => {
    const r = adaptSession(plan, makeSession([0.3]));
    expect(r.parameterNote).toBeDefined();
  });

  it('parameterNote is undefined for score in neutral 1.5–2.4 band', () => {
    const r = adaptSession(plan, makeSession([2.0]));
    expect(r.parameterNote).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// adaptSession — "Tightness" tag
// ---------------------------------------------------------------------------

describe('adaptSession — Tightness tag', () => {
  it('increases holdSeconds by 5', () => {
    const plan: Plan = { ...generatePlan(baseIntake), exercisePool: ['pelvic-tilt'] };
    // pelvic-tilt defaultHoldSeconds=5; score=1.0 → repsFactor=1.1, holdDelta=5
    const session = makeSessionFor([
      { exerciseId: 'pelvic-tilt', painLevel: 1.0, feedbackTags: ['Tightness'] },
    ]);
    const result = adaptSession(plan, session);
    const pe = result.nextExercises.find((e) => e.exerciseId === 'pelvic-tilt')!;
    expect(pe).toBeDefined();
    expect(pe.holdSeconds).toBe(10); // max(0, 5 + 5)
  });

  it('increases holdSeconds on top of an already-zero default (cat-cow)', () => {
    const plan: Plan = { ...generatePlan(baseIntake), exercisePool: ['cat-cow'] };
    const session = makeSessionFor([
      { exerciseId: 'cat-cow', painLevel: 1.0, feedbackTags: ['Tightness'] },
    ]);
    const result = adaptSession(plan, session);
    const pe = result.nextExercises.find((e) => e.exerciseId === 'cat-cow')!;
    expect(pe).toBeDefined();
    expect(pe.holdSeconds).toBe(5); // max(0, 0 + 5)
  });

  it('hold time is >= base hold when Tightness is present', () => {
    const plan   = generatePlan(baseIntake);
    const session: CompletedSession = {
      logs: [{ exerciseId: 'pelvic-tilt', painLevel: 1, feedbackTags: ['Tightness'] }],
    };
    const result = adaptSession(plan, session);
    result.nextExercises.forEach((pe) => {
      const base = EXERCISE_MAP[pe.exerciseId];
      if (!base) return;
      expect(pe.holdSeconds).toBeGreaterThanOrEqual(base.defaultHoldSeconds);
    });
  });
});

// ---------------------------------------------------------------------------
// adaptSession — "Easy" tag
// ---------------------------------------------------------------------------

describe('adaptSession — Easy tag', () => {
  it('increases reps compared to no tag (score=1.0 band)', () => {
    const pool: Plan = { ...generatePlan(baseIntake), exercisePool: ['pelvic-tilt'] };
    // Without Easy: repsFactor=1.1 → reps=11
    const without = adaptSession(pool, makeSession([1.0]));
    // With Easy:    repsFactor=1.2 → reps=12
    const with_   = adaptSession(pool, makeSessionFor([
      { exerciseId: 'pelvic-tilt', painLevel: 1.0, feedbackTags: ['Easy'] },
    ]));
    const repsWithout = without.nextExercises.find((e) => e.exerciseId === 'pelvic-tilt')!.reps;
    const repsWith    = with_.nextExercises.find((e) => e.exerciseId === 'pelvic-tilt')!.reps;
    expect(repsWith).toBeGreaterThan(repsWithout);
    expect(repsWithout).toBe(11);
    expect(repsWith).toBe(12);
  });

  it('reps remain capped at 2× defaultReps even with Easy tag', () => {
    const plan: Plan = { ...generatePlan(baseIntake), exercisePool: ['pelvic-tilt'] };
    const session = makeSessionFor([
      { exerciseId: 'pelvic-tilt', painLevel: 0.3, feedbackTags: ['Easy'] },
    ]);
    const result = adaptSession(plan, session);
    const pe = result.nextExercises.find((e) => e.exerciseId === 'pelvic-tilt')!;
    expect(pe.reps).toBeLessThanOrEqual(EXERCISE_MAP['pelvic-tilt'].defaultReps * 2);
  });
});

// ---------------------------------------------------------------------------
// adaptSession — "Felt good" tag
// ---------------------------------------------------------------------------

describe('adaptSession — Felt good tag', () => {
  it('grants a promotion streak when effective score (raw - 0.5) drops below threshold', () => {
    // score=2.3 on tier-1: without tag → effectiveScore=2.3 > 2.0 → no streak
    const plan = generatePlan({ ...baseIntake, painIntensity: 1 });
    const without = adaptSession(plan, makeSession([2.3]));
    expect(without.promotionStreak).toBe(0);

    // With "Felt good": effectiveScore=1.8 ≤ 2.0 → streak++
    const session: CompletedSession = {
      logs: [
        { exerciseId: 'pelvic-tilt', painLevel: 2, feedbackTags: ['Felt good'] },
        { exerciseId: 'cat-cow',     painLevel: 2, feedbackTags: [] },
      ],
    };
    // mean=2.0, felt-good → effectiveScore=1.5 ≤ 2.0 → streak=1
    const withTag = adaptSession(plan, session);
    expect(withTag.promotionStreak).toBe(1);
  });

  it('does not help when effectiveScore is still above threshold (score=2.6)', () => {
    // effectiveScore = 2.6 - 0.5 = 2.1 > 2.0 tier-1 threshold → no streak
    const plan    = generatePlan({ ...baseIntake, painIntensity: 2.0 });
    const session = makeSessionFor([
      { exerciseId: 'pelvic-tilt', painLevel: 2.6, feedbackTags: ['Felt good'] },
    ]);
    const result = adaptSession(plan, session);
    expect(result.promotionStreak).toBe(0);
  });

  it('EMA uses raw score, not effectiveScore (e.g., raw=2.0 → EMA includes 2.0)', () => {
    const plan    = generatePlan({ ...baseIntake, painIntensity: 2.0 });
    const session = makeSessionFor([
      { exerciseId: 'pelvic-tilt', painLevel: 2.0, feedbackTags: ['Felt good'] },
    ]);
    const result = adaptSession(plan, session);
    // EMA = 0.4 * 2.0 + 0.6 * 2.0 = 2.0  (not 0.4*1.5 + 0.6*2.0)
    expect(result.painEMA).toBeCloseTo(2.0, 5);
  });
});

// ---------------------------------------------------------------------------
// adaptSession — "Pinched" tag excludes exercise from nextExercises
// ---------------------------------------------------------------------------

describe('adaptSession — Pinched tag', () => {
  it('pinched exercise does not appear in nextExercises', () => {
    const plan: Plan = {
      ...generatePlan(baseIntake),
      exercisePool: ['pelvic-tilt', 'cat-cow', 'childs-pose',
                     'knee-to-chest', 'standing-breath', 'hip-flexor-stretch'],
    };
    const session = makeSessionFor([
      { exerciseId: 'pelvic-tilt', painLevel: 1.0, feedbackTags: ['Pinched'] },
      { exerciseId: 'cat-cow',     painLevel: 1.0, feedbackTags: [] },
    ]);
    const result  = adaptSession(plan, session);
    const nextIds = result.nextExercises.map((e) => e.exerciseId);
    expect(nextIds).not.toContain('pelvic-tilt');
  });

  it('non-pinched exercises remain eligible for nextExercises', () => {
    const plan: Plan = {
      ...generatePlan(baseIntake),
      exercisePool: ['pelvic-tilt', 'cat-cow', 'childs-pose',
                     'knee-to-chest', 'standing-breath', 'hip-flexor-stretch'],
    };
    const session = makeSessionFor([
      { exerciseId: 'pelvic-tilt', painLevel: 1.0, feedbackTags: ['Pinched'] },
    ]);
    const result = adaptSession(plan, session);
    expect(result.nextExercises.length).toBeGreaterThan(0);
  });

  it('multiple pinched exercises are all excluded', () => {
    const plan: Plan = {
      ...generatePlan(baseIntake),
      exercisePool: ['pelvic-tilt', 'cat-cow', 'childs-pose',
                     'knee-to-chest', 'standing-breath', 'hip-flexor-stretch'],
    };
    const session = makeSessionFor([
      { exerciseId: 'pelvic-tilt', painLevel: 1.0, feedbackTags: ['Pinched'] },
      { exerciseId: 'cat-cow',     painLevel: 1.0, feedbackTags: ['Pinched'] },
    ]);
    const result  = adaptSession(plan, session);
    const nextIds = result.nextExercises.map((e) => e.exerciseId);
    expect(nextIds).not.toContain('pelvic-tilt');
    expect(nextIds).not.toContain('cat-cow');
  });

  it('full pool is used when nothing is pinched', () => {
    const plan: Plan = {
      ...generatePlan(baseIntake),
      exercisePool: ['pelvic-tilt', 'cat-cow', 'childs-pose'],
    };
    const session = makeSessionFor([
      { exerciseId: 'pelvic-tilt', painLevel: 1.0, feedbackTags: [] },
    ]);
    const result = adaptSession(plan, session);
    expect(result.nextExercises.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// adaptSession — next exercises (tier-awareness)
// ---------------------------------------------------------------------------

describe('adaptSession — next exercises', () => {
  it('count matches condition exercisesPerSession (up to pool size)', () => {
    const plan   = generatePlan(baseIntake); // 6 per session
    const result = adaptSession(plan, makeSession([1]));
    expect(result.nextExercises.length).toBeGreaterThan(0);
    expect(result.nextExercises.length).toBeLessThanOrEqual(6);
  });

  it('only returns tier-appropriate exercises after promotion to tier 2', () => {
    let plan: Plan = {
      ...generatePlan({ ...baseIntake, painIntensity: 0 }),
      userTier:        2,
      painEMA:         1.5,
      promotionStreak: 0,
      demotionTrigger: 0,
    };
    const result = adaptSession(plan, makeSession([1]));
    result.nextExercises.forEach((pe) => {
      const ex = EXERCISE_MAP[pe.exerciseId];
      if (!ex) return;
      expect(ex.intensityTier).toBeLessThanOrEqual(2);
    });
  });

  it('empty session (no logs) produces valid nextExercises', () => {
    const plan = generatePlan(baseIntake);
    const result = adaptSession(plan, { logs: [] });
    // score=0 < 0.5 → repsFactor=1.1, setsDelta=+1, restFactor=0.8
    expect(result.nextExercises).toBeDefined();
    expect(Array.isArray(result.nextExercises)).toBe(true);
    // EMA = 0.4*0 + 0.6*2 = 1.2
    expect(result.painEMA).toBeCloseTo(1.2, 5);
  });
});

// ---------------------------------------------------------------------------
// isExerciseUnlocked
// ---------------------------------------------------------------------------

describe('isExerciseUnlocked', () => {
  it('tier-1 exercise (pelvic-tilt) is unlocked at tier 1', () => {
    expect(isExerciseUnlocked('pelvic-tilt', 1)).toBe(true);
  });

  it('tier-1 exercise (pelvic-tilt) is unlocked at tier 2', () => {
    expect(isExerciseUnlocked('pelvic-tilt', 2)).toBe(true);
  });

  it('tier-1 exercise (pelvic-tilt) is unlocked at tier 3', () => {
    expect(isExerciseUnlocked('pelvic-tilt', 3)).toBe(true);
  });

  it('tier-2 exercise (glute-bridge) is locked at tier 1', () => {
    expect(isExerciseUnlocked('glute-bridge', 1)).toBe(false);
  });

  it('tier-2 exercise (glute-bridge) is unlocked at tier 2', () => {
    expect(isExerciseUnlocked('glute-bridge', 2)).toBe(true);
  });

  it('tier-2 exercise (glute-bridge) is unlocked at tier 3', () => {
    expect(isExerciseUnlocked('glute-bridge', 3)).toBe(true);
  });

  it('tier-3 exercise (eccentric-calf-raise) is locked at tier 1', () => {
    expect(isExerciseUnlocked('eccentric-calf-raise', 1)).toBe(false);
  });

  it('tier-3 exercise (eccentric-calf-raise) is locked at tier 2', () => {
    expect(isExerciseUnlocked('eccentric-calf-raise', 2)).toBe(false);
  });

  it('tier-3 exercise (eccentric-calf-raise) is unlocked at tier 3', () => {
    expect(isExerciseUnlocked('eccentric-calf-raise', 3)).toBe(true);
  });

  it('returns false for unknown exercise ID at any tier', () => {
    expect(isExerciseUnlocked('does-not-exist', 1)).toBe(false);
    expect(isExerciseUnlocked('does-not-exist', 3)).toBe(false);
  });

  // Additional tier-specific exercises
  it('bird-dog (tier 3) is locked at tier 1 and 2, unlocked at tier 3', () => {
    expect(isExerciseUnlocked('bird-dog', 1)).toBe(false);
    expect(isExerciseUnlocked('bird-dog', 2)).toBe(false);
    expect(isExerciseUnlocked('bird-dog', 3)).toBe(true);
  });

  it('dead-bug (tier 3) is locked below tier 3', () => {
    expect(isExerciseUnlocked('dead-bug', 1)).toBe(false);
    expect(isExerciseUnlocked('dead-bug', 2)).toBe(false);
    expect(isExerciseUnlocked('dead-bug', 3)).toBe(true);
  });

  it('chin-tuck (tier 1) is always accessible', () => {
    expect(isExerciseUnlocked('chin-tuck', 1)).toBe(true);
    expect(isExerciseUnlocked('chin-tuck', 2)).toBe(true);
    expect(isExerciseUnlocked('chin-tuck', 3)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// effortLabel
// ---------------------------------------------------------------------------

describe('effortLabel', () => {
  it('returns "Light" for painEMA >= 3', () => {
    expect(effortLabel(3)).toBe('Light');
    expect(effortLabel(4)).toBe('Light');
  });

  it('returns "Moderate" for 1.5 <= painEMA < 3', () => {
    expect(effortLabel(1.5)).toBe('Moderate');
    expect(effortLabel(2.9)).toBe('Moderate');
  });

  it('returns "Vigorous" for painEMA < 1.5', () => {
    expect(effortLabel(0)).toBe('Vigorous');
    expect(effortLabel(1.4)).toBe('Vigorous');
  });

  it('boundary 3.0 is "Light" (inclusive)', () => {
    expect(effortLabel(3.0)).toBe('Light');
  });

  it('just below 3.0 is "Moderate"', () => {
    expect(effortLabel(2.999)).toBe('Moderate');
  });

  it('boundary 1.5 is "Moderate" (inclusive)', () => {
    expect(effortLabel(1.5)).toBe('Moderate');
  });

  it('just below 1.5 is "Vigorous"', () => {
    expect(effortLabel(1.499)).toBe('Vigorous');
  });
});

// ---------------------------------------------------------------------------
// getSessionExercises
// ---------------------------------------------------------------------------

describe('getSessionExercises', () => {
  it('returns exercises for a valid active day', () => {
    const plan          = generatePlan(baseIntake);
    const firstActive   = plan.schedule.find((d) => !d.isRest)!;
    const exs           = getSessionExercises(plan, firstActive.day);
    expect(exs.length).toBeGreaterThan(0);
  });

  it('returns the same array as stored on that DaySchedule', () => {
    const plan  = generatePlan(baseIntake);
    const day1  = plan.schedule.find((d) => !d.isRest)!;
    const exs   = getSessionExercises(plan, day1.day);
    expect(exs).toEqual(day1.exercises);
  });

  it('returns an empty array for a rest day', () => {
    const plan = generatePlan(baseIntake);
    const rest = plan.schedule.find((d) => d.isRest)!;
    expect(getSessionExercises(plan, rest.day)).toEqual([]);
  });

  it('returns an empty array for a day beyond the plan duration', () => {
    const plan = generatePlan(baseIntake);
    expect(getSessionExercises(plan, 999)).toEqual([]);
  });

  it('returns an empty array for day 0 (1-based numbering)', () => {
    const plan = generatePlan(baseIntake);
    expect(getSessionExercises(plan, 0)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// generatePlan — plan-level exclusions
// ---------------------------------------------------------------------------

describe('generatePlan — excludedExerciseIds', () => {
  it('starts with no exclusions', () => {
    expect(generatePlan(baseIntake).excludedExerciseIds).toEqual([]);
  });

  it('builds every day at the plan starting tier', () => {
    const plan = generatePlan(baseIntake);
    plan.schedule.filter((d) => !d.isRest).forEach((d) => {
      d.exercises.forEach((pe) => {
        expect(EXERCISE_MAP[pe.exerciseId].intensityTier).toBeLessThanOrEqual(plan.userTier);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// adaptSession — rotation by completed active days
// ---------------------------------------------------------------------------

describe('adaptSession — rotation offset', () => {
  /** A pool of eight tier-1 exercises, big enough to rotate through. */
  const bigPool = [
    'pelvic-tilt', 'cat-cow', 'childs-pose', 'knee-to-chest',
    'hip-flexor-stretch', 'chin-tuck', 'neck-side-stretch', 'wrist-flexor-stretch',
  ];

  function poolPlan(): Plan {
    return { ...generatePlan(baseIntake), exercisePool: bigPool };
  }

  it('different completedActiveDays values produce different sessions', () => {
    const plan = poolPlan();
    const first  = adaptSession(plan, makeSession([2.0]), 1).nextExercises.map((e) => e.exerciseId);
    const second = adaptSession(plan, makeSession([2.0]), 2).nextExercises.map((e) => e.exerciseId);
    expect(first).not.toEqual(second);
  });

  it('the same completedActiveDays value is deterministic', () => {
    const plan = poolPlan();
    const a = adaptSession(plan, makeSession([2.0]), 3).nextExercises.map((e) => e.exerciseId);
    const b = adaptSession(plan, makeSession([2.0]), 3).nextExercises.map((e) => e.exerciseId);
    expect(a).toEqual(b);
  });

  it('does not simply repeat the session that was just completed', () => {
    const plan = poolPlan();
    const justDone = ['pelvic-tilt', 'cat-cow'];
    const session = makeSessionFor(
      justDone.map((exerciseId) => ({ exerciseId, painLevel: 2.0 })),
    );
    // Six per session out of eight, minus the two just done, still fills a day.
    const nextIds = adaptSession(plan, session, 1).nextExercises.map((e) => e.exerciseId);
    justDone.forEach((id) => expect(nextIds).not.toContain(id));
  });

  it('falls back to the whole pool when avoiding recent exercises would starve it', () => {
    const plan: Plan = { ...generatePlan(baseIntake), exercisePool: ['pelvic-tilt'] };
    const session = makeSessionFor([{ exerciseId: 'pelvic-tilt', painLevel: 2.0 }]);
    const result  = adaptSession(plan, session, 1);
    expect(result.nextExercises.length).toBeGreaterThan(0);
    expect(result.nextExercises[0].exerciseId).toBe('pelvic-tilt');
  });

  it('defaults completedActiveDays to 0 when the caller omits it', () => {
    const plan = poolPlan();
    const withDefault = adaptSession(plan, makeSession([2.0])).nextExercises.map((e) => e.exerciseId);
    const withZero    = adaptSession(plan, makeSession([2.0]), 0).nextExercises.map((e) => e.exerciseId);
    expect(withDefault).toEqual(withZero);
  });
});

// ---------------------------------------------------------------------------
// adaptSession — persistent "Pinched" exclusions
// ---------------------------------------------------------------------------

describe('adaptSession — excludedExerciseIds', () => {
  const pool = [
    'pelvic-tilt', 'cat-cow', 'childs-pose', 'knee-to-chest',
    'hip-flexor-stretch', 'chin-tuck', 'neck-side-stretch', 'wrist-flexor-stretch',
  ];

  it('reports a newly pinched exercise as excluded', () => {
    const plan: Plan = { ...generatePlan(baseIntake), exercisePool: pool };
    const result = adaptSession(plan, makeSessionFor([
      { exerciseId: 'pelvic-tilt', painLevel: 2.0, feedbackTags: ['Pinched'] },
    ]));
    expect(result.excludedExerciseIds).toContain('pelvic-tilt');
  });

  it('carries the plan exclusions forward even when nothing new is pinched', () => {
    const plan: Plan = {
      ...generatePlan(baseIntake),
      exercisePool: pool,
      excludedExerciseIds: ['cat-cow'],
    };
    const result = adaptSession(plan, makeSession([2.0]));
    expect(result.excludedExerciseIds).toContain('cat-cow');
  });

  it('does not duplicate an exercise that is pinched twice', () => {
    const plan: Plan = {
      ...generatePlan(baseIntake),
      exercisePool: pool,
      excludedExerciseIds: ['pelvic-tilt'],
    };
    const result = adaptSession(plan, makeSessionFor([
      { exerciseId: 'pelvic-tilt', painLevel: 2.0, feedbackTags: ['Pinched'] },
    ]));
    expect(result.excludedExerciseIds.filter((id) => id === 'pelvic-tilt')).toHaveLength(1);
  });

  it('honours plan exclusions when picking the next session', () => {
    const plan: Plan = {
      ...generatePlan(baseIntake),
      exercisePool: pool,
      excludedExerciseIds: ['childs-pose'],
    };
    const nextIds = adaptSession(plan, makeSession([2.0])).nextExercises.map((e) => e.exerciseId);
    expect(nextIds).not.toContain('childs-pose');
  });

  it('still returns exercises when the exclusions would empty the pool', () => {
    const plan: Plan = {
      ...generatePlan(baseIntake),
      exercisePool: ['pelvic-tilt'],
      excludedExerciseIds: ['pelvic-tilt'],
    };
    const result = adaptSession(plan, makeSession([2.0]));
    expect(result.nextExercises.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// adaptSession — "Skipped" logs are absent from the pain maths
// ---------------------------------------------------------------------------

describe('adaptSession — Skipped tag', () => {
  it('ignores skipped logs in the mean pain score', () => {
    const plan = generatePlan({ ...baseIntake, painIntensity: 2.0 });
    const session = makeSessionFor([
      { exerciseId: 'pelvic-tilt', painLevel: 1.0 },
      { exerciseId: 'cat-cow',     painLevel: 4.0, feedbackTags: ['Skipped'] },
    ]);
    // Only the rated log counts: EMA = 0.4 * 1.0 + 0.6 * 2.0 = 1.6
    expect(adaptSession(plan, session).painEMA).toBeCloseTo(1.6, 5);
  });

  it('matches a session where the skipped log was never recorded', () => {
    const plan = generatePlan({ ...baseIntake, painIntensity: 2.0 });
    const withSkip = adaptSession(plan, makeSessionFor([
      { exerciseId: 'pelvic-tilt', painLevel: 1.0 },
      { exerciseId: 'cat-cow',     painLevel: 3.0, feedbackTags: ['Skipped'] },
    ]));
    const without = adaptSession(plan, makeSessionFor([
      { exerciseId: 'pelvic-tilt', painLevel: 1.0 },
    ]));
    expect(withSkip.painEMA).toBeCloseTo(without.painEMA, 5);
    expect(withSkip.promotionStreak).toBe(without.promotionStreak);
    expect(withSkip.demotionTrigger).toBe(without.demotionTrigger);
  });

  it('does not exclude an exercise that was skipped rather than pinched', () => {
    const plan: Plan = { ...generatePlan(baseIntake), exercisePool: ['pelvic-tilt', 'cat-cow'] };
    const result = adaptSession(plan, makeSessionFor([
      { exerciseId: 'cat-cow', painLevel: 0, feedbackTags: ['Skipped', 'Pinched'] },
    ]));
    // The whole log is ignored, so its Pinched tag cannot exclude anything.
    expect(result.excludedExerciseIds).toEqual([]);
  });

  it('a fully skipped session scores 0 like an empty one', () => {
    const plan = generatePlan({ ...baseIntake, painIntensity: 2.0 });
    const allSkipped = adaptSession(plan, makeSessionFor([
      { exerciseId: 'pelvic-tilt', painLevel: 3.0, feedbackTags: ['Skipped'] },
    ]));
    const empty = adaptSession(plan, { logs: [] });
    expect(allSkipped.painEMA).toBeCloseTo(empty.painEMA, 5);
  });
});
