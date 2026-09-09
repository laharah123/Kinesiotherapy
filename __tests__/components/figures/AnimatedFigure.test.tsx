import React from 'react';
import { render } from '@testing-library/react-native';
import {
  AnimatedFigure,
  ANIMATIONS,
  ANIMATION_KINDS,
  DEFAULT_ANIMATION_FOR_FIGURE,
  resolveAnimation,
  type AnimationKind,
  type FigureType,
  type FigurePose,
} from '@/components/figures/AnimatedFigure';
import { EXERCISES, EXERCISE_ANIMATIONS } from '@/data/exercises';

const VB_W = 200;
const VB_H = 160;
const PHASES = [0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1];

const FIGURE_TYPES: FigureType[] = [
  'bridge', 'supine', 'quadruped', 'standing',
  'seated', 'prone', 'sidelying', 'kneeling',
];

function joints(pose: FigurePose): [string, { x: number; y: number }][] {
  return [
    ['head', pose.head], ['shoulder', pose.shoulder], ['chest', pose.chest],
    ['pelvis', pose.pelvis], ['shoulderA', pose.shoulderA], ['shoulderB', pose.shoulderB],
    ['hipA', pose.hipA], ['hipB', pose.hipB],
    ['elbowA', pose.elbowA], ['handA', pose.handA],
    ['elbowB', pose.elbowB], ['handB', pose.handB],
    ['kneeA', pose.kneeA], ['ankleA', pose.ankleA], ['toeA', pose.toeA],
    ['kneeB', pose.kneeB], ['ankleB', pose.ankleB], ['toeB', pose.toeB],
  ];
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe('animation registry', () => {
  it('exposes every declared kind', () => {
    expect(ANIMATION_KINDS.length).toBeGreaterThanOrEqual(26);
    for (const kind of ANIMATION_KINDS) {
      expect(typeof ANIMATIONS[kind].pose).toBe('function');
      expect(typeof ANIMATIONS[kind].scene).toBe('string');
    }
  });

  it('includes the movements the exercise library relies on', () => {
    const required: AnimationKind[] = [
      'pelvicTilt', 'glutebridge', 'kneeToChest', 'deadBug', 'straightLegRaise',
      'catCow', 'birdDog', 'childsPose', 'mckenzieExtension', 'proneYTW',
      'clamshell', 'sideLegRaise', 'calfRaise', 'squat', 'wallSlide',
      'singleLegBalance', 'hipHinge', 'chinTuck', 'neckRotation', 'shoulderRoll',
      'wristFlexExtend', 'seatedHamstringStretch', 'hipFlexorStretch',
      'figureFourStretch', 'piriformisStretch', 'breathing',
    ];
    for (const kind of required) {
      expect(ANIMATIONS[kind]).toBeDefined();
    }
  });

  it('every kind is used by at least one exercise', () => {
    const used = new Set(EXERCISES.map((e) => e.animation));
    const unused = ANIMATION_KINDS.filter((k) => !used.has(k));
    expect(unused).toEqual([]);
  });
});

describe('pose geometry', () => {
  test.each(ANIMATION_KINDS)('%s keeps every joint inside the viewBox', (kind) => {
    for (const p of PHASES) {
      const pose = ANIMATIONS[kind].pose(p);
      for (const [name, pt] of joints(pose)) {
        expect(Number.isFinite(pt.x)).toBe(true);
        expect(Number.isFinite(pt.y)).toBe(true);
        if (pt.x < 0 || pt.x > VB_W || pt.y < 0 || pt.y > VB_H) {
          throw new Error(
            `${kind} @ phase ${p}: ${name} at (${pt.x.toFixed(1)}, ${pt.y.toFixed(1)}) is outside 0..${VB_W} x 0..${VB_H}`,
          );
        }
      }
    }
  });

  test.each(ANIMATION_KINDS)('%s keeps limbs attached to the torso', (kind) => {
    for (const p of PHASES) {
      const pose = ANIMATIONS[kind].pose(p);
      // Limb roots are derived from the torso ends, so they can never drift.
      expect(dist(pose.shoulderA, pose.shoulder)).toBeLessThanOrEqual(8.01);
      expect(dist(pose.shoulderB, pose.shoulder)).toBeLessThanOrEqual(8.01);
      expect(dist(pose.hipA, pose.pelvis)).toBeLessThanOrEqual(8.01);
      expect(dist(pose.hipB, pose.pelvis)).toBeLessThanOrEqual(8.01);
      // Head stays a neck length from the shoulder.
      expect(dist(pose.head, pose.shoulder)).toBeLessThanOrEqual(24);
    }
  });

  test.each(ANIMATION_KINDS)('%s actually moves across the cycle', (kind) => {
    const base = ANIMATIONS[kind].pose(0);
    const baseJoints = joints(base);
    const moved = PHASES.slice(1).some((p) => {
      const other = ANIMATIONS[kind].pose(p);
      if (Math.abs(other.breath - base.breath) > 0.05) return true;
      return joints(other).some((j, i) => dist(j[1], baseJoints[i][1]) > 1.5);
    });
    expect(moved).toBe(true);
  });
});

describe('figures rest on their scene', () => {
  // y of the surface each scene draws, so a figure cannot float or sink.
  const GROUND: Record<string, number> = {
    none: 160, mat: 142, roller: 142, floor: 136,
    wall: 136, doorway: 136, step: 120, chair: 142,
  };
  // These two deliberately drop a foot below the step edge.
  const DROPS_BELOW_SURFACE: AnimationKind[] = ['calfStretchStep', 'stepDown'];

  test.each(ANIMATION_KINDS)('%s touches its surface without sinking through it', (kind) => {
    const surface = GROUND[ANIMATIONS[kind].scene];
    let lowest = -Infinity;
    for (const p of PHASES) {
      for (const [, pt] of joints(ANIMATIONS[kind].pose(p))) {
        lowest = Math.max(lowest, pt.y);
      }
    }
    // Something has to reach the surface, otherwise the figure floats.
    expect(lowest).toBeGreaterThan(surface - 20);
    if (!DROPS_BELOW_SURFACE.includes(kind)) {
      expect(lowest).toBeLessThanOrEqual(surface + 3);
    }
  });

  test.each(ANIMATION_KINDS)('%s keeps the whole head inside the frame', (kind) => {
    for (const p of PHASES) {
      const pose = ANIMATIONS[kind].pose(p);
      expect(pose.head.y - pose.headR).toBeGreaterThanOrEqual(0);
      expect(pose.head.y + pose.headR).toBeLessThanOrEqual(VB_H);
      expect(pose.head.x - pose.headR).toBeGreaterThanOrEqual(0);
      expect(pose.head.x + pose.headR).toBeLessThanOrEqual(VB_W);
    }
  });
});

describe('cat-cow is a two-way motion', () => {
  it('bows the spine one way at 0.25 and the other at 0.75', () => {
    const cow = ANIMATIONS.catCow.pose(0.25);
    const cat = ANIMATIONS.catCow.pose(0.75);
    const neutral = ANIMATIONS.catCow.pose(0);
    expect(cow.chest.y).toBeGreaterThan(neutral.chest.y);
    expect(cat.chest.y).toBeLessThan(neutral.chest.y);
  });
});

describe('breathing', () => {
  it('expands the ribcage over the cycle', () => {
    expect(ANIMATIONS.breathing.pose(1).breath)
      .toBeGreaterThan(ANIMATIONS.breathing.pose(0).breath);
    expect(ANIMATIONS.diaphragmaticBreathing.pose(1).breath)
      .toBeGreaterThan(ANIMATIONS.diaphragmaticBreathing.pose(0).breath);
  });

  it('leaves the ribcage hidden on non-breathing movements', () => {
    expect(ANIMATIONS.calfRaise.pose(0.5).breath).toBe(0);
  });
});

describe('resolveAnimation', () => {
  it('prefers the explicit animation prop', () => {
    expect(resolveAnimation('squat', 'chin-tuck', 'seated', EXERCISE_ANIMATIONS)).toBe('squat');
  });

  it('uses the exercise mapping when one exists', () => {
    expect(resolveAnimation(undefined, 'bird-dog', 'standing', EXERCISE_ANIMATIONS)).toBe('birdDog');
  });

  it('falls back to the figureType default for an unknown exercise', () => {
    for (const ft of FIGURE_TYPES) {
      expect(resolveAnimation(undefined, 'not-a-real-exercise', ft, EXERCISE_ANIMATIONS))
        .toBe(DEFAULT_ANIMATION_FOR_FIGURE[ft]);
    }
  });

  it('falls back when no exerciseId is given at all', () => {
    expect(resolveAnimation(undefined, undefined, 'quadruped', EXERCISE_ANIMATIONS)).toBe('catCow');
  });
});

describe('AnimatedFigure rendering', () => {
  it('renders with no props at all', () => {
    expect(render(<AnimatedFigure/>).toJSON()).not.toBeNull();
  });

  test.each(FIGURE_TYPES)('renders figureType "%s"', (figureType) => {
    expect(render(<AnimatedFigure figureType={figureType}/>).toJSON()).not.toBeNull();
  });

  test.each(ANIMATION_KINDS)('renders animation "%s"', (animation) => {
    expect(render(<AnimatedFigure animation={animation}/>).toJSON()).not.toBeNull();
  });

  it('renders every exercise by id', () => {
    for (const ex of EXERCISES) {
      expect(render(<AnimatedFigure exerciseId={ex.id}/>).toJSON()).not.toBeNull();
    }
  });

  it('accepts the full contract prop set', () => {
    const { toJSON } = render(
      <AnimatedFigure
        figureType="standing"
        exerciseId="mini-squat"
        paused
        holding
        tempoMs={2500}
        accent="#ff0000"
        dark
        width={120}
        height={120}
      />,
    );
    expect(toJSON()).not.toBeNull();
  });

  it('applies explicit width and height to the wrapper', () => {
    const json: any = render(<AnimatedFigure width={140} height={90}/>).toJSON();
    expect(json.props.style).toMatchObject({ width: 140, height: 90 });
  });
});
