/**
 * AnimatedFigure - a single jointed stick figure whose motion is described by
 * one keyframed pose function per exercise.
 *
 * Architecture
 *   - Exactly ONE shared value per mounted figure: `phase`, which runs
 *     0 -> 1 -> 0 over `tempoMs` with an ease in / ease out curve.
 *   - Every animation kind is a pure `(phase: number) => FigurePose` worklet.
 *     A pose is a full set of joint positions in a 200x160 viewBox, always
 *     built from the shared skeleton helpers below, so limbs can never detach
 *     from the torso.
 *   - The pose is computed once per frame in a single `useDerivedValue`
 *     worklet, and the generic `<Skeleton/>` reads it through a fixed set of
 *     animated props. There is no worklet-per-limb-per-kind.
 *
 * Contract props
 *   paused   - cancels the animation and keeps the current value
 *   holding  - drives phase to 1 and freezes there
 *   tempoMs  - duration of one full 0 -> 1 -> 0 cycle (default 4000)
 */

import React, { useEffect, useRef } from 'react';
import { View, type DimensionValue } from 'react-native';
import Svg, { Path, Circle, Line, Ellipse } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedProps,
  useReducedMotion,
  cancelAnimation,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '@/lib/tokens';
// data/exercises.ts imports only *types* from this file, so this stays a
// one-directional runtime edge rather than a cycle.
import { EXERCISE_ANIMATIONS } from '@/data/exercises';

const AnimatedPath    = Animated.createAnimatedComponent(Path);
const AnimatedCircle  = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

// ─── Public types ─────────────────────────────────────────────────────────────

/** Legacy posture buckets. Kept so existing screens keep compiling. */
export type FigureType =
  | 'bridge'
  | 'supine'
  | 'quadruped'
  | 'standing'
  | 'seated'
  | 'prone'
  | 'sidelying'
  | 'kneeling';

/** One distinct keyframed motion. Every exercise maps to exactly one. */
export type AnimationKind =
  // supine
  | 'pelvicTilt' | 'glutebridge' | 'kneeToChest' | 'deadBug' | 'straightLegRaise'
  | 'supineHamstringStretch' | 'figureFourStretch' | 'piriformisStretch'
  | 'heelSlide' | 'nerveFloss' | 'supineNod' | 'foamRollThoracic'
  | 'diaphragmaticBreathing'
  // quadruped
  | 'catCow' | 'birdDog' | 'threadTheNeedle'
  // kneeling
  | 'childsPose' | 'hipFlexorStretch'
  // prone
  | 'mckenzieExtension' | 'proneYTW'
  // side lying
  | 'clamshell' | 'sideLegRaise' | 'sideLyingRotation' | 'foamRollSide' | 'sidePlank'
  // standing
  | 'calfRaise' | 'squat' | 'wallSlide' | 'singleLegBalance' | 'hipHinge'
  | 'breathing' | 'shoulderRoll' | 'armPendulum' | 'shoulderExternalRotation'
  | 'crossBodyStretch' | 'chestOpener' | 'nerveGlideArm' | 'kneeExtension'
  | 'quadStretch' | 'calfStretchStep' | 'stepDown' | 'ankleDorsiflexion'
  // seated
  | 'chinTuck' | 'neckRotation' | 'neckSideBend' | 'seatedTwist'
  | 'seatedHipRotation' | 'seatedHamstringStretch' | 'wristFlexExtend'
  | 'scapularSqueeze' | 'ankleCircles' | 'plantarStretch' | 'pelvicFloorLift';

interface AnimatedFigureProps {
  figureType?: FigureType;
  /** When given, the exercise-specific animation is used. */
  exerciseId?: string;
  /** Explicit override, wins over exerciseId and figureType. */
  animation?: AnimationKind;
  /** Freeze the animation in place at its current value. */
  paused?: boolean;
  /** Hold the figure at the top of the movement (phase 1). */
  holding?: boolean;
  /** Duration in ms of one full rep cycle, so the figure matches the rep counter. */
  tempoMs?: number;
  accent?: string;
  dark?: boolean;
  width?: DimensionValue;
  height?: DimensionValue;
}

// ─── Geometry ─────────────────────────────────────────────────────────────────

interface Pt { x: number; y: number }

export interface FigurePose {
  head: Pt; headR: number;
  shoulder: Pt; chest: Pt; pelvis: Pt;
  shoulderA: Pt; shoulderB: Pt;
  hipA: Pt; hipB: Pt;
  elbowA: Pt; handA: Pt;
  elbowB: Pt; handB: Pt;
  kneeA: Pt; ankleA: Pt; toeA: Pt;
  kneeB: Pt; ankleB: Pt; toeB: Pt;
  /** Ribcage expansion, 0 hides the breath ellipse. */
  breath: number;
}

const THIGH = 30;
const SHIN  = 28;
const FOOT  = 12;
const UPPER = 20;
const FORE  = 18;
const TORSO = 36;
const NECK  = 6;
const HEAD_R = 11;

const MAT_Y   = 142;
const FLOOR_Y = 136;   // standing surface
const SEAT_FLOOR_Y = 142;   // floor under a chair, further back in the frame

