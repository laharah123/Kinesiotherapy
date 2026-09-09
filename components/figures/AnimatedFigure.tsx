/**
 * Animated exercise figures — one per posture type.
 * Each figure uses Reanimated 3 to drive SVG attribute animations
 * via useAnimatedProps. Phase (0→1) drives every motion.
 *
 * Posture types:
 *   bridge    — supine hip lift (glute bridge, pelvic tilt variations)
 *   supine    — lying flat, knee-to-chest / SLR / dead bug
 *   quadruped — on all fours, cat–cow spine arch / bird-dog extension
 *   standing  — upright, calf raise / squat / balance
 *   seated    — seated, chin-tuck / neck retraction / wrist stretch
 *   prone     — face-down, McKenzie extension / Y-T-W lift
 *   sidelying — side-lying, clamshell / hip abduction
 *   kneeling  — kneeling, child's pose forward fold
 */

import React, { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Svg, { Path, Circle, Line, Ellipse } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { COLORS } from '@/lib/tokens';

// ─── Animated SVG primitives ─────────────────────────────────────────────────
const AnimatedPath    = Animated.createAnimatedComponent(Path);
const AnimatedCircle  = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

// ─── Types ────────────────────────────────────────────────────────────────────
export type FigureType =
  | 'bridge'
  | 'supine'
  | 'quadruped'
  | 'standing'
  | 'seated'
  | 'prone'
  | 'sidelying'
  | 'kneeling';

interface FigureProps {
  phase: Animated.SharedValue<number>;
  color: string;
  dark?: boolean;
}

interface AnimatedFigureProps {
  figureType?: FigureType;
  accent?: string;
  dark?: boolean;
  width?: DimensionValue;
  height?: DimensionValue;
}

// ─── Color helper ─────────────────────────────────────────────────────────────
function gc(color: string, dark: boolean) {
  return {
    body:   color,
    light:  dark ? 'rgba(255,255,255,0.35)' : COLORS.claySoft,
    mat:    dark ? 'rgba(255,255,255,0.18)' : COLORS.border,
    ground: dark ? 'rgba(255,255,255,0.09)' : COLORS.borderSoft,
  };
}

// ─── BRIDGE (supine hip lift) ─────────────────────────────────────────────────
// ViewBox 200×140.  Mat at y=102.  Head left, feet right.
// Phase 0 = flat, Phase 1 = full bridge (hips 36 px up).
function BridgeFigure({ phase, color, dark = false }: FigureProps) {
  const c = gc(color, dark);

  const torsoProps = useAnimatedProps(() => {
    'worklet';
    const hy = 88 - phase.value * 36;
    return { d: `M 56 88 Q 78 ${hy - 6} 100 ${hy}` };
  });
  const thighProps = useAnimatedProps(() => {
    'worklet';
    const hy = 88 - phase.value * 36;
    return { d: `M 100 ${hy} L 132 98` };
  });
  const hipProps = useAnimatedProps(() => {
    'worklet';
    return { cy: 88 - phase.value * 36 };
  });
  const breathProps = useAnimatedProps(() => {
    'worklet';
    const hy = 88 - phase.value * 36;
    return { d: `M 56 70 Q 100 ${hy - 20} 100 ${hy - 12}` };
  });

  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 140">
      {/* mat */}
      <Line x1="8" y1="103" x2="192" y2="103" stroke={c.mat} strokeWidth="3" strokeLinecap="round"/>
      {/* head */}
      <Circle cx="26" cy="84" r="12" fill={c.body}/>
      {/* neck */}
      <Line x1="38" y1="84" x2="48" y2="86" stroke={c.body} strokeWidth="7" strokeLinecap="round"/>
      {/* upper arm + forearm */}
      <Line x1="60" y1="90" x2="74" y2="100" stroke={c.body} strokeWidth="6" strokeLinecap="round"/>
      <Line x1="74" y1="100" x2="92" y2="100" stroke={c.body} strokeWidth="5" strokeLinecap="round"/>
      {/* torso (animated) */}
      <AnimatedPath animatedProps={torsoProps} stroke={c.body} strokeWidth="14" fill="none" strokeLinecap="round"/>
      {/* hip dot (animated) */}
      <AnimatedCircle animatedProps={hipProps} cx={100} r={9} fill={c.body}/>
      {/* upper thigh (animated) */}
      <AnimatedPath animatedProps={thighProps} stroke={c.body} strokeWidth="10" fill="none" strokeLinecap="round"/>
      {/* shin (fixed — feet planted) */}
      <Line x1="132" y1="98" x2="158" y2="100" stroke={c.body} strokeWidth="8" strokeLinecap="round"/>
      {/* foot */}
      <Line x1="158" y1="100" x2="174" y2="100" stroke={c.body} strokeWidth="5" strokeLinecap="round"/>
      {/* breath arc (dashed) */}
      <AnimatedPath animatedProps={breathProps} stroke={c.light} strokeWidth="1.5" strokeDasharray="4 3" fill="none"/>
    </Svg>
  );
}

