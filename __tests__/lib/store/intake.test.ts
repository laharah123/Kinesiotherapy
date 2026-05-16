import { useIntakeStore } from '@/lib/store/intake';
import type { BodyRegion } from '@/components/figures/BodyMap';
import type { IntakeAnswers } from '@/lib/routines';

// ─── Reset helpers ────────────────────────────────────────────────────────────

const DEFAULT_ANSWERS: Partial<IntakeAnswers> = {
  painDuration: 'subacute',
  painIntensity: 2,
  aggravatingFactors: [],
  previousTreatment: [],
  goals: [],
};

const INITIAL_STATE = {
  selectedRegions: [] as BodyRegion[],
  selectedCondition: null,
  answers: { ...DEFAULT_ANSWERS },
  generatedPlan: null,
};

function resetStore() {
  useIntakeStore.getState().reset();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(resetStore);

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

describe('useIntakeStore — submitQuestionnaire', () => {
  it('returns a Plan with an exercisePool', () => {
    useIntakeStore.getState().toggleRegion('lowBack');
    const plan = useIntakeStore.getState().submitQuestionnaire();

    expect(plan).toBeDefined();
    expect(Array.isArray(plan.exercisePool)).toBe(true);
    expect(plan.exercisePool.length).toBeGreaterThan(0);
  });

  it('returns a Plan with a schedule array', () => {
    useIntakeStore.getState().toggleRegion('lowBack');
    const plan = useIntakeStore.getState().submitQuestionnaire();

    expect(Array.isArray(plan.schedule)).toBe(true);
    expect(plan.schedule.length).toBeGreaterThan(0);
  });

  it('stores the generated plan in the store', () => {
    useIntakeStore.getState().toggleRegion('neck');
    const plan = useIntakeStore.getState().submitQuestionnaire();

    expect(useIntakeStore.getState().generatedPlan).toEqual(plan);
  });

  it('reflects selected body regions in the plan', () => {
    useIntakeStore.getState().toggleRegion('lowBack');
    const plan = useIntakeStore.getState().submitQuestionnaire();

    expect(plan.bodyRegions).toContain('lowBack');
  });

  it('reflects selected condition in the plan', () => {
    useIntakeStore.getState().setCondition('low-back-pain');
    const plan = useIntakeStore.getState().submitQuestionnaire();

    expect(plan.conditionId).toBe('low-back-pain');
  });

  it('works with no regions or condition (fallback pool)', () => {
    // Store is already reset; no regions/condition set
    const plan = useIntakeStore.getState().submitQuestionnaire();

    // generatePlan falls back to all tier-1 exercises
    expect(plan.exercisePool.length).toBeGreaterThan(0);
    expect(plan.schedule.length).toBeGreaterThan(0);
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

  it('restores default answers', () => {
    useIntakeStore.getState().setAnswer('painDuration', 'chronic');
    useIntakeStore.getState().reset();

    const { answers } = useIntakeStore.getState();
    expect(answers.painDuration).toBe('subacute');
    expect(answers.painIntensity).toBe(2);
  });
});
