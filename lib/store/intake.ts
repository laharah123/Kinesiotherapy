import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { BodyRegion } from '@/components/figures/BodyMap';
import type { DaySchedule, IntakeAnswers, Plan, PlanExercise, SessionAdaptation } from '@/lib/routines';
import { effortLabel, generatePlan } from '@/lib/routines';
import { updatePlanAdaptation } from '@/lib/supabase';
import {
  markDayCompleted,
  replaceDayExercises,
  updatePlanEffort,
  type LoadedPlan,
} from '@/lib/plans/api';
import { daysBetween, localDateString } from '@/lib/plans/dates';
import { persistStorage } from '@/lib/plans/storage';

/** What the UI needs to render "today" on the Home and Plan screens. */
export interface CurrentDay {
  day: number;
  isRest: boolean;
  exercises: PlanExercise[];
  completedToday: boolean;
}

interface IntakeStore {
  // Step data
  selectedRegions: BodyRegion[];
  selectedCondition: string | null;
  answers: Partial<IntakeAnswers>;

  // Generated plan (set after questionnaire completes)
  generatedPlan: Plan | null;
  // Supabase plan id once saved (null when offline / not yet saved)
  activePlanId: string | null;
  // Schedule days already completed (1-based day numbers)
  completedDays: number[];
  // Local YYYY-MM-DD the plan was started on
  planStartedAt: string | null;
  // Local YYYY-MM-DD of the most recently completed day
  lastCompletedOn: string | null;

  // Actions
  toggleRegion: (id: BodyRegion) => void;
  setCondition: (id: string | null) => void;
  setAnswer: <K extends keyof IntakeAnswers>(key: K, value: IntakeAnswers[K]) => void;
  submitQuestionnaire: () => Plan;
  /** Contract used by the session flow: which schedule day is "today". */
  getCurrentDay: () => CurrentDay | null;
  /** The next active day after everything completed so far, rest days skipped. */
  getNextActiveDay: () => CurrentDay | null;
  /** Contract used by the session flow after a session completes. */
  applyAdaptation: (adaptation: SessionAdaptation, completedDay: number) => void;
  setActivePlanId: (id: string | null) => void;
  setPlanStartedAt: (date: string | null) => void;
  /** Replaces the local plan with one loaded from Supabase. */
  hydrateFromRemote: (loaded: LoadedPlan) => void;
  reset: () => void;
}

/** No answer is pre-selected: every questionnaire step needs an explicit choice. */
const DEFAULT_ANSWERS: Partial<IntakeAnswers> = {
  aggravatingFactors: [],
  previousTreatment: [],
  goals: [],
};

const INITIAL = {
  selectedRegions: [] as BodyRegion[],
  selectedCondition: null as string | null,
  answers: { ...DEFAULT_ANSWERS },
  generatedPlan: null as Plan | null,
  activePlanId: null as string | null,
  completedDays: [] as number[],
  planStartedAt: null as string | null,
  lastCompletedOn: null as string | null,
};

function highestCompleted(completedDays: number[]): number {
  return completedDays.reduce((max, day) => (day > max ? day : max), 0);
}

function toCurrentDay(day: DaySchedule, completedToday: boolean): CurrentDay {
  return {
    day: day.day,
    isRest: day.isRest,
    exercises: day.exercises,
    completedToday,
  };
}

/**
 * Which schedule day the user is on. Exported so the rules can be unit tested
 * against a fixed "today" rather than the clock.
 *
 * Rules:
 *  - nothing completed yet: the first active day of the schedule;
 *  - a day completed today: that day, flagged `completedToday`;
 *  - otherwise: walk forward from the day after the highest completed one,
 *    consuming one rest day per calendar day that has passed since
 *    `lastCompletedOn`. Someone who finished day 5 on Friday therefore sees a
 *    rest day on Saturday and Sunday and day 8 on Monday, while someone who
 *    comes back a fortnight later lands straight on the next active day.
 */
export function computeCurrentDay(
  plan: Plan | null,
  completedDays: number[],
  lastCompletedOn: string | null,
  today: string,
): CurrentDay | null {
  if (!plan) return null;

  const highest = highestCompleted(completedDays);

  if (highest > 0 && lastCompletedOn === today) {
    const done = plan.schedule.find((d) => d.day === highest);
    if (done) return toCurrentDay(done, true);
  }

  // How many rest days the passing calendar has already used up. The first day
  // after a session is the day being offered, so only the days beyond it count.
  const elapsed   = lastCompletedOn ? daysBetween(lastCompletedOn, today) : 0;
  let   remaining = Math.max(0, elapsed - 1);

  let index = plan.schedule.findIndex((d) => d.day === highest + 1);
  if (index < 0) return null;

  while (index < plan.schedule.length && plan.schedule[index].isRest) {
    // Before the first completed day there is no rest to burn through: skip
    // any leading rest days so a new plan opens on a real session.
    if (highest === 0) { index++; continue; }
    if (remaining <= 0) break;
    remaining--;
    index++;
  }

  const day = plan.schedule[index];
  return day ? toCurrentDay(day, false) : null;
}