// ─── SUPINE (lying flat, knee-to-chest) ───────────────────────────────────────
// Phase 0 = legs flat, Phase 1 = top knee pulled to chest.
function SupineFigure({ phase, color, dark = false }: FigureProps) {
  const c = gc(color, dark);

  const thighProps = useAnimatedProps(() => {
    'worklet';
    const kx = interpolate(phase.value, [0, 1], [148, 88]);
    const ky = interpolate(phase.value, [0, 1], [98, 72]);
    return { d: `M 108 92 L ${kx} ${ky}` };
  });
  const shinProps = useAnimatedProps(() => {
    'worklet';
    const kx = interpolate(phase.value, [0, 1], [148, 88]);
    const ky = interpolate(phase.value, [0, 1], [98, 72]);
    const fx = interpolate(phase.value, [0, 1], [172, 104]);
    const fy = interpolate(phase.value, [0, 1], [100, 80]);
    return { d: `M ${kx} ${ky} L ${fx} ${fy}` };
  });

  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 140">
      <Line x1="8" y1="103" x2="192" y2="103" stroke={c.mat} strokeWidth="3" strokeLinecap="round"/>
      <Circle cx="24" cy="85" r="12" fill={c.body}/>
      <Line x1="36" y1="85" x2="47" y2="87" stroke={c.body} strokeWidth="7" strokeLinecap="round"/>
      <Line x1="47" y1="87" x2="108" y2="90" stroke={c.body} strokeWidth="14" strokeLinecap="round"/>
      {/* arms at sides */}
      <Line x1="62" y1="93" x2="76" y2="102" stroke={c.body} strokeWidth="6" strokeLinecap="round"/>
      <Line x1="76" y1="102" x2="94" y2="102" stroke={c.body} strokeWidth="5" strokeLinecap="round"/>
      {/* bottom (resting) leg */}
      <Line x1="108" y1="92" x2="146" y2="100" stroke={c.body} strokeWidth="9" strokeLinecap="round"/>
      <Line x1="146" y1="100" x2="170" y2="100" stroke={c.body} strokeWidth="7" strokeLinecap="round"/>
      <Line x1="170" y1="100" x2="184" y2="100" stroke={c.body} strokeWidth="4" strokeLinecap="round"/>
      {/* active (top) leg — animated */}
      <AnimatedPath animatedProps={thighProps} stroke={c.body} strokeWidth="9" fill="none" strokeLinecap="round"/>
      <AnimatedPath animatedProps={shinProps}  stroke={c.body} strokeWidth="7" fill="none" strokeLinecap="round"/>
    </Svg>
  );
}

