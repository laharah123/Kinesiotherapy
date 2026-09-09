import React from 'react';
import { View } from 'react-native';
import Svg, {
  Path,
  Ellipse,
  Circle,
  Line,
  G,
  Defs,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { COLORS, fontFor } from '@/lib/tokens';

export type BodyRegion =
  // Front
  | 'neck' | 'leftShoulder' | 'rightShoulder' | 'chest'
  | 'leftElbow' | 'rightElbow' | 'leftWrist' | 'rightWrist'
  | 'upperAbdomen' | 'lowerAbdomen' | 'leftHip' | 'rightHip'
  | 'leftKnee' | 'rightKnee'
  // Back only
  | 'upperBack' | 'midBack' | 'lowBack'
  | 'leftGlute' | 'rightGlute'
  | 'leftAnkle' | 'rightAnkle';

/** Short human labels, used for the in-figure caption and accessibility. */
export const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  neck: 'Neck',
  leftShoulder: 'Left shoulder',
  rightShoulder: 'Right shoulder',
  chest: 'Chest',
  leftElbow: 'Left elbow',
  rightElbow: 'Right elbow',
  leftWrist: 'Left wrist',
  rightWrist: 'Right wrist',
  upperAbdomen: 'Upper abdomen',
  lowerAbdomen: 'Lower abdomen',
  leftHip: 'Left hip',
  rightHip: 'Right hip',
  leftKnee: 'Left knee',
  rightKnee: 'Right knee',
  upperBack: 'Upper back',
  midBack: 'Mid back',
  lowBack: 'Lower back',
  leftGlute: 'Left glute',
  rightGlute: 'Right glute',
  leftAnkle: 'Left ankle',
  rightAnkle: 'Right ankle',
};

interface RegionDef {
  id: BodyRegion;
  /** Visible marker. */
  cx: number; cy: number; rx: number; ry: number;
  /** Where the caption for a selected region sits. */
  labelAnchor?: 'start' | 'middle' | 'end';
  labelDx?: number;
  labelDy?: number;
}

const VIEWBOX_W = 120;
const VIEWBOX_H = 260;

/**
 * Every tap target is an invisible ellipse of this radius sitting behind the
 * visible marker, so the smallest region still clears 44pt at width 220
 * (12.5 / 120 * 220 * 2 = 45.8pt). Region centres are all at least 24 viewBox
 * units apart so the hit areas never fight each other.
 */
const HIT_R = 12.5;

const FRONT_REGIONS: RegionDef[] = [
  { id: 'neck',          cx: 60,  cy: 30,  rx: 9,  ry: 8,  labelDy: -16 },
  { id: 'leftShoulder',  cx: 34,  cy: 52,  rx: 12, ry: 9,  labelAnchor: 'end',   labelDx: -14 },
  { id: 'rightShoulder', cx: 86,  cy: 52,  rx: 12, ry: 9,  labelAnchor: 'start', labelDx: 14 },
  { id: 'chest',         cx: 60,  cy: 76,  rx: 19, ry: 15 },
  { id: 'upperAbdomen',  cx: 60,  cy: 104, rx: 15, ry: 12 },
  { id: 'lowerAbdomen',  cx: 60,  cy: 130, rx: 14, ry: 11 },
  { id: 'leftElbow',     cx: 20,  cy: 104, rx: 8,  ry: 9,  labelAnchor: 'start', labelDx: 12 },
  { id: 'rightElbow',    cx: 100, cy: 104, rx: 8,  ry: 9,  labelAnchor: 'end',   labelDx: -12 },
  { id: 'leftWrist',     cx: 12,  cy: 152, rx: 7,  ry: 7,  labelAnchor: 'start', labelDx: 11 },
  { id: 'rightWrist',    cx: 108, cy: 152, rx: 7,  ry: 7,  labelAnchor: 'end',   labelDx: -11 },
  { id: 'leftHip',       cx: 38,  cy: 150, rx: 12, ry: 11, labelAnchor: 'end',   labelDx: -14 },
  { id: 'rightHip',      cx: 82,  cy: 150, rx: 12, ry: 11, labelAnchor: 'start', labelDx: 14 },
  { id: 'leftKnee',      cx: 42,  cy: 204, rx: 11, ry: 11, labelAnchor: 'end',   labelDx: -13 },
  { id: 'rightKnee',     cx: 78,  cy: 204, rx: 11, ry: 11, labelAnchor: 'start', labelDx: 13 },
  { id: 'leftAnkle',     cx: 42,  cy: 242, rx: 8,  ry: 7,  labelAnchor: 'end',   labelDx: -11 },
  { id: 'rightAnkle',    cx: 78,  cy: 242, rx: 8,  ry: 7,  labelAnchor: 'start', labelDx: 11 },
];

