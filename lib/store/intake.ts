import { create } from 'zustand';
import type { BodyRegion } from '@/components/figures/BodyMap';
import type { IntakeAnswers, Plan } from '@/lib/routines';
import { generatePlan } from '@/lib/routines';

interface IntakeStore {
  // Step data
  selectedRegions: BodyRegion[];
  selectedCondition: string | null;
  answers: Partial<IntakeAnswers>;

  // Generated plan (set after questionnaire completes)
  generatedPlan: Plan | null;

  // Actions
  toggleRegion: (id: BodyRegion) => void;
  setCondition: (id: string | null) => void;
  setAnswer: <K extends keyof IntakeAnswers>(key: K, value: IntakeAnswers[K]) => void;
  submitQuestionnaire: () => Plan;
  reset: () => void;
}

const DEFAULT_ANSWERS: Partial<IntakeAnswers> = {
  painDuration: 'subacute',
  painIntensity: 2,
  aggravatingFactors: [],
  previousTreatment: [],
  goals: [],
};

export const useIntakeStore = create<IntakeStore>((set, get) => ({
  selectedRegions: [],
  selectedCondition: null,
  answers: { ...DEFAULT_ANSWERS },
  generatedPlan: null,

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
    set({ generatedPlan: plan });
    return plan;
  },

  reset: () =>
    set({
      selectedRegions: [],
      selectedCondition: null,
      answers: { ...DEFAULT_ANSWERS },
      generatedPlan: null,
    }),
}));
