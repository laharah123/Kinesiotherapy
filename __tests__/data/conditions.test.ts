/**
 * Data-integrity tests for CONDITIONS / CONDITION_MAP.
 *
 * Validates structural correctness and cross-references to EXERCISE_MAP.
 * A condition whose exerciseIds reference a non-existent exercise would
 * produce silent runtime failures in plan generation.
 */

import { CONDITIONS, CONDITION_MAP } from '@/data/conditions';
import { EXERCISE_MAP } from '@/data/exercises';
import type { BodyArea } from '@/data/conditions';

// ---------------------------------------------------------------------------
// Valid enum values
// ---------------------------------------------------------------------------

const VALID_BODY_AREAS: BodyArea[] = [
  'back', 'neck', 'shoulder', 'wrist', 'knee', 'hip', 'foot', 'core', 'whole',
];

const VALID_TONE_COLORS = ['clay', 'sage', 'ochre', 'neutral'] as const;

const VALID_GLYPH_KINDS = [
  'arc', 'spine', 'wrist', 'neck', 'leaf', 'wave', 'dots', 'sun', 'check',
  'flame', 'circle',
] as const;

const VALID_EFFORT_LEVELS = ['Light', 'Moderate', 'Vigorous'] as const;

const VALID_DURATION_DAYS = [21, 28, 42] as const;

// ---------------------------------------------------------------------------
// Collection-level tests
// ---------------------------------------------------------------------------

describe('CONDITIONS collection', () => {
  it('exports at least 20 conditions', () => {
    expect(CONDITIONS.length).toBeGreaterThanOrEqual(20);
  });

  it('contains no duplicate IDs', () => {
    const ids = CONDITIONS.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('has a CONDITION_MAP entry for every condition', () => {
    for (const cond of CONDITIONS) {
      expect(CONDITION_MAP[cond.id]).toBe(cond);
    }
  });

  it('CONDITION_MAP has the same number of entries as CONDITIONS', () => {
    expect(Object.keys(CONDITION_MAP).length).toBe(CONDITIONS.length);
  });

  it('CONDITION_MAP keys match the corresponding condition id', () => {
    for (const [key, cond] of Object.entries(CONDITION_MAP)) {
      expect(key).toBe(cond.id);
    }
  });
});

// ---------------------------------------------------------------------------
// Per-condition field integrity
// ---------------------------------------------------------------------------

describe('each Condition has required fields', () => {
  test.each(CONDITIONS)('$id — id and name are non-empty strings', ({ id, name }) => {
    expect(typeof id).toBe('string');
    expect(id.trim().length).toBeGreaterThan(0);
    expect(typeof name).toBe('string');
    expect(name.trim().length).toBeGreaterThan(0);
  });

  test.each(CONDITIONS)('$id — filterTag is a valid BodyArea', ({ id, filterTag }) => {
    expect(VALID_BODY_AREAS as string[]).toContain(filterTag);
  });

  test.each(CONDITIONS)('$id — tone is a valid ToneColor', ({ id, tone }) => {
    expect(VALID_TONE_COLORS as readonly string[]).toContain(tone);
  });

  test.each(CONDITIONS)('$id — glyphKind is a valid GlyphKind', ({ id, glyphKind }) => {
    expect(VALID_GLYPH_KINDS as readonly string[]).toContain(glyphKind);
  });

  test.each(CONDITIONS)('$id — badgeText is a non-empty string', ({ id, badgeText }) => {
    expect(typeof badgeText).toBe('string');
    expect(badgeText.trim().length).toBeGreaterThan(0);
  });

  test.each(CONDITIONS)('$id — bodyRegions is a non-empty array', ({ id, bodyRegions }) => {
    expect(Array.isArray(bodyRegions)).toBe(true);
    expect(bodyRegions.length).toBeGreaterThan(0);
  });

  test.each(CONDITIONS)('$id — exerciseIds has at least 3 entries', ({ id, exerciseIds }) => {
    expect(Array.isArray(exerciseIds)).toBe(true);
    expect(exerciseIds.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Cross-reference: exerciseIds must exist in EXERCISE_MAP
// ---------------------------------------------------------------------------

describe('Condition exerciseIds reference valid exercises', () => {
  for (const cond of CONDITIONS) {
    describe(`condition "${cond.id}"`, () => {
      for (const exId of cond.exerciseIds) {
        it(`exerciseId "${exId}" exists in EXERCISE_MAP`, () => {
          expect(EXERCISE_MAP[exId]).toBeDefined();
        });
      }
    });
  }
});

// ---------------------------------------------------------------------------
// routineTemplate integrity
// ---------------------------------------------------------------------------

describe('routineTemplate validity', () => {
  test.each(CONDITIONS)('$id — durationDays is 21, 28, or 42', ({ id, routineTemplate }) => {
    expect(VALID_DURATION_DAYS as readonly number[]).toContain(routineTemplate.durationDays);
  });

  test.each(CONDITIONS)('$id — effort is Light, Moderate, or Vigorous', ({ id, routineTemplate }) => {
    expect(VALID_EFFORT_LEVELS as readonly string[]).toContain(routineTemplate.effort);
  });

  test.each(CONDITIONS)('$id — dailyMinutes > 0', ({ id, routineTemplate }) => {
    expect(routineTemplate.dailyMinutes).toBeGreaterThan(0);
  });

  test.each(CONDITIONS)('$id — exercisesPerSession >= 1', ({ id, routineTemplate }) => {
    expect(routineTemplate.exercisesPerSession).toBeGreaterThanOrEqual(1);
  });

  test.each(CONDITIONS)(
    '$id — exercisesPerSession <= exerciseIds.length (enough exercises to fill a session)',
    ({ id, exerciseIds, routineTemplate }) => {
      expect(routineTemplate.exercisesPerSession).toBeLessThanOrEqual(exerciseIds.length);
    },
  );

  test.each(CONDITIONS)('$id — title is a non-empty string', ({ id, routineTemplate }) => {
    expect(typeof routineTemplate.title).toBe('string');
    expect(routineTemplate.title.trim().length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Spot-check known condition IDs
// ---------------------------------------------------------------------------

describe('Spot-check known condition IDs', () => {
  const knownIds = [
    'low-back-pain',
    'sciatica',
    'tech-neck',
    'knee-oa',
    'plantar-fasciitis',
  ];

  test.each(knownIds)('%s is present in CONDITION_MAP', (id) => {
    expect(CONDITION_MAP[id]).toBeDefined();
    expect(CONDITION_MAP[id].id).toBe(id);
  });
});

// ---------------------------------------------------------------------------
// filterTag coverage — all expected body areas are represented
// ---------------------------------------------------------------------------

describe('filterTag area coverage', () => {
  const requiredAreas: BodyArea[] = ['back', 'neck', 'shoulder', 'wrist', 'knee', 'hip', 'foot', 'core'];

  for (const area of requiredAreas) {
    it(`at least one condition has filterTag "${area}"`, () => {
      const found = CONDITIONS.some((c) => c.filterTag === area);
      expect(found).toBe(true);
    });
  }
});