// ─── QUADRUPED (cat–cow spine arch / bird-dog extension) ──────────────────────
// Phase 0 = neutral flat back, Phase 1 = cat (spine arched up).
function QuadrupedFigure({ phase, color, dark = false }: FigureProps) {
  const c = gc(color, dark);

  const spineProps = useAnimatedProps(() => {
    'worklet';
    const apex = interpolate(phase.value, [0, 1], [68, 44]);
    return { d: `M 54 74 Q 100 ${apex} 146 74` };
  });
  const armProps = useAnimatedProps(() => {
    'worklet';
    const ex = interpolate(phase.value, [0, 0.5, 1], [54, 34, 34]);
    const ey = interpolate(phase.value, [0, 0.5, 1], [74, 68, 68]);
    return { d: `M 54 74 L ${ex} ${ey}` };
  });
  const rearLegProps = useAnimatedProps(() => {
    'worklet';
    const ex = interpolate(phase.value, [0, 0.5, 1], [146, 168, 168]);
    const ey = interpolate(phase.value, [0, 0.5, 1], [74, 68, 68]);
    return { d: `M 146 74 L ${ex} ${ey}` };
  });

  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 140">
      <Line x1="16" y1="106" x2="184" y2="106" stroke={c.mat} strokeWidth="3" strokeLinecap="round"/>
      {/* head */}
      <Circle cx="38" cy="66" r="11" fill={c.body}/>
      <Line x1="49" y1="68" x2="54" y2="74" stroke={c.body} strokeWidth="7" strokeLinecap="round"/>
      {/* spine (animated) */}
      <AnimatedPath animatedProps={spineProps} stroke={c.body} strokeWidth="13" fill="none" strokeLinecap="round"/>
      {/* hip */}
      <Circle cx="146" cy="74" r="10" fill={c.body}/>
      {/* front arm (animated — extends) */}
      <AnimatedPath animatedProps={armProps} stroke={c.body} strokeWidth="7" fill="none" strokeLinecap="round"/>
      <Line x1="34" y1="68" x2="34" y2="92" stroke={c.body} strokeWidth="6" strokeLinecap="round"/>
      {/* rear arm (down) */}
      <Line x1="54" y1="74" x2="54" y2="92" stroke={c.body} strokeWidth="7" strokeLinecap="round"/>
      {/* rear leg (down) */}
      <Line x1="146" y1="74" x2="146" y2="92" stroke={c.body} strokeWidth="7" strokeLinecap="round"/>
      {/* back leg (animated — extends) */}
      <AnimatedPath animatedProps={rearLegProps} stroke={c.body} strokeWidth="7" fill="none" strokeLinecap="round"/>
      <Line x1="168" y1="68" x2="168" y2="92" stroke={c.body} strokeWidth="6" strokeLinecap="round"/>
      {/* hands / knees */}
      <Line x1="28" y1="92" x2="40" y2="92" stroke={c.body} strokeWidth="4" strokeLinecap="round"/>
      <Line x1="48" y1="92" x2="62" y2="92" stroke={c.body} strokeWidth="4" strokeLinecap="round"/>
      <Line x1="140" y1="92" x2="154" y2="92" stroke={c.body} strokeWidth="4" strokeLinecap="round"/>
      <Line x1="162" y1="92" x2="176" y2="92" stroke={c.body} strokeWidth="4" strokeLinecap="round"/>
    </Svg>
  );
}

// ─── STANDING (calf raise / heel lift) ───────────────────────────────────────
// Phase 0 = flat-footed, Phase 1 = up on toes.
function StandingFigure({ phase, color, dark = false }: FigureProps) {
  const c = gc(color, dark);

  const leftLegProps = useAnimatedProps(() => {
    'worklet';
    const ay = interpolate(phase.value, [0, 1], [126, 118]);
    const hy = interpolate(phase.value, [0, 1], [132, 124]);
    return { d: `M 87 114 L 82 ${ay} L 76 ${hy}` };
  });
  const rightLegProps = useAnimatedProps(() => {
    'worklet';
    const ay = interpolate(phase.value, [0, 1], [126, 118]);
    const hy = interpolate(phase.value, [0, 1], [132, 124]);
    return { d: `M 113 114 L 118 ${ay} L 124 ${hy}` };
  });
  const leftArmProps = useAnimatedProps(() => {
    'worklet';
    const ey = interpolate(phase.value, [0, 1], [98, 90]);
    return { d: `M 86 74 L 70 ${ey}` };
  });
  const rightArmProps = useAnimatedProps(() => {
    'worklet';
    const ey = interpolate(phase.value, [0, 1], [98, 90]);
    return { d: `M 114 74 L 130 ${ey}` };
  });

  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 160">
      <Line x1="40" y1="134" x2="160" y2="134" stroke={c.mat} strokeWidth="3" strokeLinecap="round"/>
      <Circle cx="100" cy="28" r="15" fill={c.body}/>
      <Line x1="100" y1="43" x2="100" y2="54" stroke={c.body} strokeWidth="8" strokeLinecap="round"/>
      <Line x1="100" y1="54" x2="100" y2="114" stroke={c.body} strokeWidth="18" strokeLinecap="round"/>
      <AnimatedPath animatedProps={leftArmProps}  stroke={c.body} strokeWidth="8"  fill="none" strokeLinecap="round"/>
      <AnimatedPath animatedProps={rightArmProps} stroke={c.body} strokeWidth="8"  fill="none" strokeLinecap="round"/>
      {/* upper legs */}
      <Line x1="93"  y1="114" x2="85"  y2="128" stroke={c.body} strokeWidth="11" strokeLinecap="round"/>
      <Line x1="107" y1="114" x2="115" y2="128" stroke={c.body} strokeWidth="11" strokeLinecap="round"/>
      <AnimatedPath animatedProps={leftLegProps}  stroke={c.body} strokeWidth="9"  fill="none" strokeLinecap="round"/>
      <AnimatedPath animatedProps={rightLegProps} stroke={c.body} strokeWidth="9"  fill="none" strokeLinecap="round"/>
    </Svg>
  );
}

