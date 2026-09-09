/**
 * Unit tests for lib/store/intake.ts.
 *
 * The interesting part is the current-day logic: which schedule day the app
 * offers, how rest days are consumed as the calendar moves, and what happens
 * once a day has been completed today.
 */

// AsyncStorage has no native module under Jest, so persistence runs in memory.
import { useIntakeStore, computeCurrentDay } from '@/lib/store/intake';
import { generatePlan, type Plan, type SessionAdaptation } from '@/lib/routines';
import { localDateString } from '@/lib/plans/dates';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem:    jest.fn(async (key: string) => store[key] ?? null),
      setItem:    jest.fn(async (key: string, value: string) => { store[key] = value; }),
      removeItem: jest.fn(async (key: string) => { delete store[key]; }),
    },
  };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Low-back-pain plan: 28 days, active Mon–Fri, rest on days 6, 7, 13, 14, … */
function plan(): Plan {
  return generatePlan({
    conditionId: 'low-back-pain',
    bodyRegions: ['lowBack'],
    painDuration: 'subacute',
    painIntensity: 2,
    aggravatingFactors: [],
    previousTreatment: [],
    goals: [],
  });
}

/** A YYYY-MM-DD key `offset` days from today. */
function dayKey(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return localDateString(d);
}

function adaptation(overrides: Partial<SessionAdaptation> = {}): SessionAdaptation {
  return {
    newTier: 1,
    painEMA: 1.6,
    promotionStreak: 1,
    demotionTrigger: 0,
    nextExercises: [
      { exerciseId: 'cat-cow', reps: 12, sets: 2, holdSeconds: 0, restSeconds: 18 },
    ],
    promoted: false,
    demoted: false,
    excludedExerciseIds: [],
    ...overrides,
  };
}

function resetStore() {
  useIntakeStore.getState().reset();
}

beforeEach(resetStore);

// ─── Step data ────────────────────────────────────────────────────────────────

describe('useIntakeStore — toggleRegion', () => {
  it('adds a region on first call', () => {
    useIntakeStore.getState().toggleRegion('lowBack');
    expect(useIntakeStore.getState().selectedRegions).toContain('lowBack');
  });

  it('removes a region on second call (toggle off)', () => {
    useIntakeStore.getState().toggleRegion('lowBack');
    useIntakeStore.getState().toggleRegion('lowBack');
    expect(useIntakeStore.getState().selectedRegions).not.toContain('lowBack');
  });

  it('can hold multiple distinct regions', () => {
    useIntakeStore.getState().toggleRegion('lowBack');
    useIntakeStore.getState().toggleRegion('neck');
    const { selectedRegions } = useIntakeStore.getState();
    expect(selectedRegions).toContain('lowBack');
    expect(selectedRegions).toContain('neck');
    expect(selectedRegions).toHaveLength(2);
  });

  it('removes only the target region, leaving others intact', () => {
    useIntakeStore.getState().toggleRegion('lowBack');
    useIntakeStore.getState().toggleRegion('neck');
    useIntakeStore.getState().toggleRegion('neck'); // remove neck only
    const { selectedRegions } = useIntakeStore.getState();
    expect(selectedRegions).toContain('lowBack');
    expect(selectedRegions).not.toContain('neck');
  });
});

describe('useIntakeStore — setCondition', () => {
  it('stores the condition id', () => {
    useIntakeStore.getState().setCondition('low-back-pain');
    expect(useIntakeStore.getState().selectedCondition).toBe('low-back-pain');
  });

  it('replaces a previously set condition', () => {
    useIntakeStore.getState().setCondition('low-back-pain');
    useIntakeStore.getState().setCondition('desk-posture');
    expect(useIntakeStore.getState().selectedCondition).toBe('desk-posture');
  });

  it('clears the condition when called with null', () => {
    useIntakeStore.getState().setCondition('low-back-pain');
    useIntakeStore.getState().setCondition(null);
    expect(useIntakeStore.getState().selectedCondition).toBeNull();
  });
});

