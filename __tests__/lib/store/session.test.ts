import { useSessionStore } from '@/lib/store/session';
import { generatePlan } from '@/lib/routines';
import type { Plan } from '@/lib/routines';
import type { IntakeAnswers } from '@/lib/routines';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const INTAKE: IntakeAnswers = {
  conditionId: null,
  bodyRegions: ['lowBack'],
  painDuration: 'subacute',
  painIntensity: 2,
  aggravatingFactors: [],
  previousTreatment: [],
  goals: [],
};

/** Build a real Plan (uses real exercise data) */
function makePlan(): Plan {
  return generatePlan(INTAKE);
}

function resetStore() {
  useSessionStore.getState().reset();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(resetStore);

describe('useSessionStore — startSession', () => {
  it('sets activeSession and phase=exercise', () => {
    const plan = makePlan();
    // day 1 is the first non-rest day
    useSessionStore.getState().startSession(plan, 'plan-id-1', 1);

    const state = useSessionStore.getState();
    expect(state.activeSession).not.toBeNull();
    expect(state.activeSession!.planId).toBe('plan-id-1');
    expect(state.phase).toBe('exercise');
  });

  it('resets counters and logs on startSession', () => {
    const plan = makePlan();
    // Simulate mid-session state before re-starting
    useSessionStore.setState({ currentExerciseIndex: 3, logs: [
      { exerciseId: 'x', painLevel: 2, feedbackTags: [] },
    ] as any });

    useSessionStore.getState().startSession(plan, 'plan-id-2', 1);

    const state = useSessionStore.getState();
    expect(state.currentExerciseIndex).toBe(0);
    expect(state.logs).toHaveLength(0);
  });

  it('populates exercises from the correct day', () => {
    const plan = makePlan();
    useSessionStore.getState().startSession(plan, 'pid', 1);

    const { activeSession } = useSessionStore.getState();
    const daySchedule = plan.schedule.find((d) => d.day === 1);
    expect(activeSession!.exercises).toEqual(daySchedule!.exercises);
  });
});

describe('useSessionStore — finishExerciseReps', () => {
  it('moves phase from exercise to feedback', () => {
    const plan = makePlan();
    useSessionStore.getState().startSession(plan, 'pid', 1);
    expect(useSessionStore.getState().phase).toBe('exercise');

    useSessionStore.getState().finishExerciseReps();
    expect(useSessionStore.getState().phase).toBe('feedback');
  });
});

describe('useSessionStore — submitFeedback', () => {
  function startWithTwoExercises() {
    const plan = makePlan();
    // Day 1 typically has 6 exercises from generatePlan.
    // We need at least 2 for these tests.
    useSessionStore.getState().startSession(plan, 'pid', 1);
    useSessionStore.getState().finishExerciseReps(); // → feedback
    return plan;
  }

  it('moves to rest phase and advances index when NOT on last exercise', () => {
    startWithTwoExercises();
    const indexBefore = useSessionStore.getState().currentExerciseIndex;

    useSessionStore.getState().submitFeedback(2, [], '');

    const state = useSessionStore.getState();
    expect(state.phase).toBe('rest');
    expect(state.currentExerciseIndex).toBe(indexBefore + 1);
  });

  it('appends a log entry for the completed exercise', () => {
    startWithTwoExercises();

    useSessionStore.getState().submitFeedback(3, ['Tightness'], 'felt tight');

    const { logs } = useSessionStore.getState();
    expect(logs).toHaveLength(1);
    expect(logs[0].painLevel).toBe(3);
    expect(logs[0].feedbackTags).toEqual(['Tightness']);
    expect(logs[0].notes).toBe('felt tight');
  });

  it('moves to complete phase when on the last exercise', () => {
    const plan = makePlan();
    useSessionStore.getState().startSession(plan, 'pid', 1);

    const { activeSession } = useSessionStore.getState();
    const total = activeSession!.exercises.length;

    // Submit feedback for all exercises except the last
    for (let i = 0; i < total - 1; i++) {
      useSessionStore.getState().finishExerciseReps();
      useSessionStore.getState().submitFeedback(1, [], '');
      // skipRest to get back to 'exercise' phase for next iteration
      useSessionStore.getState().skipRest();
    }

    // Final exercise
    useSessionStore.getState().finishExerciseReps();
    useSessionStore.getState().submitFeedback(1, [], '');

    expect(useSessionStore.getState().phase).toBe('complete');
  });
});

describe('useSessionStore — skipRest', () => {
  it('moves phase from rest to exercise', () => {
    const plan = makePlan();
    useSessionStore.getState().startSession(plan, 'pid', 1);
    useSessionStore.getState().finishExerciseReps();
    useSessionStore.getState().submitFeedback(2, [], ''); // → rest

    expect(useSessionStore.getState().phase).toBe('rest');
    useSessionStore.getState().skipRest();
    expect(useSessionStore.getState().phase).toBe('exercise');
  });
});

describe('useSessionStore — skipExercise', () => {
  it('advances index and stays in exercise phase on non-last exercise', () => {
    const plan = makePlan();
    useSessionStore.getState().startSession(plan, 'pid', 1);

    const indexBefore = useSessionStore.getState().currentExerciseIndex;
    useSessionStore.getState().skipExercise();

    const state = useSessionStore.getState();
    expect(state.currentExerciseIndex).toBe(indexBefore + 1);
    expect(state.phase).toBe('exercise');
  });

  it('logs skipped exercise with painLevel=2 and tag Skipped', () => {
    const plan = makePlan();
    useSessionStore.getState().startSession(plan, 'pid', 1);

    const { activeSession } = useSessionStore.getState();
    const skippedId = activeSession!.exercises[0].exerciseId;

    useSessionStore.getState().skipExercise();

    const { logs } = useSessionStore.getState();
    expect(logs).toHaveLength(1);
    expect(logs[0].exerciseId).toBe(skippedId);
    expect(logs[0].painLevel).toBe(2);
    expect(logs[0].feedbackTags).toContain('Skipped');
  });

  it('moves to complete phase when skipping the last exercise', () => {
    const plan = makePlan();
    useSessionStore.getState().startSession(plan, 'pid', 1);

    const { activeSession } = useSessionStore.getState();
    const total = activeSession!.exercises.length;

    // Skip all exercises
    for (let i = 0; i < total; i++) {
      useSessionStore.getState().skipExercise();
    }

    expect(useSessionStore.getState().phase).toBe('complete');
  });
});

describe('useSessionStore — endSession', () => {
  it('returns durationSecs >= 0', () => {
    const plan = makePlan();
    useSessionStore.getState().startSession(plan, 'pid', 1);

    const result = useSessionStore.getState().endSession();
    expect(result).not.toBeNull();
    expect(result!.durationSecs).toBeGreaterThanOrEqual(0);
  });

  it('returns avgPain = 0 when no logs', () => {
    const plan = makePlan();
    useSessionStore.getState().startSession(plan, 'pid', 1);

    const result = useSessionStore.getState().endSession();
    expect(result!.avgPain).toBe(0);
  });

  it('returns correct avgPain when logs exist', () => {
    const plan = makePlan();
    useSessionStore.getState().startSession(plan, 'pid', 1);

    // Manually inject two logs
    useSessionStore.setState({
      logs: [
        { exerciseId: 'a', painLevel: 2, feedbackTags: [] },
        { exerciseId: 'b', painLevel: 4, feedbackTags: [] },
      ],
    });

    const result = useSessionStore.getState().endSession();
    expect(result!.avgPain).toBeCloseTo(3, 5);
  });

  it('returns the logs array', () => {
    const plan = makePlan();
    useSessionStore.getState().startSession(plan, 'pid', 1);
    useSessionStore.setState({
      logs: [{ exerciseId: 'x', painLevel: 1, feedbackTags: [] }],
    });

    const result = useSessionStore.getState().endSession();
    expect(result!.logs).toHaveLength(1);
  });

  it('returns an adaptation object', () => {
    const plan = makePlan();
    useSessionStore.getState().startSession(plan, 'pid', 1);

    const result = useSessionStore.getState().endSession();
    expect(result!.adaptation).toBeDefined();
    expect(typeof result!.adaptation.newTier).toBe('number');
  });

  it('resets store state after endSession', () => {
    const plan = makePlan();
    useSessionStore.getState().startSession(plan, 'pid', 1);
    useSessionStore.getState().endSession();

    const state = useSessionStore.getState();
    expect(state.activeSession).toBeNull();
    expect(state.currentExerciseIndex).toBe(0);
    expect(state.phase).toBe('exercise');
    expect(state.logs).toHaveLength(0);
  });

  it('returns null when there is no active session', () => {
    const result = useSessionStore.getState().endSession();
    expect(result).toBeNull();
  });
});

describe('useSessionStore — reset', () => {
  it('returns store to initial state', () => {
    const plan = makePlan();
    useSessionStore.getState().startSession(plan, 'pid', 1);
    useSessionStore.getState().finishExerciseReps();
    useSessionStore.setState({ logs: [{ exerciseId: 'x', painLevel: 3, feedbackTags: [] }] });

    useSessionStore.getState().reset();

    const state = useSessionStore.getState();
    expect(state.activeSession).toBeNull();
    expect(state.phase).toBe('exercise');
    expect(state.currentExerciseIndex).toBe(0);
    expect(state.logs).toHaveLength(0);
    expect(state.pendingPainLevel).toBeNull();
    expect(state.pendingTags).toHaveLength(0);
    expect(state.pendingNotes).toBe('');
  });
});