function mix(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

/** Two-way easing helper: 0 -> 1 -> 0 mapped onto a single half sweep. */
function swing(p: number): number {
  'worklet';
  return p < 0.5 ? p * 2 : (1 - p) * 2;
}

function polar(o: Pt, deg: number, len: number): Pt {
  'worklet';
  const a = (deg * Math.PI) / 180;
  return { x: o.x + Math.cos(a) * len, y: o.y + Math.sin(a) * len };
}

function armChain(root: Pt, upperDeg: number, foreDeg: number) {
  'worklet';
  const elbow = polar(root, upperDeg, UPPER);
  return { elbow, hand: polar(elbow, foreDeg, FORE) };
}

function legChain(root: Pt, thighDeg: number, shinDeg: number, footDeg: number, thighLen: number, shinLen: number) {
  'worklet';
  const knee  = polar(root, thighDeg, thighLen);
  const ankle = polar(knee, shinDeg, shinLen);
  return { knee, ankle, toe: polar(ankle, footDeg, FOOT) };
}

/**
 * Builds a leg upward from a planted foot, returning the hip it implies plus
 * the equivalent downward angles, so a standing pose can keep its feet on the
 * ground while the hips travel.
 */
function grounded(footX: number, footY: number, shinUp: number, thighUp: number) {
  'worklet';
  const knee = polar({ x: footX, y: footY }, shinUp, SHIN);
  const hip  = polar(knee, thighUp, THIGH);
  return { hip, thigh: thighUp + 180, shin: shinUp + 180 };
}

interface PoseSpec {
  pelvis: Pt;
  /** Angle from pelvis toward the shoulder. -90 is straight up. */
  torsoA: number;
  /** Bow of the torso, measured perpendicular to it. Positive bows clockwise. */
  curve?: number;
  headA?: number;
  neckLen?: number;
  headR?: number;
  /** Perpendicular offset of the near / far limb roots. */
  spread?: number;
  torsoLen?: number;
  thighLen?: number;
  shinLen?: number;
  armA: readonly [number, number];
  armB?: readonly [number, number];
  legA: readonly [number, number, number];
  legB?: readonly [number, number, number];
  breath?: number;
}

function makePose(s: PoseSpec): FigurePose {
  'worklet';
  const spread   = s.spread ?? 7;
  const torsoLen = s.torsoLen ?? TORSO;
  const thighLen = s.thighLen ?? THIGH;
  const shinLen  = s.shinLen ?? SHIN;
  const headR    = s.headR ?? HEAD_R;

  const pelvis   = s.pelvis;
  const shoulder = polar(pelvis, s.torsoA, torsoLen);

  const a  = (s.torsoA * Math.PI) / 180;
  const px = -Math.sin(a);
  const py = Math.cos(a);
  const curve = s.curve ?? 0;

  const chest = {
    x: (pelvis.x + shoulder.x) / 2 + px * curve,
    y: (pelvis.y + shoulder.y) / 2 + py * curve,
  };
  const head = polar(shoulder, s.headA ?? s.torsoA, (s.neckLen ?? NECK) + headR);

  const shoulderA = { x: shoulder.x - px * spread, y: shoulder.y - py * spread };
  const shoulderB = { x: shoulder.x + px * spread, y: shoulder.y + py * spread };
  const hipA      = { x: pelvis.x - px * spread,   y: pelvis.y - py * spread };
  const hipB      = { x: pelvis.x + px * spread,   y: pelvis.y + py * spread };

  const armB = s.armB ?? s.armA;
  const legB = s.legB ?? s.legA;

  const aA = armChain(shoulderA, s.armA[0], s.armA[1]);
  const aB = armChain(shoulderB, armB[0], armB[1]);
  const lA = legChain(hipA, s.legA[0], s.legA[1], s.legA[2], thighLen, shinLen);
  const lB = legChain(hipB, legB[0], legB[1], legB[2], thighLen, shinLen);

  return {
    head, headR,
    shoulder, chest, pelvis,
    shoulderA, shoulderB, hipA, hipB,
    elbowA: aA.elbow, handA: aA.hand,
    elbowB: aB.elbow, handB: aB.hand,
    kneeA: lA.knee, ankleA: lA.ankle, toeA: lA.toe,
    kneeB: lB.knee, ankleB: lB.ankle, toeB: lB.toe,
    breath: s.breath ?? 0,
  };
}

// ─── Scenes (static furniture drawn behind the figure) ────────────────────────

export type SceneKind =
  | 'none' | 'mat' | 'floor' | 'chair' | 'wall' | 'step' | 'doorway' | 'roller';

// ─── Animation kinds ──────────────────────────────────────────────────────────

type PoseFn = (p: number) => FigurePose;

interface AnimationSpec { pose: PoseFn; scene: SceneKind }

const STAND_FOOT_Y  = 130;
const SUPINE_BODY_Y = 126;

// -- supine ------------------------------------------------------------------

const pelvicTilt: PoseFn = (p) => {
  'worklet';
  // Knees bent, pelvis rocks so the lumbar curve flattens onto the mat.
  return makePose({
    pelvis: { x: 118, y: SUPINE_BODY_Y - mix(0, 2, p) },
    torsoA: 180,
    curve: mix(7, -3, p),
    spread: 3,
    headA: 178,
    armA: [20, 5],
    legA: [mix(-35, -42, p), 62, 0],
    legB: [mix(-28, -35, p), 70, 0],
  });
};

const glutebridge: PoseFn = (p) => {
  'worklet';
  const lift = mix(0, 24, p);
  return makePose({
    pelvis: { x: 118, y: SUPINE_BODY_Y - lift },
    torsoA: mix(180, 200, p),
    curve: mix(4, -2, p),
    spread: 3,
    headA: 180,
    armA: [15, 2],
    legA: [mix(-40, -54, p), mix(58, 62, p), 0],
    legB: [mix(-34, -48, p), mix(64, 68, p), 0],
  });
};

const kneeToChest: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 122, y: SUPINE_BODY_Y },
    torsoA: 180,
    curve: 3,
    spread: 3,
    headA: 178,
    armA: [mix(20, -25, p), mix(5, -80, p)],
    armB: [25, 10],
    legA: [mix(-6, -80, p), mix(-4, -170, p), 0],
    legB: [-4, -2, 0],
  });
};

const deadBug: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 122, y: SUPINE_BODY_Y },
    torsoA: 180,
    curve: 2,
    spread: 3,
    headA: 178,
    armA: [mix(-88, -40, p), mix(-90, -20, p)],
    armB: [-92, -92],
    legA: [mix(-88, -30, p), mix(-2, -12, p), 0],
    legB: [-88, -4, 0],
  });
};

const straightLegRaise: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 120, y: SUPINE_BODY_Y },
    torsoA: 180,
    curve: 2,
    spread: 3,
    headA: 178,
    armA: [22, 6],
    legA: [mix(-4, -44, p), mix(-4, -44, p), mix(0, -40, p)],
    legB: [-46, 58, 0],
  });
};

const supineHamstringStretch: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 120, y: SUPINE_BODY_Y },
    torsoA: 180,
    curve: 2,
    spread: 3,
    headA: 178,
    armA: [mix(0, -50, p), mix(0, -78, p)],
    armB: [22, 6],
    legA: [mix(-30, -78, p), mix(-30, -80, p), mix(0, -60, p)],
    legB: [-4, -2, 0],
  });
};