describe('useIntakeStore — setAnswer', () => {
  it('stores a string answer by key', () => {
    useIntakeStore.getState().setAnswer('painDuration', 'chronic');
    expect(useIntakeStore.getState().answers.painDuration).toBe('chronic');
  });

  it('stores a numeric answer by key', () => {
    useIntakeStore.getState().setAnswer('painIntensity', 4);
    expect(useIntakeStore.getState().answers.painIntensity).toBe(4);
  });

  it('stores pain intensity as a number, never a string', () => {
    useIntakeStore.getState().setAnswer('painIntensity', 2);
    expect(typeof useIntakeStore.getState().answers.painIntensity).toBe('number');
  });

  it('stores an array answer by key', () => {
    useIntakeStore.getState().setAnswer('goals', ['pain relief', 'mobility']);
    expect(useIntakeStore.getState().answers.goals).toEqual(['pain relief', 'mobility']);
  });

  it('merges without overwriting other answers', () => {
    useIntakeStore.getState().setAnswer('painDuration', 'acute');
    useIntakeStore.getState().setAnswer('painIntensity', 3);

    const { answers } = useIntakeStore.getState();
    expect(answers.painDuration).toBe('acute');
    expect(answers.painIntensity).toBe(3);
  });
});

describe('useIntakeStore — default answers', () => {
  it('pre-selects no single-choice answer', () => {
    const { answers } = useIntakeStore.getState();
    expect(answers.painDuration).toBeUndefined();
    expect(answers.painIntensity).toBeUndefined();
  });

  it('starts multi-select answers as empty arrays', () => {
    const { answers } = useIntakeStore.getState();
    expect(answers.aggravatingFactors).toEqual([]);
    expect(answers.previousTreatment).toEqual([]);
    expect(answers.goals).toEqual([]);
  });
});

// ─── submitQuestionnaire ──────────────────────────────────────────────────────

describe('useIntakeStore — submitQuestionnaire', () => {
  it('returns a Plan with an exercisePool', () => {
    useIntakeStore.getState().toggleRegion('lowBack');
    const result = useIntakeStore.getState().submitQuestionnaire();

    expect(result).toBeDefined();
    expect(Array.isArray(result.exercisePool)).toBe(true);
    expect(result.exercisePool.length).toBeGreaterThan(0);
  });

  it('returns a Plan with a schedule array', () => {
    useIntakeStore.getState().toggleRegion('lowBack');
    const result = useIntakeStore.getState().submitQuestionnaire();

    expect(Array.isArray(result.schedule)).toBe(true);
    expect(result.schedule.length).toBeGreaterThan(0);
  });

  it('stores the generated plan in the store', () => {
    useIntakeStore.getState().toggleRegion('neck');
    const result = useIntakeStore.getState().submitQuestionnaire();

    expect(useIntakeStore.getState().generatedPlan).toEqual(result);
  });

  it('reflects selected body regions in the plan', () => {
    useIntakeStore.getState().toggleRegion('lowBack');
    const result = useIntakeStore.getState().submitQuestionnaire();

    expect(result.bodyRegions).toContain('lowBack');
  });

  it('reflects selected condition in the plan', () => {
    useIntakeStore.getState().setCondition('low-back-pain');
    const result = useIntakeStore.getState().submitQuestionnaire();

    expect(result.conditionId).toBe('low-back-pain');
  });

  it('works with no regions or condition (fallback pool)', () => {
    const result = useIntakeStore.getState().submitQuestionnaire();

    expect(result.exercisePool.length).toBeGreaterThan(0);
    expect(result.schedule.length).toBeGreaterThan(0);
  });

  it('stamps the plan start date and clears prior progress', () => {
    useIntakeStore.setState({ completedDays: [1, 2], lastCompletedOn: dayKey(-3) });
    useIntakeStore.getState().submitQuestionnaire();

    const s = useIntakeStore.getState();
    expect(s.planStartedAt).toBe(localDateString());
    expect(s.completedDays).toEqual([]);
    expect(s.lastCompletedOn).toBeNull();
    expect(s.activePlanId).toBeNull();
  });
});