const BACK_REGIONS: RegionDef[] = [
  { id: 'neck',          cx: 60,  cy: 30,  rx: 9,  ry: 8,  labelDy: -16 },
  { id: 'leftShoulder',  cx: 36,  cy: 52,  rx: 12, ry: 9,  labelAnchor: 'end',   labelDx: -14 },
  { id: 'rightShoulder', cx: 84,  cy: 52,  rx: 12, ry: 9,  labelAnchor: 'start', labelDx: 14 },
  { id: 'upperBack',     cx: 60,  cy: 70,  rx: 18, ry: 13 },
  { id: 'midBack',       cx: 60,  cy: 100, rx: 16, ry: 13 },
  { id: 'lowBack',       cx: 60,  cy: 130, rx: 15, ry: 12 },
  { id: 'leftElbow',     cx: 20,  cy: 104, rx: 8,  ry: 9,  labelAnchor: 'start', labelDx: 12 },
  { id: 'rightElbow',    cx: 100, cy: 104, rx: 8,  ry: 9,  labelAnchor: 'end',   labelDx: -12 },
  { id: 'leftHip',       cx: 34,  cy: 132, rx: 11, ry: 10, labelAnchor: 'end',   labelDx: -13 },
  { id: 'rightHip',      cx: 86,  cy: 132, rx: 11, ry: 10, labelAnchor: 'start', labelDx: 13 },
  { id: 'leftWrist',     cx: 12,  cy: 152, rx: 7,  ry: 7,  labelAnchor: 'start', labelDx: 11 },
  { id: 'rightWrist',    cx: 108, cy: 152, rx: 7,  ry: 7,  labelAnchor: 'end',   labelDx: -11 },
  { id: 'leftGlute',     cx: 44,  cy: 158, rx: 13, ry: 12, labelAnchor: 'end',   labelDx: -15 },
  { id: 'rightGlute',    cx: 76,  cy: 158, rx: 13, ry: 12, labelAnchor: 'start', labelDx: 15 },
  { id: 'leftKnee',      cx: 42,  cy: 204, rx: 11, ry: 11, labelAnchor: 'end',   labelDx: -13 },
  { id: 'rightKnee',     cx: 78,  cy: 204, rx: 11, ry: 11, labelAnchor: 'start', labelDx: 13 },
  { id: 'leftAnkle',     cx: 42,  cy: 242, rx: 8,  ry: 7,  labelAnchor: 'end',   labelDx: -11 },
  { id: 'rightAnkle',    cx: 78,  cy: 242, rx: 8,  ry: 7,  labelAnchor: 'start', labelDx: 11 },
];

// Front silhouette: narrow shoulders, visible waist taper, feet turned out.
const FRONT_SILHOUETTE =
  'M60 4 C52 4 46 10 46 18 C46 26 52 32 60 32 C68 32 74 26 74 18 C74 10 68 4 60 4 Z ' +
  'M44 32 C36 34 28 40 26 52 L22 90 L18 128 L16 148 L14 158 L20 160 L24 140 L26 112 ' +
  'L30 140 L32 200 L34 248 L46 250 L48 200 L52 160 L60 160 L68 160 L72 200 L74 250 ' +
  'L86 248 L88 200 L90 140 L94 112 L96 140 L100 160 L106 158 L104 148 L102 128 L98 90 ' +
  'L94 52 C92 40 84 34 76 32 Z';

// Back silhouette: broader, squarer shoulder line and a flat nape on the head,
// so flipping the view is immediately obvious.
const BACK_SILHOUETTE =
  'M60 4 C51 4 45 11 45 19 C45 25 48 30 53 32 L67 32 C72 30 75 25 75 19 C75 11 69 4 60 4 Z ' +
  'M42 32 C33 35 25 42 24 54 L20 90 L17 128 L15 148 L13 158 L19 160 L23 140 L25 112 ' +
  'L29 142 L31 200 L33 248 L45 250 L47 200 L52 162 L60 162 L68 162 L73 200 L75 250 ' +
  'L87 248 L89 200 L91 142 L95 112 L97 140 L101 160 L107 158 L105 148 L103 128 L100 90 ' +
  'L96 54 C95 42 87 35 78 32 Z';

/** Exposed for layout tests: viewBox size and the hit-target radius. */
export const BODY_MAP_VIEWBOX = { width: VIEWBOX_W, height: VIEWBOX_H } as const;
export const BODY_MAP_HIT_RADIUS = HIT_R;

/** The regions offered on each side, in draw order. */
export const BODY_MAP_REGIONS: Record<'front' | 'back', BodyRegion[]> = {
  front: FRONT_REGIONS.map((r) => r.id),
  back:  BACK_REGIONS.map((r) => r.id),
};