const figureFourStretch: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 122, y: SUPINE_BODY_Y },
    torsoA: 180,
    curve: 3,
    spread: 3,
    headA: 178,
    armA: [mix(10, -35, p), mix(0, -84, p)],
    armB: [24, 8],
    legA: [mix(-40, -74, p), mix(30, -10, p), -30],
    legB: [mix(-46, -78, p), mix(56, 20, p), 0],
  });
};

const piriformisStretch: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 122, y: SUPINE_BODY_Y },
    torsoA: 180,
    curve: 3,
    spread: 3,
    headA: 178,
    armA: [mix(14, -20, p), mix(4, -70, p)],
    armB: [24, 8],
    legA: [mix(-42, -66, p), mix(24, -18, p), -34],
    legB: [-52, 62, 0],
  });
};

const heelSlide: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 118, y: SUPINE_BODY_Y },
    torsoA: 180,
    curve: 3,
    spread: 3,
    headA: 178,
    armA: [20, 5],
    legA: [mix(-6, -46, p), mix(-4, 56, p), 0],
    legB: [-46, 58, 0],
  });
};

const nerveFloss: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 122, y: SUPINE_BODY_Y },
    torsoA: 180,
    curve: 2,
    spread: 3,
    headA: 178,
    armA: [-30, -76],
    armB: [24, 8],
    legA: [-74, mix(-20, -74, p), mix(30, -40, p)],
    legB: [-4, -2, 0],
  });
};

const supineNod: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 118, y: SUPINE_BODY_Y },
    torsoA: 180,
    curve: 2,
    spread: 3,
    headA: mix(178, 196, p),
    armA: [20, 5],
    legA: [-42, 60, 0],
    legB: [-36, 66, 0],
  });
};

const foamRollThoracic: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 120, y: SUPINE_BODY_Y - 4 },
    torsoA: mix(186, 196, p),
    curve: mix(-2, -12, p),
    spread: 3,
    headA: mix(184, 205, p),
    armA: [mix(150, 120, p), mix(210, 200, p)],
    legA: [-44, 58, 0],
    legB: [-38, 64, 0],
  });
};

const diaphragmaticBreathing: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 118, y: SUPINE_BODY_Y },
    torsoA: 180,
    curve: mix(2, 8, p),
    spread: 3,
    headA: 178,
    armA: [30, 0],
    legA: [-42, 60, 0],
    legB: [-36, 66, 0],
    breath: mix(0.55, 1, p),
  });
};

// -- quadruped ---------------------------------------------------------------

const catCow: PoseFn = (p) => {
  'worklet';
  // Cow at phase 0.25 (belly drops), cat at phase 0.75 (spine rounds up).
  // sin is +1 at phase 0.25 (cow, belly drops) and -1 at 0.75 (cat, spine rounds).
  const s = Math.sin(p * 2 * Math.PI);
  return makePose({
    pelvis: { x: 134, y: 96 },
    torsoA: 180 - s * 4,
    curve: -s * 13,
    torsoLen: 54,
    headA: 180 + s * 26,
    neckLen: 8,
    spread: 4,
    armA: [90 + s * 3, 90],
    armB: [88 + s * 3, 90],
    legA: [92, 92, 0],
    legB: [90, 94, 0],
    thighLen: 20,
    shinLen: 18,
  });
};

const birdDog: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 134, y: 96 },
    torsoA: 180,
    curve: 1,
    torsoLen: 54,
    headA: 178,
    neckLen: 8,
    spread: 4,
    // Near arm reaches forward, far arm stays planted.
    armA: [mix(120, 176, p), mix(92, 176, p)],
    armB: [88, 90],
    // Near leg extends back, far leg stays planted.
    legA: [mix(80, 4, p), mix(92, 2, p), mix(0, 10, p)],
    legB: [92, 92, 0],
    thighLen: 20,
    shinLen: 18,
  });
};

const threadTheNeedle: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 134, y: 96 },
    torsoA: 180,
    curve: mix(2, 10, p),
    torsoLen: 54,
    headA: mix(178, 150, p),
    neckLen: 8,
    spread: 4,
    armA: [mix(90, 30, p), mix(90, 8, p)],
    armB: [88, 90],
    legA: [92, 92, 0],
    legB: [90, 94, 0],
    thighLen: 20,
    shinLen: 18,
  });
};

// -- kneeling ----------------------------------------------------------------

const childsPose: PoseFn = (p) => {
  'worklet';
  // The torso rotates the long way round (through -180) so the fold happens
  // forward over the knees rather than swinging out to the side.
  return makePose({
    pelvis: { x: 148, y: mix(100, 114, p) },
    torsoA: mix(-102, -186, p),
    curve: mix(0, -5, p),
    torsoLen: 44,
    headA: mix(-100, -180, p),
    neckLen: 7,
    spread: 4,
    armA: [mix(120, 182, p), mix(110, 182, p)],
    legA: [mix(150, 142, p), mix(80, -5, p), 0],
    legB: [mix(156, 148, p), mix(86, 0, p), 0],
    thighLen: 26,
    shinLen: 26,
  });
};

const hipFlexorStretch: PoseFn = (p) => {
  'worklet';
  // Half kneeling. Front shin vertical, back knee down, hips glide forward.
  return makePose({
    pelvis: { x: mix(96, 104, p), y: mix(110, 114, p) },
    torsoA: mix(-94, -88, p),
    curve: -2,
    torsoLen: 38,
    headA: mix(-92, -86, p),
    spread: 5,
    armA: [96, 92],
    armB: [88, 92],
    legA: [mix(6, -4, p), 88, 0],
    legB: [mix(122, 128, p), mix(172, 176, p), 180],
    thighLen: 28,
    shinLen: 26,
  });
};

// -- prone -------------------------------------------------------------------

const mckenzieExtension: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 122, y: 124 },
    torsoA: mix(184, 214, p),
    curve: mix(2, -10, p),
    torsoLen: 46,
    headA: mix(182, 226, p),
    neckLen: 8,
    spread: 4,
    armA: [mix(150, 96, p), mix(200, 84, p)],
    legA: [4, 2, -6],
    legB: [8, 4, -6],
    thighLen: 26,
    shinLen: 26,
  });
};

