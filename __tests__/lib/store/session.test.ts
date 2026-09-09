import { useSessionStore, ratedLogs, SKIPPED_TAG } from '@/lib/store/session';
import type { SessionExerciseLog } from '@/lib/store/session';
import { generatePlan } from '@/lib/routines';
import type { IntakeAnswers, Plan } from '@/lib/routines';

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

/** A real Plan built from the real exercise data. Day 1 is the first active day. */
function makePlan(): Plan {
  return generatePlan(INTAKE);
}

function start(planId = 'pid'): Plan {
  const plan = makePlan();
  useSessionStore.getState().startSession(plan, planId, 1);
  return plan;
}

function state() {
  return useSessionStore.getState();
}

beforeEach(() => useSessionStore.getState().reset());

// ─── startSession ─────────────────────────────────────────────────────────────

describe('useSessionStore — startSession', () => {
  it('sets activeSession and phase=exercise', () => {
    start('plan-id-1');

    expect(state().activeSession).not.toBeNull();
    expect(state().activeSession!.planId).toBe('plan-id-1');
    expect(state().activeSession!.currentDay).toBe(1);
    expect(state().phase).toBe('exercise');
  });

  it('takes the exercises for the day from the plan schedule by default', () => {
    const plan = start();
    const day1 = plan.schedule.find((d) => d.day === 1);

    expect(state().activeSession!.exercises).toEqual(day1!.exercises);
    expect(state().activeSession!.exercises.length).toBeGreaterThan(1);
  });

  it('accepts an explicit exercise list', () => {
    const plan = makePlan();
    const only = [{ exerciseId: 'pelvic-tilt', reps: 8, sets: 1, holdSeconds: 5, restSeconds: 20 }];

    useSessionStore.getState().startSession(plan, 'pid', 3, only);

    expect(state().activeSession!.exercises).toEqual(only);
    expect(state().activeSession!.currentDay).toBe(3);
  });

  it('clears index, logs, remote id and finishedAt from a previous session', () => {
    useSessionStore.setState({
      currentExerciseIndex: 3,
      remoteSessionId: 'old-remote',
      finishedAt: 123,
      logs: [{ exerciseId: 'x', painLevel: 2, feedbackTags: [], skipped: false }],
    });

    start('plan-id-2');

    expect(state().currentExerciseIndex).toBe(0);
    expect(state().logs).toHaveLength(0);
    expect(state().remoteSessionId).toBeNull();
    expect(state().finishedAt).toBeNull();
  });
});

// ─── remoteSessionId ──────────────────────────────────────────────────────────

describe('useSessionStore — remoteSessionId', () => {
  it('starts null and is set from the Supabase row id', () => {
    start();
    expect(state().remoteSessionId).toBeNull();

    useSessionStore.getState().setRemoteSessionId('session-uuid');
    expect(state().remoteSessionId).toBe('session-uuid');
  });
});

// ─── finishExerciseReps ───────────────────────────────────────────────────────

describe('useSessionStore — finishExerciseReps', () => {
  it('moves phase from exercise to feedback without advancing the index', () => {
    start();

    useSessionStore.getState().finishExerciseReps();

    expect(state().phase).toBe('feedback');
    expect(state().currentExerciseIndex).toBe(0);
  });

  it('does nothing when there is no active session', () => {
    useSessionStore.getState().finishExerciseReps();
    expect(state().phase).toBe('exercise');
  });
});

// ─── submitFeedback ───────────────────────────────────────────────────────────

describe('useSessionStore — submitFeedback', () => {
  it('logs the CURRENT exercise, then advances to the next one', () => {
    const plan = start();
    const first  = plan.schedule.find((d) => d.day === 1)!.exercises[0].exerciseId;
    const second = plan.schedule.find((d) => d.day === 1)!.exercises[1].exerciseId;

    useSessionStore.getState().finishExerciseReps();
    useSessionStore.getState().submitFeedback(3, ['Tightness'], 'felt tight');

    const { logs, currentExerciseIndex, phase } = state();
    expect(logs).toHaveLength(1);
    expect(logs[0].exerciseId).toBe(first);
    expect(logs[0].painLevel).toBe(3);
    expect(logs[0].feedbackTags).toEqual(['Tightness']);
    expect(logs[0].notes).toBe('felt tight');
    expect(logs[0].skipped).toBe(false);

    expect(currentExerciseIndex).toBe(1);
    expect(state().activeSession!.exercises[1].exerciseId).toBe(second);
    expect(phase).toBe('rest');
  });

  it('leaves notes undefined when the user typed nothing', () => {
    start();
    useSessionStore.getState().submitFeedback(1, [], '   ');
    expect(state().logs[0].notes).toBeUndefined();
  });

  it('moves to complete on the last exercise and stamps finishedAt', () => {
    start();
    const total = state().activeSession!.exercises.length;

    for (let i = 0; i < total; i++) {
      useSessionStore.getState().finishExerciseReps();
      useSessionStore.getState().submitFeedback(1, [], '');
      if (i < total - 1) useSessionStore.getState().skipRest();
    }

    expect(state().phase).toBe('complete');
    expect(state().logs).toHaveLength(total);
    expect(state().finishedAt).not.toBeNull();
  });
});

// ─── skipExercise ─────────────────────────────────────────────────────────────

