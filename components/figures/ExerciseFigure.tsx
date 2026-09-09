/**
 * Static (non-animated) exercise figure used on the Exercise Detail screen
 * inside the illustration card.  Mirrors the visual style of AnimatedFigure
 * but rendered at a single mid-motion pose (phase = 0.6).
 */

import React from 'react';
import { View, type DimensionValue } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { COLORS } from '@/lib/tokens';
import type { FigureType } from './AnimatedFigure';

interface ExerciseFigureProps {
  figureType?: FigureType;
  accent?: string;
  dark?: boolean;
  width?: DimensionValue;
  height?: DimensionValue;
}

// Each static figure is the mid-motion snapshot (phase ≈ 0.6)
function BridgeStatic({ color }: { color: string }) {
  const hy = 88 - 0.6 * 36;   // ~66
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 140">
      <Line x1="8" y1="103" x2="192" y2="103" stroke={COLORS.borderSoft} strokeWidth="3" strokeLinecap="round"/>
      <Circle cx="26" cy="84" r="12" fill={color}/>
      <Line x1="38" y1="84" x2="48" y2="86" stroke={color} strokeWidth="7" strokeLinecap="round"/>
      <Line x1="60" y1="90" x2="74" y2="100" stroke={color} strokeWidth="6" strokeLinecap="round"/>
      <Line x1="74" y1="100" x2="92" y2="100" stroke={color} strokeWidth="5" strokeLinecap="round"/>
      <Path d={`M 56 88 Q 78 ${hy - 6} 100 ${hy}`} stroke={color} strokeWidth="14" fill="none" strokeLinecap="round"/>
      <Circle cx={100} cy={hy} r={9} fill={color}/>
      <Path d={`M 100 ${hy} L 132 98`} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"/>
      <Line x1="132" y1="98" x2="158" y2="100" stroke={color} strokeWidth="8" strokeLinecap="round"/>
      <Line x1="158" y1="100" x2="174" y2="100" stroke={color} strokeWidth="5" strokeLinecap="round"/>
    </Svg>
  );
}

function SupineStatic({ color }: { color: string }) {
  const kx = 148 - 0.6 * 60; const ky = 98 - 0.6 * 26;
  const fx = 172 - 0.6 * 68;  const fy = 100 - 0.6 * 20;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 140">
      <Line x1="8" y1="103" x2="192" y2="103" stroke={COLORS.borderSoft} strokeWidth="3" strokeLinecap="round"/>
      <Circle cx="24" cy="85" r="12" fill={color}/>
      <Line x1="36" y1="85" x2="47" y2="87" stroke={color} strokeWidth="7" strokeLinecap="round"/>
      <Line x1="47" y1="87" x2="108" y2="90" stroke={color} strokeWidth="14" strokeLinecap="round"/>
      <Line x1="62" y1="93" x2="76" y2="102" stroke={color} strokeWidth="6" strokeLinecap="round"/>
      <Line x1="76" y1="102" x2="94" y2="102" stroke={color} strokeWidth="5" strokeLinecap="round"/>
      <Line x1="108" y1="92" x2="146" y2="100" stroke={color} strokeWidth="9" strokeLinecap="round"/>
      <Line x1="146" y1="100" x2="170" y2="100" stroke={color} strokeWidth="7" strokeLinecap="round"/>
      <Path d={`M 108 92 L ${kx} ${ky}`} stroke={color} strokeWidth="9" fill="none" strokeLinecap="round"/>
      <Path d={`M ${kx} ${ky} L ${fx} ${fy}`} stroke={color} strokeWidth="7" fill="none" strokeLinecap="round"/>
    </Svg>
  );
}