const proneYTW: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 122, y: 126 },
    torsoA: mix(182, 190, p),
    curve: mix(1, -4, p),
    torsoLen: 46,
    headA: mix(180, 198, p),
    neckLen: 8,
    spread: 5,
    armA: [mix(178, 200, p), mix(178, 212, p)],
    armB: [mix(176, 196, p), mix(176, 208, p)],
    legA: [4, 2, -6],
    legB: [8, 4, -6],
    thighLen: 26,
    shinLen: 26,
  });
};

// -- side lying --------------------------------------------------------------

const clamshell: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 114, y: 124 },
    torsoA: 178,
    curve: 3,
    spread: 3,
    headA: 176,
    armA: [-40, 6],
    armB: [30, 10],
    legA: [mix(-16, -48, p), mix(52, 26, p), 0],
    legB: [-14, 54, 0],
  });
};

const sideLegRaise: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 114, y: 124 },
    torsoA: 178,
    curve: 2,
    spread: 3,
    headA: 176,
    armA: [-44, 4],
    armB: [28, 8],
    legA: [mix(-2, -34, p), mix(-2, -34, p), mix(0, -30, p)],
    legB: [-2, -2, 0],
  });
};

const sideLyingRotation: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 114, y: 122 },
    torsoA: mix(178, 168, p),
    curve: mix(2, -6, p),
    spread: 3,
    headA: mix(176, 152, p),
    armA: [mix(-6, -110, p), mix(-4, -150, p)],
    armB: [-4, -2],
    legA: [-40, 58, 0],
    legB: [-34, 62, 0],
  });
};

const foamRollSide: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: mix(110, 122, p), y: 122 },
    torsoA: 176,
    curve: 2,
    spread: 3,
    headA: 174,
    armA: [-60, 30],
    armB: [-52, 26],
    legA: [-6, -4, 0],
    legB: [-24, 40, 0],
  });
};

const sidePlank: PoseFn = (p) => {
  'worklet';
  const lift = mix(0, 16, p);
  return makePose({
    pelvis: { x: 118, y: 126 - lift },
    torsoA: mix(176, 168, p),
    curve: 0,
    spread: 3,
    headA: mix(174, 166, p),
    armA: [mix(-30, -66, p), mix(20, 42, p)],
    armB: [10, 60],
    legA: [-4, 30, 0],
    legB: [2, 34, 0],
  });
};

// -- standing ----------------------------------------------------------------

const calfRaise: PoseFn = (p) => {
  'worklet';
  const lift = mix(0, 6, p);
  return makePose({
    pelvis: { x: 100, y: 76 - lift },
    torsoA: -90,
    armA: [100, 95],
    armB: [86, 90],
    legA: [90, 90, mix(0, 38, p)],
    legB: [90, 90, mix(0, 38, p)],
  });
};

const squat: PoseFn = (p) => {
  'worklet';
  const g = grounded(100, STAND_FOOT_Y, -90 + mix(0, 20, p), -90 - mix(0, 52, p));
  return makePose({
    pelvis: g.hip,
    torsoA: -90 + mix(0, 24, p),
    curve: -2,
    armA: [mix(100, 6, p), mix(95, 2, p)],
    armB: [mix(86, 4, p), mix(90, 0, p)],
    legA: [g.thigh, g.shin, 0],
  });
};

const hipHinge: PoseFn = (p) => {
  'worklet';
  const g = grounded(100, STAND_FOOT_Y, -90 - mix(0, 8, p), -90 + mix(0, 10, p));
  return makePose({
    pelvis: g.hip,
    torsoA: -90 + mix(0, 62, p),
    curve: -2,
    headA: -90 + mix(0, 56, p),
    armA: [mix(100, 84, p), mix(95, 86, p)],
    armB: [mix(86, 80, p), mix(90, 84, p)],
    legA: [g.thigh, g.shin, 0],
  });
};

const singleLegBalance: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 100, y: 74 },
    torsoA: -90 + mix(-2, 2, swing(p)),
    armA: [mix(120, 150, p), mix(120, 160, p)],
    armB: [mix(70, 40, p), mix(70, 30, p)],
    legA: [90, 90, 0],
    legB: [mix(70, 46, p), mix(110, 132, p), mix(0, -20, p)],
  });
};

const breathing: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 100, y: 74 },
    torsoA: -90,
    armA: [102, 96],
    armB: [84, 88],
    legA: [90, 90, 0],
    legB: [90, 90, 0],
    breath: mix(0.5, 1, p),
  });
};

const shoulderRoll: PoseFn = (p) => {
  'worklet';
  const a = p * 2 * Math.PI;
  const dy = -Math.cos(a) * 4;
  const dx = Math.sin(a) * 3;
  return makePose({
    pelvis: { x: 100, y: 74 },
    torsoA: -90,
    torsoLen: TORSO + dy,
    armA: [100 + dx, 95 + dx],
    armB: [86 + dx, 90 + dx],
    legA: [90, 90, 0],
    legB: [90, 90, 0],
  });
};

const armPendulum: PoseFn = (p) => {
  'worklet';
  const s = Math.sin(p * 2 * Math.PI);
  const g = grounded(100, STAND_FOOT_Y, -90, -90 + 6);
  return makePose({
    pelvis: g.hip,
    torsoA: -60,
    curve: -3,
    headA: -46,
    armA: [88 + s * 22, 90 + s * 22],
    armB: [70, 70],
    legA: [g.thigh, g.shin, 0],
  });
};

const shoulderExternalRotation: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 100, y: 74 },
    torsoA: -90,
    armA: [96, mix(-20, -60, p)],
    armB: [84, mix(-16, -54, p)],
    legA: [90, 90, 0],
    legB: [90, 90, 0],
  });
};

const crossBodyStretch: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 100, y: 74 },
    torsoA: -90,
    armA: [mix(40, 6, p), mix(30, 2, p)],
    armB: [mix(120, 150, p), mix(60, 20, p)],
    legA: [90, 90, 0],
    legB: [90, 90, 0],
  });
};