// ─── SEATED (chin tuck / neck retraction) ────────────────────────────────────
// Phase 0 = head slightly forward, Phase 1 = chin tucked / head retracted.
function SeatedFigure({ phase, color, dark = false }: FigureProps) {
  const c = gc(color, dark);

  const headProps = useAnimatedProps(() => {
    'worklet';
    return {
      cx: interpolate(phase.value, [0, 1], [94, 82]),
      cy: interpolate(phase.value, [0, 1], [50, 47]),
    };
  });
  const neckProps = useAnimatedProps(() => {
    'worklet';
    const ex = interpolate(phase.value, [0, 1], [92, 84]);
    return { d: `M 100 66 L ${ex} 58` };
  });

  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 160">
      {/* chair seat + back */}
      <Line x1="58" y1="130" x2="142" y2="130" stroke={c.mat}    strokeWidth="4" strokeLinecap="round"/>
      <Line x1="62" y1="82"  x2="62"  y2="130" stroke={c.ground} strokeWidth="3" strokeLinecap="round"/>
      {/* torso */}
      <Line x1="68" y1="122" x2="100" y2="66" stroke={c.body} strokeWidth="18" strokeLinecap="round"/>
      {/* neck (animated) */}
      <AnimatedPath animatedProps={neckProps} stroke={c.body} strokeWidth="8" fill="none" strokeLinecap="round"/>
      {/* head (animated) */}
      <AnimatedCircle animatedProps={headProps} r="14" fill={c.body}/>
      {/* arms resting on lap */}
      <Line x1="90" y1="90"  x2="100" y2="112" stroke={c.body} strokeWidth="7" strokeLinecap="round"/>
      <Line x1="100" y1="112" x2="116" y2="120" stroke={c.body} strokeWidth="6" strokeLinecap="round"/>
      <Line x1="108" y1="90"  x2="118" y2="112" stroke={c.body} strokeWidth="7" strokeLinecap="round"/>
      <Line x1="118" y1="112" x2="132" y2="120" stroke={c.body} strokeWidth="6" strokeLinecap="round"/>
      {/* thighs */}
      <Line x1="68" y1="122" x2="122" y2="122" stroke={c.body} strokeWidth="11" strokeLinecap="round"/>
      {/* shins */}
      <Line x1="82"  y1="122" x2="82"  y2="148" stroke={c.body} strokeWidth="9" strokeLinecap="round"/>
      <Line x1="108" y1="122" x2="108" y2="148" stroke={c.body} strokeWidth="9" strokeLinecap="round"/>
      {/* feet */}
      <Line x1="76"  y1="148" x2="94"  y2="148" stroke={c.body} strokeWidth="5" strokeLinecap="round"/>
      <Line x1="102" y1="148" x2="120" y2="148" stroke={c.body} strokeWidth="5" strokeLinecap="round"/>
    </Svg>
  );
}

