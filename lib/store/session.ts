import { create } from 'zustand';
import type {
  CompletedExerciseLog, Plan, PlanExercise, SessionAdaptation,
} from '@/lib/routines';
import { adaptSession } from '@/lib/routines';
import { useIntakeStore } from '@/lib/store/intake';

export type SessionPhase = 'exercise' | 'rest' | 'feedback' | 'complete';

/** Tag written on a skipped exercise. Skipped logs never carry a pain level. */
export const SKIPPED_TAG = 'Skipped';

/**
 * A log kept while the session runs. `painLevel` is null for a skipped
 * exercise, so skipping never counts against the user's pain average.
 * Only non-skipped logs are handed to Supabase and to adaptSession.
 */
export interface SessionExerciseLog {
  exerciseId: string;
  painLevel: number | null;
  feedbackTags: string[];
  notes?: string;
  skipped: boolean;
}

export interface ActiveSession {
  planId: string;
  plan: Plan;
  currentDay: number;
  exercises: PlanExercise[];
  startedAt: number;   // Date.now()
}

export interface SessionSummary {
  durationSecs: number;
  /** Mean pain across non-skipped exercises. 0 when nothing was rated. */
  avgPain: number;
  /** Every log, skipped ones included. */
  logs: SessionExerciseLog[];
  /** Logs that carry a real pain rating, in the shape lib/routines expects. */
  completedLogs: CompletedExerciseLog[];
  skippedCount: number;
  adaptation: SessionAdaptation;
}

/** Drops skipped logs and narrows the rest to the routines.ts log shape. */
export function ratedLogs(logs: SessionExerciseLog[]): CompletedExerciseLog[] {
  const out: CompletedExerciseLog[] = [];
  for (const log of logs) {
    if (log.skipped || log.painLevel === null) continue;
    out.push({
      exerciseId: log.exerciseId,
      painLevel: log.painLevel,
      feedbackTags: log.feedbackTags,
      notes: log.notes,
    });
  }
  return out;
}

interface SessionStore {
  activeSession: ActiveSession | null;
  currentExerciseIndex: number;
  phase: SessionPhase;
  logs: SessionExerciseLog[];
  /** Supabase sessions row id, when one could be created. */
  remoteSessionId: string | null;
  /** Set when the last exercise is done, so the summary is stable. */
  finishedAt: number | null;

  /** Begins a session. Falls back to the plan schedule when exercises are omitted. */
  startSession: (
    plan: Plan,
    planId: string,
    day: number,
    exercises?: PlanExercise[],
  ) => void;

  setRemoteSessionId: (id: string | null) => void;

  /** Reps and sets done: ask for feedback. */
  finishExerciseReps: () => void;

  /** Logs the current exercise, then advances to rest (or complete). */
  submitFeedback: (painLevel: number, tags: string[], notes: string) => void;

  /** Logs the current exercise as skipped, then moves to the next one. */
  skipExercise: () => void;

  skipRest: () => void;
  restComplete: () => void;

  /** Computes the summary. Does not touch the store, so it is safe to render. */
  finalize: () => SessionSummary | null;

  reset: () => void;
}

const INITIAL: Pick<
  SessionStore,
  'activeSession' | 'currentExerciseIndex' | 'phase' | 'logs' |
  'remoteSessionId' | 'finishedAt'
> = {
  activeSession: null,
  currentExerciseIndex: 0,
  phase: 'exercise',
  logs: [],
  remoteSessionId: null,
  finishedAt: null,
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...INITIAL,

  startSession: (plan, planId, day, exercises) => {
    const dayExercises =
      exercises ?? plan.schedule.find((d) => d.day === day)?.exercises ?? [];
    set({
      ...INITIAL,
      activeSession: {
        planId,
        plan,
        currentDay: day,
        exercises: dayExercises,
        startedAt: Date.now(),
      },
      phase: 'exercise',
    });
  },

  setRemoteSessionId: (id) => set({ remoteSessionId: id }),

  finishExerciseReps: () => {
    if (!get().activeSession) return;
    set({ phase: 'feedback' });
  },

  submitFeedback: (painLevel, tags, notes) => {
    const { activeSession, currentExerciseIndex, logs } = get();
    if (!activeSession) return;

    const pe = activeSession.exercises[currentExerciseIndex];
    if (!pe) return;

    const log: SessionExerciseLog = {
      exerciseId: pe.exerciseId,
      painLevel,
      feedbackTags: tags,
      notes: notes.trim() ? notes.trim() : undefined,
      skipped: false,
    };

    advance(set, activeSession, currentExerciseIndex, [...logs, log], 'rest');
  },

  skipExercise: () => {
    const { activeSession, currentExerciseIndex, logs } = get();
    if (!activeSession) return;

    const pe = activeSession.exercises[currentExerciseIndex];
    if (!pe) return;

    const log: SessionExerciseLog = {
      exerciseId: pe.exerciseId,
      painLevel: null,
      feedbackTags: [SKIPPED_TAG],
      skipped: true,
    };

    // A skip goes straight to the next exercise: there is nothing to rest from.
    advance(set, activeSession, currentExerciseIndex, [...logs, log], 'exercise');
  },

  skipRest: () => set({ phase: 'exercise' }),

  restComplete: () => set({ phase: 'exercise' }),

  finalize: () => {
    const { activeSession, logs, finishedAt } = get();
    if (!activeSession) return null;

    const endedAt = finishedAt ?? Date.now();
    const durationSecs = Math.max(
      0,
      Math.round((endedAt - activeSession.startedAt) / 1000),
    );

    const completedLogs = ratedLogs(logs);
    const avgPain = completedLogs.length > 0
      ? completedLogs.reduce((a, l) => a + l.painLevel, 0) / completedLogs.length
      : 0;

    const completedActiveDays = useIntakeStore.getState().completedDays.length;
    const adaptation = adaptSession(activeSession.plan, { logs: completedLogs }, completedActiveDays);

    return {
      durationSecs,
      avgPain,
      logs,
      completedLogs,
      skippedCount: logs.length - completedLogs.length,
      adaptation,
    };
  },

  reset: () => set({ ...INITIAL }),
}));

/** Shared tail of submitFeedback / skipExercise: store the log, then move on. */
function advance(
  set: (partial: Partial<SessionStore>) => void,
  activeSession: ActiveSession,
  currentExerciseIndex: number,
  logs: SessionExerciseLog[],
  nextPhase: 'rest' | 'exercise',
) {
  const isLast = currentExerciseIndex >= activeSession.exercises.length - 1;

  if (isLast) {
    set({ logs, phase: 'complete', finishedAt: Date.now() });
    return;
  }

  set({
    logs,
    phase: nextPhase,
    currentExerciseIndex: currentExerciseIndex + 1,
  });
}
