import { create } from 'zustand';
import type { Plan, PlanExercise, CompletedExerciseLog } from '@/lib/routines';
import { adaptSession } from '@/lib/routines';

export type SessionPhase = 'exercise' | 'rest' | 'feedback' | 'complete';

export interface ActiveSession {
  planId: string;
  plan: Plan;
  currentDay: number;
  exercises: PlanExercise[];
  startedAt: number;   // Date.now()
}

interface SessionStore {
  activeSession: ActiveSession | null;
  currentExerciseIndex: number;
  phase: SessionPhase;
  logs: CompletedExerciseLog[];

  // Pending feedback for the current exercise
  pendingPainLevel: number | null;
  pendingTags: string[];
  pendingNotes: string;

  // Actions
  startSession: (plan: Plan, planId: string, day: number) => void;

  // Called when hold/reps complete — move to feedback
  finishExerciseReps: () => void;

  // Called on PainFeedbackScreen submit
  submitFeedback: (painLevel: number, tags: string[], notes: string) => void;

  // Skip rest, go straight to next exercise
  skipRest: () => void;

  // Rest timer elapsed
  restComplete: () => void;

  // Manual skip of exercise (no feedback)
  skipExercise: () => void;

  endSession: () => {
    durationSecs: number;
    avgPain: number;
    logs: CompletedExerciseLog[];
    adaptation: ReturnType<typeof adaptSession>;
  } | null;

  reset: () => void;
}

const INITIAL: Pick<
  SessionStore,
  'activeSession' | 'currentExerciseIndex' | 'phase' | 'logs' |
  'pendingPainLevel' | 'pendingTags' | 'pendingNotes'
> = {
  activeSession: null,
  currentExerciseIndex: 0,
  phase: 'exercise',
  logs: [],
  pendingPainLevel: null,
  pendingTags: [],
  pendingNotes: '',
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...INITIAL,

  startSession: (plan, planId, day) => {
    const exercises = plan.schedule.find((d) => d.day === day)?.exercises ?? [];
    set({
      ...INITIAL,
      activeSession: {
        planId,
        plan,
        currentDay: day,
        exercises,
        startedAt: Date.now(),
      },
      phase: 'exercise',
    });
  },

  finishExerciseReps: () => set({ phase: 'feedback' }),

  submitFeedback: (painLevel, tags, notes) => {
    const { activeSession, currentExerciseIndex, logs } = get();
    if (!activeSession) return;

    const ex = activeSession.exercises[currentExerciseIndex];
    const newLog: CompletedExerciseLog = {
      exerciseId: ex.exerciseId,
      painLevel,
      feedbackTags: tags,
      notes: notes || undefined,
    };

    const newLogs = [...logs, newLog];
    const isLast = currentExerciseIndex >= activeSession.exercises.length - 1;

    if (isLast) {
      set({ logs: newLogs, phase: 'complete' });
    } else {
      set({
        logs: newLogs,
        phase: 'rest',
        currentExerciseIndex: currentExerciseIndex + 1,
        pendingPainLevel: null,
        pendingTags: [],
        pendingNotes: '',
      });
    }
  },

  skipRest: () => set({ phase: 'exercise' }),

  restComplete: () => set({ phase: 'exercise' }),

  skipExercise: () => {
    const { activeSession, currentExerciseIndex, logs } = get();
    if (!activeSession) return;

    const ex = activeSession.exercises[currentExerciseIndex];
    const skippedLog: CompletedExerciseLog = {
      exerciseId: ex.exerciseId,
      painLevel: 2,   // neutral assumption for skipped
      feedbackTags: ['Skipped'],
    };

    const newLogs = [...logs, skippedLog];
    const isLast = currentExerciseIndex >= activeSession.exercises.length - 1;

    set({
      logs: newLogs,
      currentExerciseIndex: isLast ? currentExerciseIndex : currentExerciseIndex + 1,
      phase: isLast ? 'complete' : 'exercise',
    });
  },

  endSession: () => {
    const { activeSession, logs } = get();
    if (!activeSession) return null;

    const durationSecs = Math.round((Date.now() - activeSession.startedAt) / 1000);
    const avgPain = logs.length > 0
      ? logs.reduce((a, l) => a + l.painLevel, 0) / logs.length
      : 0;

    const adaptation = adaptSession(activeSession.plan, { logs });

    set(INITIAL);

    return { durationSecs, avgPain, logs, adaptation };
  },

  reset: () => set(INITIAL),
}));