/** Centre of every region, for hit-target spacing checks. */
export const BODY_MAP_CENTRES: Record<'front' | 'back', Record<string, { x: number; y: number }>> = {
  front: Object.fromEntries(FRONT_REGIONS.map((r) => [r.id, { x: r.cx, y: r.cy }])),
  back:  Object.fromEntries(BACK_REGIONS.map((r) => [r.id, { x: r.cx, y: r.cy }])),
};

interface BodyMapProps {
  width?: number;
  side?: 'front' | 'back';
  selected?: BodyRegion[];
  onSelect?: (region: BodyRegion) => void;
  hot?: string;
}

export function BodyMap({
  width = 200,
  side = 'front',
  selected = [],
  onSelect,
  hot,
}: BodyMapProps) {
  const height = (width / VIEWBOX_W) * VIEWBOX_H;
  const activeColor = hot ?? COLORS.clay;
  const isBack = side === 'back';
  const regions = isBack ? BACK_REGIONS : FRONT_REGIONS;
  const captionFont = fontFor('600');

  return (
    <View style={{ width, height }}>
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        accessibilityLabel={isBack ? 'Body map, back view' : 'Body map, front view'}
      >
        <Defs>
          {selected.map((id) => (
            <RadialGradient key={`glow-${id}`} id={`glow-${id}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={activeColor} stopOpacity="0.35"/>
              <Stop offset="100%" stopColor={activeColor} stopOpacity="0"/>
            </RadialGradient>
          ))}
        </Defs>

        {/* Silhouette */}
        <Path
          d={isBack ? BACK_SILHOUETTE : FRONT_SILHOUETTE}
          fill={COLORS.surface2}
          stroke={COLORS.border}
          strokeWidth="1"
        />

        {/* Back-only anatomy: spine line and shoulder blades */}
        {isBack && (
          <G>
            <Line
              x1="60" y1="36" x2="60" y2="146"
              stroke={COLORS.border} strokeWidth="1.4" strokeLinecap="round"
            />
            {[44, 56, 68, 80, 92, 104, 116, 128, 140].map((y) => (
              <Line
                key={y}
                x1="56" y1={y} x2="64" y2={y}
                stroke={COLORS.border} strokeWidth="1" strokeLinecap="round"
              />
            ))}
            <Path
              d="M46 56 C40 64 40 76 47 84"
              fill="none" stroke={COLORS.border} strokeWidth="1.4" strokeLinecap="round"
            />
            <Path
              d="M74 56 C80 64 80 76 73 84"
              fill="none" stroke={COLORS.border} strokeWidth="1.4" strokeLinecap="round"
            />
            <Path
              d="M50 148 C55 156 65 156 70 148"
              fill="none" stroke={COLORS.border} strokeWidth="1.2" strokeLinecap="round"
            />
          </G>
        )}

        {/* Tap regions */}
        {regions.map((r) => {
          const isSelected = selected.includes(r.id);
          const label = BODY_REGION_LABELS[r.id];

          return (
            <G key={r.id}>
              {isSelected && (
                <Ellipse
                  cx={r.cx} cy={r.cy}
                  rx={r.rx * 1.7} ry={r.ry * 1.7}
                  fill={`url(#glow-${r.id})`}
                />
              )}

              {/* Visible marker */}
              <Ellipse
                cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry}
                fill={isSelected ? activeColor : COLORS.surface2}
                fillOpacity={isSelected ? 0.3 : 0.35}
                stroke={isSelected ? activeColor : COLORS.border}
                strokeWidth={isSelected ? 1.5 : 0.8}
              />

              {isSelected && <Circle cx={r.cx} cy={r.cy} r={3} fill="#fff"/>}

              {/*
                Hit area last so it sits on top. react-native-svg does not hit
                test fill="none" or fill="transparent", so this uses a real
                fill at an opacity low enough to be invisible.
              */}
              <Ellipse
                cx={r.cx} cy={r.cy} rx={HIT_R} ry={HIT_R}
                fill={COLORS.surface2}
                fillOpacity={0.01}
                onPress={onSelect ? () => onSelect(r.id) : undefined}
                accessibilityLabel={isSelected ? `${label}, selected` : label}
              />

              {/* Caption for the selected region, drawn beside it */}
              {isSelected && (
                <SvgText
                  x={r.cx + (r.labelDx ?? 0)}
                  y={r.cy + (r.labelDy ?? 3.5)}
                  textAnchor={r.labelAnchor ?? 'middle'}
                  fontSize="7"
                  fontFamily={captionFont}
                  fill={COLORS.ink2}
                >
                  {label}
                </SvgText>
              )}
            </G>
          );
        })}

        {/* View caption */}
        <SvgText
          x={VIEWBOX_W / 2}
          y={VIEWBOX_H - 3}
          textAnchor="middle"
          fontSize="8"
          fontFamily={captionFont}
          fill={COLORS.ink3}
        >
          {isBack ? 'Back view' : 'Front view'}
        </SvgText>
      </Svg>
    </View>
  );
}