// ─── getCurrentDay ────────────────────────────────────────────────────────────

describe('useIntakeStore — getCurrentDay', () => {
  it('returns null with no plan', () => {
    expect(useIntakeStore.getState().getCurrentDay()).toBeNull();
  });

  it('offers day 1 on a brand-new plan', () => {
    useIntakeStore.setState({ generatedPlan: plan() });
    const today = useIntakeStore.getState().getCurrentDay();
    expect(today?.day).toBe(1);
    expect(today?.isRest).toBe(false);
    expect(today?.completedToday).toBe(false);
    expect(today?.exercises.length).toBeGreaterThan(0);
  });

  it('flags the day as completed when it was finished today', () => {
    useIntakeStore.setState({
      generatedPlan: plan(),
      completedDays: [1],
      lastCompletedOn: localDateString(),
    });
    const today = useIntakeStore.getState().getCurrentDay();
    expect(today?.day).toBe(1);
    expect(today?.completedToday).toBe(true);
  });

  it('moves to the next active day the following calendar day', () => {
    useIntakeStore.setState({
      generatedPlan: plan(),
      completedDays: [1],
      lastCompletedOn: dayKey(-1),
    });
    const today = useIntakeStore.getState().getCurrentDay();
    expect(today?.day).toBe(2);
    expect(today?.completedToday).toBe(false);
  });

  it('does not advance twice in one day', () => {
    useIntakeStore.setState({
      generatedPlan: plan(),
      completedDays: [1, 2],
      lastCompletedOn: dayKey(-1),
    });
    expect(useIntakeStore.getState().getCurrentDay()?.day).toBe(3);
  });

  it('returns null once every day of the plan is done', () => {
    const p = plan();
    useIntakeStore.setState({
      generatedPlan: p,
      completedDays: p.schedule.map((d) => d.day),
      lastCompletedOn: dayKey(-1),
    });
    expect(useIntakeStore.getState().getCurrentDay()).toBeNull();
  });
});

// ─── The rest-day rules, against a fixed "today" ──────────────────────────────

describe('computeCurrentDay — rest day consumption', () => {
  const p = plan();
  // Day 5 finished on a Friday; days 6 and 7 are rest days.
  const friday   = '2026-09-04';
  const saturday = '2026-09-05';
  const sunday   = '2026-09-06';
  const monday   = '2026-09-07';

  it('shows the first rest day the day after day 5', () => {
    const day = computeCurrentDay(p, [1, 2, 3, 4, 5], friday, saturday);
    expect(day?.day).toBe(6);
    expect(day?.isRest).toBe(true);
    expect(day?.exercises).toEqual([]);
  });

  it('shows the second rest day two days later', () => {
    const day = computeCurrentDay(p, [1, 2, 3, 4, 5], friday, sunday);
    expect(day?.day).toBe(7);
    expect(day?.isRest).toBe(true);
  });

  it('shows day 8 three days later, both rest days consumed', () => {
    const day = computeCurrentDay(p, [1, 2, 3, 4, 5], friday, monday);
    expect(day?.day).toBe(8);
    expect(day?.isRest).toBe(false);
  });

  it('lands on the next active day when the user comes back much later', () => {
    const day = computeCurrentDay(p, [1, 2, 3, 4, 5], friday, '2026-09-20');
    expect(day?.day).toBe(8);
    expect(day?.isRest).toBe(false);
  });

  it('reports the finished day when it was completed on the same date', () => {
    const day = computeCurrentDay(p, [1, 2, 3, 4, 5], friday, friday);
    expect(day?.day).toBe(5);
    expect(day?.completedToday).toBe(true);
  });

  it('never skips an active day, however long the gap', () => {
    const day = computeCurrentDay(p, [1], '2026-01-01', '2026-12-31');
    expect(day?.day).toBe(2);
  });

  it('gives a user who never rests the next active day', () => {
    // Day 7 was a rest day the user trained through; day 8 comes next.
    const day = computeCurrentDay(p, [1, 2, 3, 4, 5, 6, 7], sunday, monday);
    expect(day?.day).toBe(8);
    expect(day?.isRest).toBe(false);
  });

  it('skips leading rest days before the first session', () => {
    const restFirst: Plan = {
      ...p,
      schedule: [
        { day: 1, isRest: true, exercises: [] },
        { day: 2, isRest: false, exercises: p.schedule[0].exercises },
      ],
    };
    expect(computeCurrentDay(restFirst, [], null, monday)?.day).toBe(2);
  });
});