describe('useSessionStore — skipExercise', () => {
  it('logs a skip with no pain level and moves straight to the next exercise', () => {
    const plan = start();
    const first = plan.schedule.find((d) => d.day === 1)!.exercises[0].exerciseId;

    useSessionStore.getState().skipExercise();

    const { logs, currentExerciseIndex, phase } = state();
    expect(logs).toHaveLength(1);
    expect(logs[0].exerciseId).toBe(first);
    expect(logs[0].painLevel).toBeNull();
    expect(logs[0].skipped).toBe(true);
    expect(logs[0].feedbackTags).toContain(SKIPPED_TAG);
    expect(currentExerciseIndex).toBe(1);
    expect(phase).toBe('exercise');
  });

  it('completes the session when the last exercise is skipped', () => {
    start();
    const total = state().activeSession!.exercises.length;

    for (let i = 0; i < total; i++) useSessionStore.getState().skipExercise();

    expect(state().phase).toBe('complete');
    expect(state().logs).toHaveLength(total);
  });
});

// ─── rest phase ───────────────────────────────────────────────────────────────

describe('useSessionStore — rest', () => {
  it('skipRest and restComplete both return to the exercise phase', () => {
    start();

    useSessionStore.getState().finishExerciseReps();
    useSessionStore.getState().submitFeedback(2, [], '');
    expect(state().phase).toBe('rest');

    useSessionStore.getState().skipRest();
    expect(state().phase).toBe('exercise');

    useSessionStore.setState({ phase: 'rest' });
    useSessionStore.getState().restComplete();
    expect(state().phase).toBe('exercise');
  });
});

// ─── ratedLogs ────────────────────────────────────────────────────────────────

describe('ratedLogs', () => {
  it('drops skipped logs and keeps the routines.ts log shape', () => {
    const logs: SessionExerciseLog[] = [
      { exerciseId: 'a', painLevel: 2, feedbackTags: ['Easy'], skipped: false },
      { exerciseId: 'b', painLevel: null, feedbackTags: [SKIPPED_TAG], skipped: true },
    ];

    const rated = ratedLogs(logs);

    expect(rated).toHaveLength(1);
    expect(rated[0]).toEqual({
      exerciseId: 'a', painLevel: 2, feedbackTags: ['Easy'], notes: undefined,
    });
  });
});

// ─── finalize ─────────────────────────────────────────────────────────────────

describe('useSessionStore — finalize', () => {
  it('returns null when there is no active session', () => {
    expect(useSessionStore.getState().finalize()).toBeNull();
  });

  it('averages pain over rated logs only, ignoring skips', () => {
    start();
    useSessionStore.setState({
      logs: [
        { exerciseId: 'a', painLevel: 2, feedbackTags: [], skipped: false },
        { exerciseId: 'b', painLevel: 4, feedbackTags: [], skipped: false },
        { exerciseId: 'c', painLevel: null, feedbackTags: [SKIPPED_TAG], skipped: true },
      ],
    });

    const summary = useSessionStore.getState().finalize()!;

    expect(summary.avgPain).toBeCloseTo(3, 5);
    expect(summary.completedLogs).toHaveLength(2);
    expect(summary.skippedCount).toBe(1);
    expect(summary.logs).toHaveLength(3);
  });

  it('reports avgPain 0 when every exercise was skipped', () => {
    start();
    useSessionStore.setState({
      logs: [
        { exerciseId: 'a', painLevel: null, feedbackTags: [SKIPPED_TAG], skipped: true },
        { exerciseId: 'b', painLevel: null, feedbackTags: [SKIPPED_TAG], skipped: true },
      ],
    });

    const summary = useSessionStore.getState().finalize()!;

    expect(summary.avgPain).toBe(0);
    expect(summary.completedLogs).toHaveLength(0);
  });

  it('adapts on rated logs only, so a skip cannot count as pain', () => {
    start();
    useSessionStore.setState({
      logs: [
        { exerciseId: 'a', painLevel: 0, feedbackTags: ['Felt good'], skipped: false },
        { exerciseId: 'b', painLevel: null, feedbackTags: [SKIPPED_TAG], skipped: true },
      ],
    });

    const summary = useSessionStore.getState().finalize()!;

    // painEMA blends the 0 score only; a skipped pain level of 2 would raise it.
    expect(summary.adaptation).toBeDefined();
    expect(typeof summary.adaptation.newTier).toBe('number');
    expect(summary.adaptation.painEMA).toBeCloseTo(0.6 * 2, 5);
  });

  it('returns a non-negative duration', () => {
    start();
    const summary = useSessionStore.getState().finalize()!;
    expect(summary.durationSecs).toBeGreaterThanOrEqual(0);
  });

  it('does NOT reset the store', () => {
    start();
    useSessionStore.getState().finishExerciseReps();
    useSessionStore.getState().submitFeedback(1, [], '');
    const indexBefore = state().currentExerciseIndex;

    useSessionStore.getState().finalize();

    expect(state().activeSession).not.toBeNull();
    expect(state().logs).toHaveLength(1);
    expect(state().currentExerciseIndex).toBe(indexBefore);
  });

  it('is stable when called twice after the session finished', () => {
    start();
    const total = state().activeSession!.exercises.length;
    for (let i = 0; i < total; i++) useSessionStore.getState().skipExercise();

    const first  = useSessionStore.getState().finalize()!;
    const second = useSessionStore.getState().finalize()!;

    expect(second.durationSecs).toBe(first.durationSecs);
    expect(second.logs).toHaveLength(first.logs.length);
  });
});

// ─── reset ────────────────────────────────────────────────────────────────────

describe('useSessionStore — reset', () => {
  it('returns the store to its initial state', () => {
    start();
    useSessionStore.getState().finishExerciseReps();
    useSessionStore.getState().setRemoteSessionId('remote');
    useSessionStore.getState().submitFeedback(3, [], 'note');

    useSessionStore.getState().reset();

    expect(state().activeSession).toBeNull();
    expect(state().phase).toBe('exercise');
    expect(state().currentExerciseIndex).toBe(0);
    expect(state().logs).toHaveLength(0);
    expect(state().remoteSessionId).toBeNull();
    expect(state().finishedAt).toBeNull();
  });
});