// ─── PRONE (McKenzie extension / Y-T-W upper body lift) ──────────────────────
// Phase 0 = flat on stomach, Phase 1 = upper body lifted.
function ProneFigure({ phase, color, dark = false }: FigureProps) {
  const c = gc(color, dark);

  const headProps = useAnimatedProps(() => {
    'worklet';
    return {
      cx: interpolate(phase.value, [0, 1], [28, 26]),
      cy: interpolate(phase.value, [0, 1], [90, 55]),
    };
  });
  const torsoProps = useAnimatedProps(() => {
    'worklet';
    const sy = interpolate(phase.value, [0, 1], [92, 66]);
    return { d: `M 56 ${sy} Q 80 ${(sy + 92) / 2} 106 93` };
  });
  const neckProps = useAnimatedProps(() => {
    'worklet';
    const sy = interpolate(phase.value, [0, 1], [92, 66]);
    const hy = interpolate(phase.value, [0, 1], [90, 55]);
    return { d: `M 56 ${sy} L 38 ${hy + 6}` };
  });
  const armProps = useAnimatedProps(() => {
    'worklet';
    const sy = interpolate(phase.value, [0, 1], [92, 66]);
    const ey = interpolate(phase.value, [0, 1], [100, 76]);
    return { d: `M 56 ${sy} L 38 ${ey}` };
  });

  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 140">
      <Line x1="8" y1="102" x2="192" y2="102" stroke={c.mat} strokeWidth="3" strokeLinecap="round"/>
      {/* lower body (static on mat) */}
      <Line x1="106" y1="93" x2="162" y2="98" stroke={c.body} strokeWidth="14" strokeLinecap="round"/>
      <Line x1="138" y1="98" x2="146" y2="102" stroke={c.body} strokeWidth="9"  strokeLinecap="round"/>
      <Line x1="154" y1="98" x2="162" y2="102" stroke={c.body} strokeWidth="9"  strokeLinecap="round"/>
      <Line x1="146" y1="102" x2="162" y2="102" stroke={c.body} strokeWidth="4" strokeLinecap="round"/>
      <Line x1="162" y1="102" x2="178" y2="102" stroke={c.body} strokeWidth="4" strokeLinecap="round"/>
      {/* torso (animated lift) */}
      <AnimatedPath animatedProps={torsoProps} stroke={c.body} strokeWidth="14" fill="none" strokeLinecap="round"/>
      {/* neck */}
      <AnimatedPath animatedProps={neckProps}  stroke={c.body} strokeWidth="7"  fill="none" strokeLinecap="round"/>
      {/* head */}
      <AnimatedCircle animatedProps={headProps} r="12" fill={c.body}/>
      {/* arms rise with torso */}
      <AnimatedPath animatedProps={armProps}  stroke={c.body} strokeWidth="6"  fill="none" strokeLinecap="round"/>
    </Svg>
  );
}

