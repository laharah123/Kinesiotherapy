import React from 'react';
import { View } from 'react-native';
import Svg, {
  Path,
  Ellipse,
  Circle,
  Rect,
  G,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { COLORS } from '@/lib/tokens';

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

interface RegionDef {
  id: BodyRegion;
  side: 'front' | 'back' | 'both';
  // SVG path or ellipse definition — coordinates in a 120×260 viewBox
  shape: 'path' | 'ellipse' | 'rect';
  d?: string;              // for path
  cx?: number; cy?: number; rx?: number; ry?: number; // for ellipse
  x?: number;  y?: number;  w?: number;  h?: number;  // for rect
  r?: number;                                          // for circle
}

// All coordinates are in a 120 × 260 viewBox.
// The figure is centred: head ~20px, shoulders ~y40, hips ~y140, knees ~y200, ankles ~y245.
const FRONT_REGIONS: RegionDef[] = [
  { id: 'neck',           side: 'both',  shape: 'ellipse', cx: 60, cy: 30,  rx: 9,  ry: 8  },
  { id: 'leftShoulder',   side: 'front', shape: 'ellipse', cx: 38, cy: 50,  rx: 13, ry: 10 },
  { id: 'rightShoulder',  side: 'front', shape: 'ellipse', cx: 82, cy: 50,  rx: 13, ry: 10 },
  { id: 'chest',          side: 'front', shape: 'ellipse', cx: 60, cy: 72,  rx: 20, ry: 18 },
  { id: 'upperAbdomen',   side: 'front', shape: 'ellipse', cx: 60, cy: 102, rx: 16, ry: 14 },
  { id: 'lowerAbdomen',   side: 'front', shape: 'ellipse', cx: 60, cy: 128, rx: 15, ry: 12 },
  { id: 'leftHip',        side: 'both',  shape: 'ellipse', cx: 44, cy: 148, rx: 14, ry: 14 },
  { id: 'rightHip',       side: 'both',  shape: 'ellipse', cx: 76, cy: 148, rx: 14, ry: 14 },
  { id: 'leftElbow',      side: 'both',  shape: 'ellipse', cx: 24, cy: 102, rx: 9,  ry: 10 },
  { id: 'rightElbow',     side: 'both',  shape: 'ellipse', cx: 96, cy: 102, rx: 9,  ry: 10 },
  { id: 'leftWrist',      side: 'both',  shape: 'ellipse', cx: 18, cy: 136, rx: 7,  ry: 8  },
  { id: 'rightWrist',     side: 'both',  shape: 'ellipse', cx: 102,cy: 136, rx: 7,  ry: 8  },
  { id: 'leftKnee',       side: 'both',  shape: 'ellipse', cx: 44, cy: 202, rx: 12, ry: 13 },
  { id: 'rightKnee',      side: 'both',  shape: 'ellipse', cx: 76, cy: 202, rx: 12, ry: 13 },
];

const BACK_REGIONS: RegionDef[] = [
  { id: 'neck',           side: 'both',  shape: 'ellipse', cx: 60, cy: 30,  rx: 9,  ry: 8  },
  { id: 'upperBack',      side: 'back',  shape: 'ellipse', cx: 60, cy: 62,  rx: 20, ry: 18 },
  { id: 'midBack',        side: 'back',  shape: 'ellipse', cx: 60, cy: 96,  rx: 17, ry: 16 },
  { id: 'lowBack',        side: 'back',  shape: 'ellipse', cx: 60, cy: 128, rx: 16, ry: 14 },
  { id: 'leftGlute',      side: 'back',  shape: 'ellipse', cx: 44, cy: 152, rx: 16, ry: 16 },
  { id: 'rightGlute',     side: 'back',  shape: 'ellipse', cx: 76, cy: 152, rx: 16, ry: 16 },
  { id: 'leftElbow',      side: 'both',  shape: 'ellipse', cx: 24, cy: 102, rx: 9,  ry: 10 },
  { id: 'rightElbow',     side: 'both',  shape: 'ellipse', cx: 96, cy: 102, rx: 9,  ry: 10 },
  { id: 'leftKnee',       side: 'both',  shape: 'ellipse', cx: 44, cy: 202, rx: 12, ry: 13 },
  { id: 'rightKnee',      side: 'both',  shape: 'ellipse', cx: 76, cy: 202, rx: 12, ry: 13 },
  { id: 'leftAnkle',      side: 'back',  shape: 'ellipse', cx: 44, cy: 242, rx: 9,  ry: 8  },
  { id: 'rightAnkle',     side: 'back',  shape: 'ellipse', cx: 76, cy: 242, rx: 9,  ry: 8  },
];

// Silhouette paths for front and back views (120×260 viewBox)
const FRONT_SILHOUETTE =
  'M60 4 C52 4 46 10 46 18 C46 26 52 32 60 32 C68 32 74 26 74 18 C74 10 68 4 60 4 Z ' + // head
  'M44 32 C36 34 28 40 26 52 L22 90 L18 128 L18 140 L22 140 L26 112 L30 140 L32 200 L34 248 L46 248 L48 200 L52 160 L60 160 L68 160 L72 200 L74 248 L86 248 L88 200 L90 140 L94 112 L98 140 L102 140 L102 128 L98 90 L94 52 C92 40 84 34 76 32 Z'; // body

const BACK_SILHOUETTE = FRONT_SILHOUETTE; // same outline, different regions

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
  const VIEWBOX_W = 120;
  const VIEWBOX_H = 260;
  const height = (width / VIEWBOX_W) * VIEWBOX_H;
  const activeColor = hot ?? COLORS.clay;
  const regions = side === 'front' ? FRONT_REGIONS : BACK_REGIONS;

  return (
    <View style={{ width, height }}>
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      >
        <Defs>
          {selected.map((id) => (
            <RadialGradient key={`glow-${id}`} id={`glow-${id}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={activeColor} stopOpacity="0.35"/>
              <Stop offset="100%" stopColor={activeColor} stopOpacity="0"/>
            </RadialGradient>
          ))}
        </Defs>

        {/* Body silhouette */}
        <Path
          d={side === 'front' ? FRONT_SILHOUETTE : BACK_SILHOUETTE}
          fill={COLORS.surface2}
          stroke={COLORS.border}
          strokeWidth="1"
        />

        {/* Tap regions */}
        {regions.map((r) => {
          const isSelected = selected.includes(r.id);
          const fillColor = isSelected ? activeColor : 'transparent';
          const strokeColor = isSelected ? activeColor : COLORS.border;
          const fillOpacity = isSelected ? 0.3 : 0;

          const sharedProps = {
            key: r.id,
            fill: fillColor,
            fillOpacity,
            stroke: strokeColor,
            strokeWidth: isSelected ? 1.5 : 0.8,
            onPress: onSelect ? () => onSelect(r.id) : undefined,
          };

          return (
            <G key={r.id}>
              {/* Glow layer */}
              {isSelected && r.shape === 'ellipse' && (
                <Ellipse
                  cx={r.cx} cy={r.cy}
                  rx={(r.rx ?? 10) * 1.6}
                  ry={(r.ry ?? 10) * 1.6}
                  fill={`url(#glow-${r.id})`}
                />
              )}

              {/* Region shape */}
              {r.shape === 'ellipse' ? (
                <Ellipse
                  cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry}
                  {...sharedProps}
                />
              ) : r.shape === 'rect' ? (
                <Rect
                  x={r.x} y={r.y} width={r.w} height={r.h}
                  rx={6}
                  {...sharedProps}
                />
              ) : (
                <Path d={r.d} {...sharedProps}/>
              )}

              {/* White dot indicator on selected */}
              {isSelected && r.shape === 'ellipse' && (
                <Circle cx={r.cx} cy={r.cy} r={3} fill="#fff"/>
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