const chestOpener: PoseFn = (p) => {
  'worklet';
  const g = grounded(100, STAND_FOOT_Y, -90 - mix(2, 8, p), -90 + mix(2, 10, p));
  return makePose({
    pelvis: g.hip,
    torsoA: -90 - mix(0, 8, p),
    curve: 3,
    armA: [mix(-10, -30, p), mix(-70, -86, p)],
    armB: [mix(190, 210, p), mix(250, 266, p)],
    legA: [g.thigh, g.shin, 0],
  });
};

const nerveGlideArm: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 100, y: 74 },
    torsoA: -90,
    headA: -90 + mix(0, 22, p),
    armA: [mix(176, 182, p), mix(176, 200, p)],
    armB: [86, 90],
    legA: [90, 90, 0],
    legB: [90, 90, 0],
  });
};

const kneeExtension: PoseFn = (p) => {
  'worklet';
  const g = grounded(100, STAND_FOOT_Y, -90 + mix(9, 0, p), -90 - mix(14, 0, p));
  return makePose({
    pelvis: g.hip,
    torsoA: -90,
    armA: [104, 96],
    armB: [84, 88],
    legA: [g.thigh, g.shin, 0],
  });
};

const quadStretch: PoseFn = (p) => {
  'worklet';
  return makePose({
    pelvis: { x: 100, y: 74 },
    torsoA: -92,
    armA: [mix(120, 96, p), mix(120, 76, p)],
    armB: [70, 60],
    legA: [90, 90, 0],
    legB: [mix(96, 104, p), mix(96, -66, p), mix(0, -30, p)],
  });
};

const calfStretchStep: PoseFn = (p) => {
  'worklet';
  // Forefoot on the step edge (top at y = 120), the heel drops below it.
  return makePose({
    pelvis: { x: 116, y: mix(68, 76, p) },
    torsoA: -88,
    torsoLen: 32,
    thighLen: 26,
    shinLen: 24,
    armA: [mix(-16, -12, p), mix(-6, -2, p)],
    armB: [mix(-24, -20, p), mix(-14, -10, p)],
    legA: [mix(90, 96, p), mix(90, 96, p), mix(-6, 26, p)],
    legB: [mix(86, 92, p), mix(86, 92, p), mix(-4, 24, p)],
  });
};

const stepDown: PoseFn = (p) => {
  'worklet';
  // Standing on a step (top at y = 120); the free leg lowers toward the floor.
  return makePose({
    pelvis: { x: 112, y: mix(70, 80, p) },
    torsoA: -90 + mix(2, 16, p),
    curve: -2,
    torsoLen: 32,
    thighLen: 26,
    shinLen: 24,
    armA: [mix(96, 24, p), mix(92, 8, p)],
    armB: [mix(84, 16, p), mix(88, 2, p)],
    legA: [mix(90, 62, p), mix(90, 118, p), 0],
    legB: [mix(104, 128, p), mix(96, 92, p), 0],
  });
};

const ankleDorsiflexion: PoseFn = (p) => {
  'worklet';
  const g = grounded(96, STAND_FOOT_Y, -90 + mix(6, 26, p), -90 - mix(10, 30, p));
  return makePose({
    pelvis: g.hip,
    torsoA: -90 + mix(2, 8, p),
    curve: -2,
    armA: [mix(30, 12, p), mix(20, 4, p)],
    armB: [mix(150, 160, p), mix(120, 130, p)],
    legA: [g.thigh, g.shin, 0],
    legB: [mix(120, 128, p), mix(70, 62, p), 0],
  });
};

const wallSlide: PoseFn = (p) => {
  'worklet';
  // Back flat on the wall (drawn at x = 62), arms slide from W up to Y.
  return makePose({
    pelvis: { x: 86, y: 80 },
    torsoA: -90,
    headA: -94,
    armA: [mix(-118, -100, p), mix(-30, -92, p)],
    armB: [mix(-112, -96, p), mix(-24, -86, p)],
    legA: [92, 90, 0],
    legB: [90, 90, 0],
    shinLen: 26,
  });
};

// -- seated ------------------------------------------------------------------

const SEAT_PELVIS: Pt = { x: 82, y: 110 };

function seated(spec: Partial<PoseSpec> & { armA: readonly [number, number] }): FigurePose {
  'worklet';
  return makePose({
    pelvis: spec.pelvis ?? SEAT_PELVIS,
    torsoA: spec.torsoA ?? -88,
    curve: spec.curve ?? -2,
    torsoLen: spec.torsoLen ?? 38,
    headA: spec.headA,
    neckLen: spec.neckLen,
    headR: spec.headR,
    spread: spec.spread ?? 6,
    armA: spec.armA,
    armB: spec.armB,
    legA: spec.legA ?? [4, 88, 0],
    legB: spec.legB ?? [8, 86, 0],
    thighLen: spec.thighLen ?? 30,
    shinLen: spec.shinLen ?? 26,
    breath: spec.breath,
  });
}

const chinTuck: PoseFn = (p) => {
  'worklet';
  return seated({
    torsoA: -88,
    headA: mix(-64, -92, p),
    neckLen: mix(9, 5, p),
    armA: [70, 20],
    armB: [86, 26],
  });
};

const neckRotation: PoseFn = (p) => {
  'worklet';
  const s = Math.sin(p * 2 * Math.PI);
  return seated({
    headA: -88 + s * 5,
    neckLen: 7 - Math.abs(s) * 2,
    headR: HEAD_R - Math.abs(s) * 1.5,
    armA: [70, 20],
    armB: [86, 26],
  });
};

const neckSideBend: PoseFn = (p) => {
  'worklet';
  return seated({
    headA: mix(-88, -66, p),
    neckLen: 8,
    armA: [mix(70, -20, p), mix(20, -64, p)],
    armB: [86, 26],
  });
};

const seatedTwist: PoseFn = (p) => {
  'worklet';
  const s = Math.sin(p * 2 * Math.PI);
  return seated({
    torsoA: -88 + s * 3,
    curve: s * 4,
    headA: -88 + s * 14,
    armA: [30 - s * 30, 10 - s * 30],
    armB: [140 + s * 20, 160 + s * 20],
  });
};

const seatedHipRotation: PoseFn = (p) => {
  'worklet';
  const s = Math.sin(p * 2 * Math.PI);
  return seated({
    armA: [70, 20],
    armB: [86, 26],
    legA: [4 - s * 10, 88 - s * 18, s * 22],
    legB: [8, 86, 0],
  });
};