// ─── SIDELYING (clamshell / hip abduction — top leg lifts) ───────────────────
// Phase 0 = legs together, Phase 1 = top knee lifted.
function SidelyingFigure({ phase, color, dark = false }: FigureProps) {
  const c = gc(color, dark);

  const topThighProps = useAnimatedProps(() => {
    'worklet';
    const kx = interpolate(phase.value, [0, 1], [130, 118]);
    const ky = interpolate(phase.value, [0, 1], [88, 66]);
    return { d: `M 104 90 L ${kx} ${ky}` };
  });
  const topShinProps = useAnimatedProps(() => {
    'worklet';
    const kx = interpolate(phase.value, [0, 1], [130, 118]);
    const ky = interpolate(phase.value, [0, 1], [88, 66]);
    const fx = interpolate(phase.value, [0, 1], [158, 140]);
    const fy = interpolate(phase.value, [0, 1], [92, 84]);
    return { d: `M ${kx} ${ky} L ${fx} ${fy}` };
  });

  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 140">
      <Line x1="8" y1="103" x2="192" y2="103" stroke={c.mat} strokeWidth="3" strokeLinecap="round"/>
      <Circle cx="24" cy="78" r="12" fill={c.body}/>
      <Line x1="36" y1="80" x2="46" y2="84" stroke={c.body} strokeWidth="7" strokeLinecap="round"/>
      <Line x1="46" y1="84" x2="102" y2="90" stroke={c.body} strokeWidth="15" strokeLinecap="round"/>
      {/* top arm forward */}
      <Line x1="60" y1="84" x2="74" y2="72" stroke={c.body} strokeWidth="6" strokeLinecap="round"/>
      <Line x1="74" y1="72" x2="92" y2="70" stroke={c.body} strokeWidth="5" strokeLinecap="round"/>
      {/* bottom arm under head */}
      <Line x1="36" y1="84" x2="28" y2="100" stroke={c.body} strokeWidth="6" strokeLinecap="round"/>
      {/* bottom (resting) leg */}
      <Line x1="102" y1="94" x2="140" y2="98" stroke={c.body} strokeWidth="9" strokeLinecap="round"/>
      <Line x1="140" y1="98" x2="164" y2="100" stroke={c.body} strokeWidth="7" strokeLinecap="round"/>
      <Line x1="164" y1="100" x2="178" y2="102" stroke={c.body} strokeWidth="4" strokeLinecap="round"/>
      {/* top (active) leg — animated */}
      <AnimatedPath animatedProps={topThighProps} stroke={c.body} strokeWidth="9" fill="none" strokeLinecap="round"/>
      <AnimatedPath animatedProps={topShinProps}  stroke={c.body} strokeWidth="7" fill="none" strokeLinecap="round"/>
    </Svg>
  );
}

// ─── KNEELING (child's pose forward fold) ────────────────────────────────────
// Phase 0 = upright kneeling, Phase 1 = fully folded.
function KneelingFigure({ phase, color, dark = false }: FigureProps) {
  const c = gc(color, dark);

  const torsoProps = useAnimatedProps(() => {
    'worklet';
    const ex = interpolate(phase.value, [0, 1], [90, 148]);
    const ey = interpolate(phase.value, [0, 1], [54, 90]);
    return { d: `M 90 96 L ${ex} ${ey}` };
  });
  const neckProps = useAnimatedProps(() => {
    'worklet';
    const sx = interpolate(phase.value, [0, 1], [90, 148]);
    const sy = interpolate(phase.value, [0, 1], [54, 90]);
    const ex = interpolate(phase.value, [0, 1], [90, 154]);
    const ey = interpolate(phase.value, [0, 1], [42, 92]);
    return { d: `M ${sx} ${sy} L ${ex} ${ey}` };
  });
  const headProps = useAnimatedProps(() => {
    'worklet';
    return {
      cx: interpolate(phase.value, [0, 1], [90, 160]),
      cy: interpolate(phase.value, [0, 1], [30, 92]),
    };
  });
  const armProps = useAnimatedProps(() => {
    'worklet';
    const sx = interpolate(phase.value, [0, 1], [90, 148]);
    const sy = interpolate(phase.value, [0, 1], [58, 94]);
    const ex = interpolate(phase.value, [0, 1], [72, 168]);
    const ey = interpolate(phase.value, [0, 1], [76, 96]);
    return { d: `M ${sx} ${sy} L ${ex} ${ey}` };
  });

  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 140">
      <Line x1="40" y1="108" x2="175" y2="108" stroke={c.mat} strokeWidth="3" strokeLinecap="round"/>
      {/* shin on mat */}
      <Line x1="70" y1="106" x2="152" y2="106" stroke={c.body} strokeWidth="7" strokeLinecap="round"/>
      {/* thigh sitting on heels */}
      <Line x1="90" y1="96" x2="132" y2="102" stroke={c.body} strokeWidth="12" strokeLinecap="round"/>
      <Line x1="132" y1="102" x2="156" y2="106" stroke={c.body} strokeWidth="9" strokeLinecap="round"/>
      {/* torso (animated fold) */}
      <AnimatedPath animatedProps={torsoProps} stroke={c.body} strokeWidth="15" fill="none" strokeLinecap="round"/>
      {/* neck */}
      <AnimatedPath animatedProps={neckProps}  stroke={c.body} strokeWidth="7"  fill="none" strokeLinecap="round"/>
      {/* head */}
      <AnimatedCircle animatedProps={headProps} r="12" fill={c.body}/>
      {/* arms reach forward */}
      <AnimatedPath animatedProps={armProps}   stroke={c.body} strokeWidth="7"  fill="none" strokeLinecap="round"/>
    </Svg>
  );
}