function nextActiveDayFor(plan: Plan | null, completedDays: number[]): CurrentDay | null {
  if (!plan) return null;
  const highest = highestCompleted(completedDays);
  const next = plan.schedule.find(
    (d) => d.day > highest && !d.isRest && !completedDays.includes(d.day),
  );
  return next ? toCurrentDay(next, false) : null;
}

export const useIntakeStore = create<IntakeStore>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      toggleRegion: (id) =>
        set((s) => ({
          selectedRegions: s.selectedRegions.includes(id)
            ? s.selectedRegions.filter((r) => r !== id)
            : [...s.selectedRegions, id],
        })),

      setCondition: (id) => set({ selectedCondition: id }),

      setAnswer: (key, value) =>
        set((s) => ({ answers: { ...s.answers, [key]: value } })),

      submitQuestionnaire: () => {
        const { selectedRegions, selectedCondition, answers } = get();
        const intake: IntakeAnswers = {
          conditionId: selectedCondition,
          bodyRegions: selectedRegions as string[],
          painDuration: answers.painDuration ?? 'subacute',
          painIntensity: answers.painIntensity ?? 2,
          aggravatingFactors: answers.aggravatingFactors ?? [],
          previousTreatment: answers.previousTreatment ?? [],
          goals: answers.goals ?? [],
        };
        const plan = generatePlan(intake);
        set({
          generatedPlan: plan,
          completedDays: [],
          lastCompletedOn: null,
          planStartedAt: localDateString(),
          activePlanId: null,
        });
        return plan;
      },

      getCurrentDay: () => {
        const { generatedPlan, completedDays, lastCompletedOn } = get();
        return computeCurrentDay(generatedPlan, completedDays, lastCompletedOn, localDateString());
      },

      getNextActiveDay: () => {
        const { generatedPlan, completedDays } = get();
        return nextActiveDayFor(generatedPlan, completedDays);
      },

      applyAdaptation: (adaptation, completedDay) => {
        const { generatedPlan, activePlanId, completedDays } = get();
        if (!generatedPlan) return;

        const schedule = generatedPlan.schedule.map((d) => ({ ...d }));
        const nextIdx  = schedule.findIndex((d) => !d.isRest && d.day > completedDay);
        const nextDay  = nextIdx >= 0 ? schedule[nextIdx].day : null;

        if (nextIdx >= 0 && adaptation.nextExercises.length > 0) {
          schedule[nextIdx] = { ...schedule[nextIdx], exercises: adaptation.nextExercises };
        }

        const nextCompleted = completedDays.includes(completedDay)
          ? completedDays
          : [...completedDays, completedDay].sort((a, b) => a - b);

        set({
          completedDays: nextCompleted,
          lastCompletedOn: localDateString(),
          generatedPlan: {
            ...generatedPlan,
            schedule,
            userTier: adaptation.newTier,
            painEMA: adaptation.painEMA,
            promotionStreak: adaptation.promotionStreak,
            demotionTrigger: adaptation.demotionTrigger,
            excludedExerciseIds: adaptation.excludedExerciseIds ?? generatedPlan.excludedExerciseIds,
            effort: effortLabel(adaptation.painEMA),
          },
        });

        if (!activePlanId) return;

        // Remote writes are best effort: the local plan stays correct offline.
        void (async () => {
          try {
            await updatePlanAdaptation(activePlanId, {
              user_tier:        adaptation.newTier,
              pain_ema:         adaptation.painEMA,
              promotion_streak: adaptation.promotionStreak,
              demotion_trigger: adaptation.demotionTrigger,
            });
            await updatePlanEffort(activePlanId, effortLabel(adaptation.painEMA));
            await markDayCompleted(activePlanId, completedDay);
            if (nextDay != null && adaptation.nextExercises.length > 0) {
              await replaceDayExercises(activePlanId, nextDay, adaptation.nextExercises);
            }
          } catch {
            // Offline or signed out: local state is still the source of truth.
          }
        })();
      },

      setActivePlanId: (id) => set({ activePlanId: id }),

      setPlanStartedAt: (date) => set({ planStartedAt: date }),

      hydrateFromRemote: (loaded) =>
        set({
          generatedPlan: loaded.plan,
          activePlanId: loaded.planId,
          completedDays: loaded.completedDays,
          planStartedAt: loaded.startedAt,
          lastCompletedOn: loaded.lastCompletedOn,
          selectedCondition: loaded.plan.conditionId,
        }),

      reset: () => set({ ...INITIAL, answers: { ...DEFAULT_ANSWERS } }),
    }),
    {
      name: 'kinesio-intake',
      storage: persistStorage<IntakeStore>(),
      partialize: (s) => ({
        selectedRegions: s.selectedRegions,
        selectedCondition: s.selectedCondition,
        answers: s.answers,
        generatedPlan: s.generatedPlan,
        activePlanId: s.activePlanId,
        completedDays: s.completedDays,
        planStartedAt: s.planStartedAt,
        lastCompletedOn: s.lastCompletedOn,
      }) as IntakeStore,
    },
  ),
);