// ─── getNextActiveDay ─────────────────────────────────────────────────────────

describe('useIntakeStore — getNextActiveDay', () => {
  it('returns the next session even on a rest day', () => {
    useIntakeStore.setState({
      generatedPlan: plan(),
      completedDays: [1, 2, 3, 4, 5],
      lastCompletedOn: dayKey(-1),
    });
    expect(useIntakeStore.getState().getCurrentDay()?.isRest).toBe(true);
    const next = useIntakeStore.getState().getNextActiveDay();
    expect(next?.day).toBe(8);
    expect(next?.isRest).toBe(false);
  });

  it('returns the next session after a day completed today', () => {
    useIntakeStore.setState({
      generatedPlan: plan(),
      completedDays: [1],
      lastCompletedOn: localDateString(),
    });
    expect(useIntakeStore.getState().getNextActiveDay()?.day).toBe(2);
  });

  it('returns null when the plan is finished', () => {
    const p = plan();
    useIntakeStore.setState({
      generatedPlan: p,
      completedDays: p.schedule.map((d) => d.day),
    });
    expect(useIntakeStore.getState().getNextActiveDay()).toBeNull();
  });
});

// ─── applyAdaptation ──────────────────────────────────────────────────────────

describe('useIntakeStore — applyAdaptation', () => {
  beforeEach(() => {
    useIntakeStore.setState({ generatedPlan: plan(), activePlanId: null });
  });

  it('marks the day completed and stamps today', () => {
    useIntakeStore.getState().applyAdaptation(adaptation(), 1);
    const s = useIntakeStore.getState();
    expect(s.completedDays).toEqual([1]);
    expect(s.lastCompletedOn).toBe(localDateString());
  });

  it('does not record the same day twice', () => {
    useIntakeStore.getState().applyAdaptation(adaptation(), 1);
    useIntakeStore.getState().applyAdaptation(adaptation(), 1);
    expect(useIntakeStore.getState().completedDays).toEqual([1]);
  });

  it('replaces the next active day with the adapted exercises', () => {
    useIntakeStore.getState().applyAdaptation(adaptation(), 1);
    const schedule = useIntakeStore.getState().generatedPlan!.schedule;
    expect(schedule.find((d) => d.day === 2)!.exercises).toEqual(
      adaptation().nextExercises,
    );
  });

  it('leaves rest days empty when replacing the next active day', () => {
    // Day 5 is the last active day of week one; day 8 is the next active day.
    useIntakeStore.getState().applyAdaptation(adaptation(), 5);
    const schedule = useIntakeStore.getState().generatedPlan!.schedule;
    expect(schedule.find((d) => d.day === 6)!.exercises).toEqual([]);
    expect(schedule.find((d) => d.day === 8)!.exercises).toEqual(
      adaptation().nextExercises,
    );
  });

  it('updates tier, EMA and streak fields on the plan', () => {
    useIntakeStore.getState().applyAdaptation(
      adaptation({ newTier: 2, painEMA: 0.8, promotionStreak: 2, demotionTrigger: 0 }),
      1,
    );
    const p = useIntakeStore.getState().generatedPlan!;
    expect(p.userTier).toBe(2);
    expect(p.painEMA).toBeCloseTo(0.8, 5);
    expect(p.promotionStreak).toBe(2);
    expect(p.demotionTrigger).toBe(0);
  });

  it('derives the displayed effort from the adapted pain EMA', () => {
    useIntakeStore.getState().applyAdaptation(adaptation({ painEMA: 3.2 }), 1);
    expect(useIntakeStore.getState().generatedPlan!.effort).toBe('Light');

    useIntakeStore.getState().applyAdaptation(adaptation({ painEMA: 0.4 }), 2);
    expect(useIntakeStore.getState().generatedPlan!.effort).toBe('Vigorous');
  });

  it('keeps the exercise exclusions the adaptation reports', () => {
    useIntakeStore.getState().applyAdaptation(
      adaptation({ excludedExerciseIds: ['pelvic-tilt'] }),
      1,
    );
    expect(useIntakeStore.getState().generatedPlan!.excludedExerciseIds).toEqual(['pelvic-tilt']);
  });

  it('does nothing when there is no plan', () => {
    useIntakeStore.setState({ generatedPlan: null });
    useIntakeStore.getState().applyAdaptation(adaptation(), 1);
    expect(useIntakeStore.getState().completedDays).toEqual([]);
  });

  it('advances getCurrentDay to the completed day, flagged as done', () => {
    useIntakeStore.getState().applyAdaptation(adaptation(), 1);
    const today = useIntakeStore.getState().getCurrentDay();
    expect(today?.day).toBe(1);
    expect(today?.completedToday).toBe(true);
  });
});