const seatedHamstringStretch: PoseFn = (p) => {
  'worklet';
  return seated({
    torsoA: mix(-88, -46, p),
    curve: mix(-2, 5, p),
    headA: mix(-88, -40, p),
    armA: [mix(40, 4, p), mix(20, 2, p)],
    armB: [mix(46, 8, p), mix(26, 4, p)],
    legA: [mix(4, -2, p), mix(88, 6, p), mix(0, -46, p)],
    legB: [8, 86, 0],
  });
};

const wristFlexExtend: PoseFn = (p) => {
  'worklet';
  return seated({
    armA: [10, mix(-8, 34, p)],
    armB: [mix(-14, -26, p), mix(16, -30, p)],
  });
};

const scapularSqueeze: PoseFn = (p) => {
  'worklet';
  return seated({
    torsoA: -88,
    curve: mix(2, -4, p),
    headA: mix(-84, -90, p),
    armA: [mix(30, 96, p), mix(-10, -64, p)],
    armB: [mix(24, 90, p), mix(-16, -70, p)],
  });
};

const ankleCircles: PoseFn = (p) => {
  'worklet';
  const a = p * 2 * Math.PI;
  return seated({
    armA: [70, 20],
    armB: [86, 26],
    legA: [-6, 40, Math.sin(a) * 70],
    legB: [8, 86, 0],
  });
};

const plantarStretch: PoseFn = (p) => {
  'worklet';
  return seated({
    torsoA: mix(-88, -70, p),
    curve: mix(-2, 3, p),
    headA: mix(-86, -62, p),
    armA: [mix(30, 44, p), mix(20, 56, p)],
    armB: [mix(36, 50, p), mix(26, 60, p)],
    legA: [-20, 40, mix(-30, -80, p)],
    legB: [8, 86, 0],
  });
};