function QuadrupedStatic({ color }: { color: string }) {
  const apex = 68 - 0.6 * 24; // ~53
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 140">
      <Line x1="16" y1="106" x2="184" y2="106" stroke={COLORS.borderSoft} strokeWidth="3" strokeLinecap="round"/>
      <Circle cx="38" cy="66" r="11" fill={color}/>
      <Line x1="49" y1="68" x2="54" y2="74" stroke={color} strokeWidth="7" strokeLinecap="round"/>
      <Path d={`M 54 74 Q 100 ${apex} 146 74`} stroke={color} strokeWidth="13" fill="none" strokeLinecap="round"/>
      <Circle cx="146" cy="74" r="10" fill={color}/>
      <Line x1="54" y1="74" x2="34" y2="70" stroke={color} strokeWidth="7" strokeLinecap="round"/>
      <Line x1="34" y1="70" x2="34" y2="92" stroke={color} strokeWidth="6" strokeLinecap="round"/>
      <Line x1="54" y1="74" x2="54" y2="92" stroke={color} strokeWidth="7" strokeLinecap="round"/>
      <Line x1="146" y1="74" x2="146" y2="92" stroke={color} strokeWidth="7" strokeLinecap="round"/>
      <Line x1="146" y1="74" x2="168" y2="70" stroke={color} strokeWidth="7" strokeLinecap="round"/>
      <Line x1="168" y1="70" x2="168" y2="92" stroke={color} strokeWidth="6" strokeLinecap="round"/>
    </Svg>
  );
}

function StandingStatic({ color }: { color: string }) {
  const ay = 98 - 0.6 * 8; const hy = 132 - 0.6 * 8;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 160">
      <Line x1="40" y1="134" x2="160" y2="134" stroke={COLORS.borderSoft} strokeWidth="3" strokeLinecap="round"/>
      <Circle cx="100" cy="28" r="15" fill={color}/>
      <Line x1="100" y1="43" x2="100" y2="54" stroke={color} strokeWidth="8" strokeLinecap="round"/>
      <Line x1="100" y1="54" x2="100" y2="114" stroke={color} strokeWidth="18" strokeLinecap="round"/>
      <Path d={`M 86 74 L 70 ${ay}`} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"/>
      <Path d={`M 114 74 L 130 ${ay}`} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"/>
      <Line x1="93" y1="114" x2="85" y2="128" stroke={color} strokeWidth="11" strokeLinecap="round"/>
      <Line x1="107" y1="114" x2="115" y2="128" stroke={color} strokeWidth="11" strokeLinecap="round"/>
      <Path d={`M 87 114 L 82 ${ay} L 76 ${hy}`} stroke={color} strokeWidth="9" fill="none" strokeLinecap="round"/>
      <Path d={`M 113 114 L 118 ${ay} L 124 ${hy}`} stroke={color} strokeWidth="9" fill="none" strokeLinecap="round"/>
    </Svg>
  );
}

function SeatedStatic({ color }: { color: string }) {
  const hx = 94 - 0.6 * 12; const hy = 50 - 0.6 * 3;
  const nex = 92 - 0.6 * 8;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 160">
      <Line x1="58" y1="130" x2="142" y2="130" stroke={COLORS.borderSoft} strokeWidth="4" strokeLinecap="round"/>
      <Line x1="62" y1="82"  x2="62"  y2="130" stroke={COLORS.border}     strokeWidth="3" strokeLinecap="round"/>
      <Line x1="68" y1="122" x2="100" y2="66" stroke={color} strokeWidth="18" strokeLinecap="round"/>
      <Path d={`M 100 66 L ${nex} 58`} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"/>
      <Circle cx={hx} cy={hy} r="14" fill={color}/>
      <Line x1="90" y1="90" x2="100" y2="112" stroke={color} strokeWidth="7" strokeLinecap="round"/>
      <Line x1="100" y1="112" x2="116" y2="120" stroke={color} strokeWidth="6" strokeLinecap="round"/>
      <Line x1="68" y1="122" x2="122" y2="122" stroke={color} strokeWidth="11" strokeLinecap="round"/>
      <Line x1="82"  y1="122" x2="82"  y2="148" stroke={color} strokeWidth="9" strokeLinecap="round"/>
      <Line x1="108" y1="122" x2="108" y2="148" stroke={color} strokeWidth="9" strokeLinecap="round"/>
    </Svg>
  );
}