// ─── Plan identity and reset ──────────────────────────────────────────────────

describe('useIntakeStore — plan identity', () => {
  it('stores the remote plan id', () => {
    useIntakeStore.getState().setActivePlanId('plan-123');
    expect(useIntakeStore.getState().activePlanId).toBe('plan-123');
  });

  it('hydrates a plan loaded from Supabase', () => {
    const loaded = plan();
    useIntakeStore.getState().hydrateFromRemote({
      planId: 'plan-abc',
      plan: loaded,
      completedDays: [1, 2],
      startedAt: '2026-09-01',
      lastCompletedOn: '2026-09-02',
    });

    const s = useIntakeStore.getState();
    expect(s.activePlanId).toBe('plan-abc');
    expect(s.generatedPlan).toEqual(loaded);
    expect(s.completedDays).toEqual([1, 2]);
    expect(s.planStartedAt).toBe('2026-09-01');
    expect(s.lastCompletedOn).toBe('2026-09-02');
    expect(s.selectedCondition).toBe(loaded.conditionId);
  });
});

describe('useIntakeStore — reset', () => {
  it('clears selectedRegions', () => {
    useIntakeStore.getState().toggleRegion('lowBack');
    useIntakeStore.getState().reset();
    expect(useIntakeStore.getState().selectedRegions).toHaveLength(0);
  });

  it('clears selectedCondition', () => {
    useIntakeStore.getState().setCondition('low-back-pain');
    useIntakeStore.getState().reset();
    expect(useIntakeStore.getState().selectedCondition).toBeNull();
  });

  it('clears generatedPlan', () => {
    useIntakeStore.getState().toggleRegion('lowBack');
    useIntakeStore.getState().submitQuestionnaire();
    expect(useIntakeStore.getState().generatedPlan).not.toBeNull();

    useIntakeStore.getState().reset();
    expect(useIntakeStore.getState().generatedPlan).toBeNull();
  });

  it('clears plan progress and identity', () => {
    useIntakeStore.setState({
      activePlanId: 'plan-1',
      completedDays: [1, 2],
      planStartedAt: '2026-09-01',
      lastCompletedOn: '2026-09-02',
    });
    useIntakeStore.getState().reset();

    const s = useIntakeStore.getState();
    expect(s.activePlanId).toBeNull();
    expect(s.completedDays).toEqual([]);
    expect(s.planStartedAt).toBeNull();
    expect(s.lastCompletedOn).toBeNull();
  });

  it('restores the empty default answers', () => {
    useIntakeStore.getState().setAnswer('painDuration', 'chronic');
    useIntakeStore.getState().setAnswer('painIntensity', 4);
    useIntakeStore.getState().reset();

    const { answers } = useIntakeStore.getState();
    expect(answers.painDuration).toBeUndefined();
    expect(answers.painIntensity).toBeUndefined();
    expect(answers.goals).toEqual([]);
  });
});