// ─── Animation timing hooks ───────────────────────────────────────────────────

/** Bridge: 1 s lift → 3 s hold → 1 s lower → 1 s rest. Total 6 s. */
function useBridgeCycle(): Animated.SharedValue<number> {
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }),
        withDelay(3000, withTiming(1, { duration: 50 })),
        withTiming(0, { duration: 1000, easing: Easing.in(Easing.cubic) }),
        withDelay(1000, withTiming(0, { duration: 50 })),
      ),
      -1,
    );
  }, []);
  return phase;
}

/** Smooth bounce: ease in-out, hold at peak, return. Total ~4 s. */
function useBounceCycle(totalMs = 4000): Animated.SharedValue<number> {
  const phase = useSharedValue(0);
  useEffect(() => {
    const q = totalMs / 4;
    phase.value = withRepeat(
      withSequence(
        withTiming(1, { duration: q, easing: Easing.inOut(Easing.sin) }),
        withDelay(q, withTiming(1, { duration: 50 })),
        withTiming(0, { duration: q, easing: Easing.inOut(Easing.sin) }),
        withDelay(q, withTiming(0, { duration: 50 })),
      ),
      -1,
    );
  }, []);
  return phase;
}

/** Slow pulse for held stretches: gradual move, long hold, gradual return. Total ~5 s. */
function useSlowPulse(totalMs = 5000): Animated.SharedValue<number> {
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = withRepeat(
      withSequence(
        withTiming(1, { duration: totalMs * 0.28, easing: Easing.out(Easing.cubic) }),
        withDelay(totalMs * 0.22, withTiming(1, { duration: 50 })),
        withTiming(0, { duration: totalMs * 0.28, easing: Easing.in(Easing.cubic) }),
        withDelay(totalMs * 0.22, withTiming(0, { duration: 50 })),
      ),
      -1,
    );
  }, []);
  return phase;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function AnimatedFigure({
  figureType = 'bridge',
  accent,
  dark = false,
  width,
  height,
}: AnimatedFigureProps) {
  const color = accent ?? COLORS.clay;

  // Each phase hook always runs — hooks must not be conditional.
  const bridgePhase = useBridgeCycle();
  const bouncePhase = useBounceCycle(4000);
  const slowPhase   = useSlowPulse(5000);
  const standPhase  = useBounceCycle(2800);

  const phaseMap: Record<FigureType, Animated.SharedValue<number>> = {
    bridge:    bridgePhase,
    supine:    bouncePhase,
    quadruped: bouncePhase,
    standing:  standPhase,
    seated:    slowPhase,
    prone:     slowPhase,
    sidelying: bouncePhase,
    kneeling:  slowPhase,
  };

  const figureMap: Record<FigureType, React.ReactElement> = {
    bridge:    <BridgeFigure    phase={phaseMap.bridge}    color={color} dark={dark}/>,
    supine:    <SupineFigure    phase={phaseMap.supine}    color={color} dark={dark}/>,
    quadruped: <QuadrupedFigure phase={phaseMap.quadruped} color={color} dark={dark}/>,
    standing:  <StandingFigure  phase={phaseMap.standing}  color={color} dark={dark}/>,
    seated:    <SeatedFigure    phase={phaseMap.seated}    color={color} dark={dark}/>,
    prone:     <ProneFigure     phase={phaseMap.prone}     color={color} dark={dark}/>,
    sidelying: <SidelyingFigure phase={phaseMap.sidelying} color={color} dark={dark}/>,
    kneeling:  <KneelingFigure  phase={phaseMap.kneeling}  color={color} dark={dark}/>,
  };

  return (
    <View style={{ width: width ?? '100%', height: height ?? '100%' }}>
      {figureMap[figureType]}
    </View>
  );
}