const pelvicFloorLift: PoseFn = (p) => {
  'worklet';
  return seated({
    pelvis: { x: SEAT_PELVIS.x, y: SEAT_PELVIS.y - mix(0, 2, p) },
    torsoA: -88,
    curve: mix(0, -3, p),
    armA: [70, 20],
    armB: [86, 26],
    breath: mix(0.9, 0.4, p),
  });
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const ANIMATIONS: Record<AnimationKind, AnimationSpec> = {
  pelvicTilt:              { pose: pelvicTilt,              scene: 'mat' },
  glutebridge:             { pose: glutebridge,             scene: 'mat' },
  kneeToChest:             { pose: kneeToChest,             scene: 'mat' },
  deadBug:                 { pose: deadBug,                 scene: 'mat' },
  straightLegRaise:        { pose: straightLegRaise,        scene: 'mat' },
  supineHamstringStretch:  { pose: supineHamstringStretch,  scene: 'mat' },
  figureFourStretch:       { pose: figureFourStretch,       scene: 'mat' },
  piriformisStretch:       { pose: piriformisStretch,       scene: 'mat' },
  heelSlide:               { pose: heelSlide,               scene: 'mat' },
  nerveFloss:              { pose: nerveFloss,              scene: 'mat' },
  supineNod:               { pose: supineNod,               scene: 'mat' },
  foamRollThoracic:        { pose: foamRollThoracic,        scene: 'roller' },
  diaphragmaticBreathing:  { pose: diaphragmaticBreathing,  scene: 'mat' },

  catCow:                  { pose: catCow,                  scene: 'mat' },
  birdDog:                 { pose: birdDog,                 scene: 'mat' },
  threadTheNeedle:         { pose: threadTheNeedle,         scene: 'mat' },

  childsPose:              { pose: childsPose,              scene: 'mat' },
  hipFlexorStretch:        { pose: hipFlexorStretch,        scene: 'mat' },

  mckenzieExtension:       { pose: mckenzieExtension,       scene: 'mat' },
  proneYTW:                { pose: proneYTW,                scene: 'mat' },

  clamshell:               { pose: clamshell,               scene: 'mat' },
  sideLegRaise:            { pose: sideLegRaise,            scene: 'mat' },
  sideLyingRotation:       { pose: sideLyingRotation,       scene: 'mat' },
  foamRollSide:            { pose: foamRollSide,            scene: 'mat' },
  sidePlank:               { pose: sidePlank,               scene: 'mat' },

  calfRaise:               { pose: calfRaise,               scene: 'floor' },
  squat:                   { pose: squat,                   scene: 'floor' },
  wallSlide:               { pose: wallSlide,               scene: 'wall' },
  singleLegBalance:        { pose: singleLegBalance,        scene: 'floor' },
  hipHinge:                { pose: hipHinge,                scene: 'floor' },
  breathing:               { pose: breathing,               scene: 'floor' },
  shoulderRoll:            { pose: shoulderRoll,            scene: 'floor' },
  armPendulum:             { pose: armPendulum,             scene: 'floor' },
  shoulderExternalRotation:{ pose: shoulderExternalRotation, scene: 'floor' },
  crossBodyStretch:        { pose: crossBodyStretch,        scene: 'floor' },
  chestOpener:             { pose: chestOpener,             scene: 'doorway' },
  nerveGlideArm:           { pose: nerveGlideArm,           scene: 'floor' },
  kneeExtension:           { pose: kneeExtension,           scene: 'floor' },
  quadStretch:             { pose: quadStretch,             scene: 'floor' },
  calfStretchStep:         { pose: calfStretchStep,         scene: 'step' },
  stepDown:                { pose: stepDown,                scene: 'step' },
  ankleDorsiflexion:       { pose: ankleDorsiflexion,       scene: 'floor' },

  chinTuck:                { pose: chinTuck,                scene: 'chair' },
  neckRotation:            { pose: neckRotation,            scene: 'chair' },
  neckSideBend:            { pose: neckSideBend,            scene: 'chair' },
  seatedTwist:             { pose: seatedTwist,             scene: 'chair' },
  seatedHipRotation:       { pose: seatedHipRotation,       scene: 'chair' },
  seatedHamstringStretch:  { pose: seatedHamstringStretch,  scene: 'chair' },
  wristFlexExtend:         { pose: wristFlexExtend,         scene: 'chair' },
  scapularSqueeze:         { pose: scapularSqueeze,         scene: 'chair' },
  ankleCircles:            { pose: ankleCircles,            scene: 'chair' },
  plantarStretch:          { pose: plantarStretch,          scene: 'chair' },
  pelvicFloorLift:         { pose: pelvicFloorLift,         scene: 'chair' },
};

export const ANIMATION_KINDS = Object.keys(ANIMATIONS) as AnimationKind[];

/** Fallback when the exercise is unknown: derive from the legacy posture type. */
export const DEFAULT_ANIMATION_FOR_FIGURE: Record<FigureType, AnimationKind> = {
  bridge:    'glutebridge',
  supine:    'kneeToChest',
  quadruped: 'catCow',
  standing:  'calfRaise',
  seated:    'chinTuck',
  prone:     'mckenzieExtension',
  sidelying: 'clamshell',
  kneeling:  'childsPose',
};

// ─── Colours ──────────────────────────────────────────────────────────────────

function gc(color: string, dark: boolean) {
  return {
    body:   color,
    light:  dark ? 'rgba(255,255,255,0.35)' : COLORS.claySoft,
    mat:    dark ? 'rgba(255,255,255,0.18)' : COLORS.border,
    ground: dark ? 'rgba(255,255,255,0.09)' : COLORS.borderSoft,
  };
}

// ─── Scene layer ──────────────────────────────────────────────────────────────

function SceneLayer({ scene, c }: { scene: SceneKind; c: ReturnType<typeof gc> }) {
  switch (scene) {
    case 'mat':
      return <Line x1="10" y1={MAT_Y} x2="190" y2={MAT_Y} stroke={c.mat} strokeWidth="3" strokeLinecap="round"/>;
    case 'floor':
      return <Line x1="34" y1={FLOOR_Y} x2="166" y2={FLOOR_Y} stroke={c.mat} strokeWidth="3" strokeLinecap="round"/>;
    case 'roller':
      return (
        <>
          <Line x1="10" y1={MAT_Y} x2="190" y2={MAT_Y} stroke={c.mat} strokeWidth="3" strokeLinecap="round"/>
          <Circle cx="104" cy="122" r="9" fill="none" stroke={c.ground} strokeWidth="3"/>
        </>
      );
    case 'chair':
      return (
        <>
          <Line x1="30" y1={SEAT_FLOOR_Y} x2="170" y2={SEAT_FLOOR_Y} stroke={c.mat} strokeWidth="3" strokeLinecap="round"/>
          <Line x1="62" y1="118" x2="118" y2="118" stroke={c.ground} strokeWidth="4" strokeLinecap="round"/>
          <Line x1="64" y1="60" x2="64" y2="118" stroke={c.ground} strokeWidth="3" strokeLinecap="round"/>
          <Line x1="66" y1="118" x2="66" y2={SEAT_FLOOR_Y} stroke={c.ground} strokeWidth="2.5" strokeLinecap="round"/>
          <Line x1="114" y1="118" x2="114" y2={SEAT_FLOOR_Y} stroke={c.ground} strokeWidth="2.5" strokeLinecap="round"/>
        </>
      );
    case 'wall':
      return (
        <>
          <Line x1="62" y1="12" x2="62" y2={FLOOR_Y} stroke={c.mat} strokeWidth="3" strokeLinecap="round"/>
          <Line x1="62" y1={FLOOR_Y} x2="176" y2={FLOOR_Y} stroke={c.mat} strokeWidth="3" strokeLinecap="round"/>
        </>
      );
    case 'step':
      return (
        <>
          <Line x1="24" y1={MAT_Y} x2="176" y2={MAT_Y} stroke={c.mat} strokeWidth="3" strokeLinecap="round"/>
          <Line x1="96" y1="120" x2="176" y2="120" stroke={c.ground} strokeWidth="4" strokeLinecap="round"/>
          <Line x1="96" y1="120" x2="96" y2={MAT_Y} stroke={c.ground} strokeWidth="3" strokeLinecap="round"/>
        </>
      );
    case 'doorway':
      return (
        <>
          <Line x1="34" y1={FLOOR_Y} x2="176" y2={FLOOR_Y} stroke={c.mat} strokeWidth="3" strokeLinecap="round"/>
          <Line x1="54" y1="14" x2="54" y2={FLOOR_Y} stroke={c.ground} strokeWidth="3" strokeLinecap="round"/>
          <Line x1="150" y1="14" x2="150" y2={FLOOR_Y} stroke={c.ground} strokeWidth="3" strokeLinecap="round"/>
          <Line x1="54" y1="14" x2="150" y2="14" stroke={c.ground} strokeWidth="3" strokeLinecap="round"/>
        </>
      );
    default:
      return null;
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const FAR_OPACITY = 0.45;

function Skeleton({
  pose,
  scene,
  c,
}: {
  pose: Animated.SharedValue<FigurePose>;
  scene: SceneKind;
  c: ReturnType<typeof gc>;
}) {
  const torsoProps = useAnimatedProps(() => {
    'worklet';
    const v = pose.value;
    return { d: `M ${v.shoulder.x} ${v.shoulder.y} Q ${v.chest.x} ${v.chest.y} ${v.pelvis.x} ${v.pelvis.y}` };
  });
  const neckProps = useAnimatedProps(() => {
    'worklet';
    const v = pose.value;
    return { d: `M ${v.shoulder.x} ${v.shoulder.y} L ${v.head.x} ${v.head.y}` };
  });
  const headProps = useAnimatedProps(() => {
    'worklet';
    const v = pose.value;
    return { cx: v.head.x, cy: v.head.y, r: v.headR };
  });
  const shoulderDotProps = useAnimatedProps(() => {
    'worklet';
    const v = pose.value;
    return { cx: v.shoulder.x, cy: v.shoulder.y };
  });
  const hipDotProps = useAnimatedProps(() => {
    'worklet';
    const v = pose.value;
    return { cx: v.pelvis.x, cy: v.pelvis.y };
  });
  const armAProps = useAnimatedProps(() => {
    'worklet';
    const v = pose.value;
    return { d: `M ${v.shoulderA.x} ${v.shoulderA.y} L ${v.elbowA.x} ${v.elbowA.y} L ${v.handA.x} ${v.handA.y}` };
  });
  const armBProps = useAnimatedProps(() => {
    'worklet';
    const v = pose.value;
    return { d: `M ${v.shoulderB.x} ${v.shoulderB.y} L ${v.elbowB.x} ${v.elbowB.y} L ${v.handB.x} ${v.handB.y}` };
  });
  const legAProps = useAnimatedProps(() => {
    'worklet';
    const v = pose.value;
    return { d: `M ${v.hipA.x} ${v.hipA.y} L ${v.kneeA.x} ${v.kneeA.y} L ${v.ankleA.x} ${v.ankleA.y}` };
  });
  const legBProps = useAnimatedProps(() => {
    'worklet';
    const v = pose.value;
    return { d: `M ${v.hipB.x} ${v.hipB.y} L ${v.kneeB.x} ${v.kneeB.y} L ${v.ankleB.x} ${v.ankleB.y}` };
  });
  const footAProps = useAnimatedProps(() => {
    'worklet';
    const v = pose.value;
    return { d: `M ${v.ankleA.x} ${v.ankleA.y} L ${v.toeA.x} ${v.toeA.y}` };
  });
  const footBProps = useAnimatedProps(() => {
    'worklet';
    const v = pose.value;
    return { d: `M ${v.ankleB.x} ${v.ankleB.y} L ${v.toeB.x} ${v.toeB.y}` };
  });
  const breathProps = useAnimatedProps(() => {
    'worklet';
    const v = pose.value;
    const b = v.breath;
    return {
      cx: v.chest.x,
      cy: v.chest.y,
      rx: 12 + b * 5,
      ry: 12 + b * 5,
      opacity: b > 0 ? 0.55 : 0,
    };
  });

  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 160">
      <SceneLayer scene={scene} c={c}/>

      {/* far side limbs first, dimmed for depth */}
      <AnimatedPath animatedProps={legBProps}  stroke={c.body} strokeOpacity={FAR_OPACITY} strokeWidth="9"  fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <AnimatedPath animatedProps={footBProps} stroke={c.body} strokeOpacity={FAR_OPACITY} strokeWidth="5"  fill="none" strokeLinecap="round"/>
      <AnimatedPath animatedProps={armBProps}  stroke={c.body} strokeOpacity={FAR_OPACITY} strokeWidth="7"  fill="none" strokeLinecap="round" strokeLinejoin="round"/>

      {/* breath / ribcage */}
      <AnimatedEllipse animatedProps={breathProps} fill="none" stroke={c.light} strokeWidth="1.5" strokeDasharray="4 3"/>

      {/* torso and head */}
      <AnimatedPath animatedProps={torsoProps} stroke={c.body} strokeWidth="15" fill="none" strokeLinecap="round"/>
      <AnimatedPath animatedProps={neckProps}  stroke={c.body} strokeWidth="7"  fill="none" strokeLinecap="round"/>
      <AnimatedCircle animatedProps={headProps} fill={c.body}/>
      <AnimatedCircle animatedProps={shoulderDotProps} r="7.5" fill={c.body}/>
      <AnimatedCircle animatedProps={hipDotProps}      r="8"   fill={c.body}/>

      {/* near side limbs */}
      <AnimatedPath animatedProps={legAProps}  stroke={c.body} strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <AnimatedPath animatedProps={footAProps} stroke={c.body} strokeWidth="5.5" fill="none" strokeLinecap="round"/>
      <AnimatedPath animatedProps={armAProps}  stroke={c.body} strokeWidth="7.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

// ─── Phase driver ─────────────────────────────────────────────────────────────

const EASE = Easing.inOut(Easing.sin);
const STATIC_PHASE = 0.6;

function usePhase(tempoMs: number, paused: boolean, holding: boolean, reduced: boolean) {
  const phase = useSharedValue(reduced ? STATIC_PHASE : 0);
  const wasHolding = useRef(false);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(phase);
      phase.value = STATIC_PHASE;
      return;
    }
    if (paused) {
      // Keep whatever value the figure is currently showing.
      cancelAnimation(phase);
      return;
    }

    const half = Math.max(240, tempoMs / 2);

    if (holding) {
      wasHolding.current = true;
      phase.value = withTiming(1, { duration: Math.max(180, half * 0.6), easing: EASE });
      return;
    }

    const loop = withRepeat(
      withSequence(
        withTiming(1, { duration: half, easing: EASE }),
        withTiming(0, { duration: half, easing: EASE }),
      ),
      -1,
      false,
    );

    if (wasHolding.current) {
      // Coming out of a hold: finish the rep down to 0, then resume looping.
      wasHolding.current = false;
      phase.value = withSequence(withTiming(0, { duration: half, easing: EASE }), loop);
    } else {
      phase.value = loop;
    }

    return () => cancelAnimation(phase);
  }, [paused, holding, tempoMs, reduced, phase]);

  return phase;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function resolveAnimation(
  animation: AnimationKind | undefined,
  exerciseId: string | undefined,
  figureType: FigureType,
  lookup?: Record<string, AnimationKind | undefined>,
): AnimationKind {
  if (animation && ANIMATIONS[animation]) return animation;
  const fromExercise = exerciseId ? lookup?.[exerciseId] : undefined;
  if (fromExercise && ANIMATIONS[fromExercise]) return fromExercise;
  return DEFAULT_ANIMATION_FOR_FIGURE[figureType] ?? 'calfRaise';
}

export function AnimatedFigure({
  figureType = 'bridge',
  exerciseId,
  animation,
  paused = false,
  holding = false,
  tempoMs = 4000,
  accent,
  dark = false,
  width,
  height,
}: AnimatedFigureProps) {
  const color   = accent ?? COLORS.clay;
  const c       = gc(color, dark);
  const reduced = useReducedMotion();

  const kind = resolveAnimation(animation, exerciseId, figureType, EXERCISE_ANIMATIONS);
  const spec = ANIMATIONS[kind];
  const poseFn = spec.pose;

  const phase = usePhase(tempoMs, paused, holding, reduced);

  const pose = useDerivedValue<FigurePose>(() => {
    'worklet';
    return poseFn(phase.value);
  }, [poseFn]);

  return (
    <View style={{ width: width ?? '100%', height: height ?? '100%' }}>
      <Skeleton pose={pose} scene={spec.scene} c={c}/>
    </View>
  );
}
