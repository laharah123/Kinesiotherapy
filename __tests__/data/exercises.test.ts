/**
 * Data-integrity tests for EXERCISES / EXERCISE_MAP.
 *
 * These tests guard against accidental data corruption: missing fields,
 * invalid enum values, duplicate IDs, and out-of-range numeric defaults.
 * No mocks are required — all assertions operate on the exported constants.
 */

import { EXERCISES, EXERCISE_MAP } from '@/data/exercises';
import type { Exercise } from '@/data/exercises';

// ---------------------------------------------------------------------------
// Type constants for enum validation
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = ['mobility', 'strength', 'stretch', 'breathing'] as const;
type ValidCategory = typeof VALID_CATEGORIES[number];

const VALID_FIGURE_TYPES = [
  'bridge', 'supine', 'quadruped', 'standing',
  'seated', 'prone', 'sidelying', 'kneeling',
] as const;

const VALID_INTENSITY_TIERS = [1, 2, 3] as const;

// ---------------------------------------------------------------------------
// Collection-level tests
// ---------------------------------------------------------------------------

describe('EXERCISES collection', () => {
  it('exports at least 49 exercises', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(49);
  });

  it('contains no duplicate IDs', () => {
    const ids = EXERCISES.map((ex) => ex.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('has a EXERCISE_MAP entry for every exercise', () => {
    for (const ex of EXERCISES) {
      expect(EXERCISE_MAP[ex.id]).toBe(ex);
    }
  });

  it('EXERCISE_MAP has the same number of entries as EXERCISES', () => {
    expect(Object.keys(EXERCISE_MAP).length).toBe(EXERCISES.length);
  });

  it('EXERCISE_MAP keys match the corresponding exercise id', () => {
    for (const [key, ex] of Object.entries(EXERCISE_MAP)) {
      expect(key).toBe(ex.id);
    }
  });
});

// ---------------------------------------------------------------------------
// Per-exercise field integrity
// ---------------------------------------------------------------------------

describe('each Exercise has required fields', () => {
  test.each(EXERCISES)('$id — id and name are non-empty strings', ({ id, name }) => {
    expect(typeof id).toBe('string');
    expect(id.trim().length).toBeGreaterThan(0);
    expect(typeof name).toBe('string');
    expect(name.trim().length).toBeGreaterThan(0);
  });

  test.each(EXERCISES)('$id — category is a valid value', ({ id, category }) => {
    expect(VALID_CATEGORIES as readonly string[]).toContain(category);
  });

  test.each(EXERCISES)('$id — intensityTier is 1, 2, or 3', ({ id, intensityTier }) => {
    expect(VALID_INTENSITY_TIERS as readonly number[]).toContain(intensityTier);
  });

  test.each(EXERCISES)('$id — figureType is one of the 8 valid posture types', ({ id, figureType }) => {
    expect(VALID_FIGURE_TYPES as readonly string[]).toContain(figureType);
  });

  test.each(EXERCISES)('$id — instructions is a 4-element tuple of non-empty strings', ({ id, instructions }) => {
    expect(Array.isArray(instructions)).toBe(true);
    expect(instructions.length).toBe(4);
    for (const step of instructions) {
      expect(typeof step).toBe('string');
      expect(step.trim().length).toBeGreaterThan(0);
    }
  });

  test.each(EXERCISES)('$id — therapistCue is a non-empty string', ({ id, therapistCue }) => {
    expect(typeof therapistCue).toBe('string');
    expect(therapistCue.trim().length).toBeGreaterThan(0);
  });

  test.each(EXERCISES)('$id — bodyRegions is a non-empty array', ({ id, bodyRegions }) => {
    expect(Array.isArray(bodyRegions)).toBe(true);
    expect(bodyRegions.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Numeric defaults
// ---------------------------------------------------------------------------

describe('Exercise numeric defaults', () => {
  test.each(EXERCISES)('$id — defaultReps >= 1', ({ id, defaultReps }) => {
    expect(defaultReps).toBeGreaterThanOrEqual(1);
  });

  test.each(EXERCISES)('$id — defaultSets >= 1', ({ id, defaultSets }) => {
    expect(defaultSets).toBeGreaterThanOrEqual(1);
  });

  test.each(EXERCISES)('$id — defaultHoldSeconds >= 0', ({ id, defaultHoldSeconds }) => {
    expect(defaultHoldSeconds).toBeGreaterThanOrEqual(0);
  });

  test.each(EXERCISES)('$id — defaultRestSeconds >= 0', ({ id, defaultRestSeconds }) => {
    expect(defaultRestSeconds).toBeGreaterThanOrEqual(0);
  });

  test.each(EXERCISES)('$id — durationEstimateSecs > 0', ({ id, durationEstimateSecs }) => {
    expect(durationEstimateSecs).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Tier distribution sanity checks
// ---------------------------------------------------------------------------

describe('Tier distribution', () => {
  it('has tier-1 exercises (always accessible without promotion)', () => {
    const tier1 = EXERCISES.filter((ex) => ex.intensityTier === 1);
    expect(tier1.length).toBeGreaterThan(0);
  });

  it('has tier-2 exercises', () => {
    const tier2 = EXERCISES.filter((ex) => ex.intensityTier === 2);
    expect(tier2.length).toBeGreaterThan(0);
  });

  it('has tier-3 exercises', () => {
    const tier3 = EXERCISES.filter((ex) => ex.intensityTier === 3);
    expect(tier3.length).toBeGreaterThan(0);
  });

  it('most exercises are tier-1 or tier-2 (tier-3 should be a minority)', () => {
    const tier3 = EXERCISES.filter((ex) => ex.intensityTier === 3);
    expect(tier3.length).toBeLessThan(EXERCISES.length / 2);
  });
});

// ---------------------------------------------------------------------------
// Known-ID spot checks (regression guards)
// ---------------------------------------------------------------------------

describe('Spot-check known exercise IDs exist in EXERCISE_MAP', () => {
  const knownIds = [
    'pelvic-tilt',
    'cat-cow',
    'glute-bridge',
    'bird-dog',
    'dead-bug',
    'chin-tuck',
    'clamshell',
    'single-leg-balance',
    'eccentric-calf-raise',
  ];

  test.each(knownIds)('%s is present in EXERCISE_MAP', (id) => {
    expect(EXERCISE_MAP[id]).toBeDefined();
    expect(EXERCISE_MAP[id].id).toBe(id);
  });
});

// ---------------------------------------------------------------------------
// Category coverage — at least one exercise of each category
// ---------------------------------------------------------------------------

describe('Category coverage', () => {
  for (const cat of VALID_CATEGORIES) {
    it(`has at least one "${cat}" exercise`, () => {
      const found = EXERCISES.some((ex) => ex.category === cat);
      expect(found).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// conditionIds back-reference (structural, not cross-file)
// ---------------------------------------------------------------------------

describe('conditionIds field', () => {
  test.each(EXERCISES)('$id — conditionIds is an array', ({ id, conditionIds }) => {
    expect(Array.isArray(conditionIds)).toBe(true);
  });
});
