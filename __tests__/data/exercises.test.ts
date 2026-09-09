/**
 * Data-integrity tests for EXERCISES / EXERCISE_MAP.
 *
 * These tests guard against accidental data corruption: missing fields,
 * invalid enum values, duplicate IDs, and out-of-range numeric defaults.
 * No mocks are required — all assertions operate on the exported constants.
 */

import { EXERCISES, EXERCISE_MAP, EXERCISE_ANIMATIONS } from '@/data/exercises';
import { CONDITIONS, CONDITION_MAP } from '@/data/conditions';
import { ANIMATIONS, ANIMATION_KINDS } from '@/components/figures/AnimatedFigure';
import { BODY_MAP_REGIONS } from '@/components/figures/BodyMap';

// ---------------------------------------------------------------------------
// Type constants for enum validation
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = ['mobility', 'strength', 'stretch', 'breathing'] as const;

const VALID_FIGURE_TYPES = [
  'bridge', 'supine', 'quadruped', 'standing',
  'seated', 'prone', 'sidelying', 'kneeling',
] as const;

const VALID_INTENSITY_TIERS = [1, 2, 3] as const;

// ---------------------------------------------------------------------------
// Collection-level tests
// ---------------------------------------------------------------------------

describe('EXERCISES collection', () => {
  it('exports at least 58 exercises so daily sessions stop repeating', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(58);
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

  test.each(EXERCISES)('$id — has an animation that the figure knows how to play', ({ id, animation }) => {
    expect(typeof animation).toBe('string');
    expect(ANIMATION_KINDS).toContain(animation);
    expect(ANIMATIONS[animation]).toBeDefined();
  });

  test.each(EXERCISES)('$id — every bodyRegion is a real BodyMap region', ({ id, bodyRegions }) => {
    const valid = new Set([...BODY_MAP_REGIONS.front, ...BODY_MAP_REGIONS.back]);
    for (const region of bodyRegions) {
      expect(valid.has(region as never)).toBe(true);
    }
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
  const count = (t: 1 | 2 | 3) => EXERCISES.filter((ex) => ex.intensityTier === t).length;

  it('is rebalanced roughly 24 / 18 / 8 rather than piling everything into tier 1', () => {
    expect(count(1)).toBeGreaterThanOrEqual(22);
    expect(count(1)).toBeLessThanOrEqual(34);
    expect(count(2)).toBeGreaterThanOrEqual(16);
    expect(count(2)).toBeLessThanOrEqual(26);
    expect(count(3)).toBeGreaterThanOrEqual(6);
    expect(count(3)).toBeLessThanOrEqual(13);
  });

  it('accounts for every exercise', () => {
    expect(count(1) + count(2) + count(3)).toBe(EXERCISES.length);
  });

  it('keeps tier 3 a minority', () => {
    expect(count(3)).toBeLessThan(EXERCISES.length / 2);
  });

  it('pins the anchor exercises the planner and its tests rely on', () => {
    expect(EXERCISE_MAP['pelvic-tilt'].intensityTier).toBe(1);
    expect(EXERCISE_MAP['glute-bridge'].intensityTier).toBe(2);
    expect(EXERCISE_MAP['bird-dog'].intensityTier).toBe(3);
    expect(EXERCISE_MAP['eccentric-calf-raise'].intensityTier).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Animation coverage
// ---------------------------------------------------------------------------

describe('Animation coverage', () => {
  it('EXERCISE_ANIMATIONS mirrors the animation on every exercise', () => {
    expect(Object.keys(EXERCISE_ANIMATIONS).length).toBe(EXERCISES.length);
    for (const ex of EXERCISES) {
      expect(EXERCISE_ANIMATIONS[ex.id]).toBe(ex.animation);
    }
  });

  it('uses a wide spread of animations rather than a handful of postures', () => {
    const distinct = new Set(EXERCISES.map((ex) => ex.animation));
    expect(distinct.size).toBeGreaterThanOrEqual(26);
  });

  it('never maps more than a quarter of the library onto one animation', () => {
    const tally = new Map<string, number>();
    for (const ex of EXERCISES) tally.set(ex.animation, (tally.get(ex.animation) ?? 0) + 1);
    for (const [kind, n] of tally) {
      if (n > EXERCISES.length / 4) {
        throw new Error(`${kind} is used by ${n} of ${EXERCISES.length} exercises`);
      }
    }
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
  test.each(EXERCISES)('$id — conditionIds is a non-empty array', ({ id, conditionIds }) => {
    expect(Array.isArray(conditionIds)).toBe(true);
    expect(conditionIds.length).toBeGreaterThan(0);
  });

  test.each(EXERCISES)('$id — every conditionId resolves to a real condition', ({ id, conditionIds }) => {
    for (const cid of conditionIds) {
      expect(CONDITION_MAP[cid]).toBeDefined();
    }
  });

  test.each(EXERCISES)('$id — the referenced conditions list this exercise back', ({ id, conditionIds }) => {
    for (const cid of conditionIds) {
      expect(CONDITION_MAP[cid].exerciseIds).toContain(id);
    }
  });

  it('has no orphan exercise: every exercise belongs to at least one condition pool', () => {
    const pooled = new Set(CONDITIONS.flatMap((c) => c.exerciseIds));
    const orphans = EXERCISES.filter((ex) => !pooled.has(ex.id)).map((ex) => ex.id);
    expect(orphans).toEqual([]);
  });
});