function ProneStatic({ color }: { color: string }) {
  const sy = 92 - 0.6 * 26; const hx = 26; const hy2 = 90 - 0.6 * 35;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 140">
      <Line x1="8" y1="102" x2="192" y2="102" stroke={COLORS.borderSoft} strokeWidth="3" strokeLinecap="round"/>
      <Line x1="106" y1="93" x2="162" y2="98" stroke={color} strokeWidth="14" strokeLinecap="round"/>
      <Line x1="138" y1="98" x2="146" y2="102" stroke={color} strokeWidth="9" strokeLinecap="round"/>
      <Line x1="154" y1="98" x2="162" y2="102" stroke={color} strokeWidth="9" strokeLinecap="round"/>
      <Path d={`M 56 ${sy} Q 80 ${(sy + 92) / 2} 106 93`} stroke={color} strokeWidth="14" fill="none" strokeLinecap="round"/>
      <Path d={`M 56 ${sy} L ${hx + 12} ${hy2 + 6}`} stroke={color} strokeWidth="7" fill="none" strokeLinecap="round"/>
      <Circle cx={hx} cy={hy2} r="12" fill={color}/>
      <Path d={`M 56 ${sy} L 38 ${sy + 10}`} stroke={color} strokeWidth="6" fill="none" strokeLinecap="round"/>
    </Svg>
  );
}

function SidelyingStatic({ color }: { color: string }) {
  const kx = 130 - 0.6 * 12; const ky = 88 - 0.6 * 22;
  const fx = 158 - 0.6 * 18; const fy = 92 - 0.6 * 8;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 140">
      <Line x1="8" y1="103" x2="192" y2="103" stroke={COLORS.borderSoft} strokeWidth="3" strokeLinecap="round"/>
      <Circle cx="24" cy="78" r="12" fill={color}/>
      <Line x1="36" y1="80" x2="46" y2="84" stroke={color} strokeWidth="7" strokeLinecap="round"/>
      <Line x1="46" y1="84" x2="102" y2="90" stroke={color} strokeWidth="15" strokeLinecap="round"/>
      <Line x1="102" y1="94" x2="140" y2="98" stroke={color} strokeWidth="9" strokeLinecap="round"/>
      <Line x1="140" y1="98" x2="164" y2="100" stroke={color} strokeWidth="7" strokeLinecap="round"/>
      <Path d={`M 104 90 L ${kx} ${ky}`} stroke={color} strokeWidth="9" fill="none" strokeLinecap="round"/>
      <Path d={`M ${kx} ${ky} L ${fx} ${fy}`} stroke={color} strokeWidth="7" fill="none" strokeLinecap="round"/>
    </Svg>
  );
}

function KneelingStatic({ color }: { color: string }) {
  const ex = 90 + 0.6 * 58; const ey = 54 + 0.6 * 36;
  const hx = 90 + 0.6 * 70; const hy = 30 + 0.6 * 62;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 140">
      <Line x1="40" y1="108" x2="175" y2="108" stroke={COLORS.borderSoft} strokeWidth="3" strokeLinecap="round"/>
      <Line x1="70" y1="106" x2="152" y2="106" stroke={color} strokeWidth="7"  strokeLinecap="round"/>
      <Line x1="90" y1="96" x2="132" y2="102" stroke={color} strokeWidth="12" strokeLinecap="round"/>
      <Path d={`M 90 96 L ${ex} ${ey}`} stroke={color} strokeWidth="15" fill="none" strokeLinecap="round"/>
      <Path d={`M ${ex} ${ey} L ${hx - 6} ${hy + 6}`} stroke={color} strokeWidth="7" fill="none" strokeLinecap="round"/>
      <Circle cx={hx} cy={hy} r="12" fill={color}/>
      <Path d={`M ${ex} ${ey + 4} L ${hx + 14} ${ey + 2}`} stroke={color} strokeWidth="7" fill="none" strokeLinecap="round"/>
    </Svg>
  );
}

const FIGURE_MAP: Record<FigureType, React.ComponentType<{ color: string }>> = {
  bridge:    BridgeStatic,
  supine:    SupineStatic,
  quadruped: QuadrupedStatic,
  standing:  StandingStatic,
  seated:    SeatedStatic,
  prone:     ProneStatic,
  sidelying: SidelyingStatic,
  kneeling:  KneelingStatic,
};

export function ExerciseFigure({
  figureType = 'bridge',
  accent,
  width,
  height,
}: ExerciseFigureProps) {
  const color = accent ?? COLORS.clayDeep;
  const Figure = FIGURE_MAP[figureType];
  return (
    <View style={{ width: width ?? '100%', height: height ?? '100%' }}>
      <Figure color={color}/>
    </View>
  );
}
