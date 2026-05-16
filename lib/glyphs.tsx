import React from 'react';
import Svg, { Path, Circle, Rect, Ellipse, Line } from 'react-native-svg';
import { COLORS } from './tokens';
import type { GlyphKind } from './tokens';

interface GlyphProps {
  kind?: GlyphKind;
  size?: number;
  color?: string;
  bg?: string;
}

export function Glyph({ kind = 'arc', size = 56, color, bg }: GlyphProps) {
  const c = color ?? COLORS.clay;
  const b = bg ?? COLORS.claySoft;

  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 64 64',
  };

  switch (kind) {
    case 'circle':
      return (
        <Svg {...svgProps}>
          <Circle cx="32" cy="32" r="28" fill={b}/>
          <Circle cx="32" cy="32" r="14" fill={c}/>
        </Svg>
      );

    case 'arc':
      return (
        <Svg {...svgProps}>
          <Circle cx="32" cy="32" r="28" fill={b}/>
          <Path
            d="M16 38 Q32 18 48 38"
            stroke={c} strokeWidth="4" fill="none"
            strokeLinecap="round"
          />
          <Circle cx="32" cy="42" r="3" fill={c}/>
        </Svg>
      );

    case 'spine':
      return (
        <Svg {...svgProps}>
          <Circle cx="32" cy="32" r="28" fill={b}/>
          <Path
            d="M32 14 Q26 24 32 32 Q38 40 32 50"
            stroke={c} strokeWidth="4" fill="none"
            strokeLinecap="round"
          />
          {([18, 26, 34, 42] as const).map((y, i) => (
            <Circle key={i} cx={32 + (i % 2 ? 2 : -2)} cy={y} r="2.4" fill={c}/>
          ))}
        </Svg>
      );

    case 'wrist':
      return (
        <Svg {...svgProps}>
          <Circle cx="32" cy="32" r="28" fill={b}/>
          <Rect x="20" y="22" width="24" height="16" rx="8" fill={c} fillOpacity="0.35"/>
          <Circle cx="32" cy="30" r="6" fill={c}/>
        </Svg>
      );

    case 'neck':
      return (
        <Svg {...svgProps}>
          <Circle cx="32" cy="32" r="28" fill={b}/>
          <Ellipse cx="32" cy="22" rx="9" ry="8" fill={c} fillOpacity="0.4"/>
          <Rect x="26" y="28" width="12" height="18" rx="4" fill={c}/>
        </Svg>
      );

    case 'leaf':
      return (
        <Svg {...svgProps}>
          <Circle cx="32" cy="32" r="28" fill={b}/>
          <Path d="M20 44 Q22 22 44 20 Q42 42 20 44 Z" fill={c}/>
        </Svg>
      );

    case 'wave':
      return (
        <Svg {...svgProps}>
          <Circle cx="32" cy="32" r="28" fill={b}/>
          <Path
            d="M14 36 Q22 28 30 36 T46 36"
            stroke={c} strokeWidth="3.5" fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M14 30 Q22 22 30 30 T46 30"
            stroke={c} strokeWidth="2.5" fill="none"
            strokeLinecap="round"
            strokeOpacity="0.45"
          />
        </Svg>
      );

    case 'dots':
      return (
        <Svg {...svgProps}>
          <Circle cx="32" cy="32" r="28" fill={b}/>
          {([[20,32],[32,32],[44,32],[26,22],[38,22],[26,42],[38,42]] as [number,number][]).map(([x,y], i) => (
            <Circle key={i} cx={x} cy={y} r="3" fill={c}/>
          ))}
        </Svg>
      );

    case 'sun':
      return (
        <Svg {...svgProps}>
          <Circle cx="32" cy="32" r="28" fill={b}/>
          <Circle cx="32" cy="32" r="9" fill={c}/>
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * Math.PI) / 4;
            const x1 = 32 + Math.cos(a) * 15;
            const y1 = 32 + Math.sin(a) * 15;
            const x2 = 32 + Math.cos(a) * 21;
            const y2 = 32 + Math.sin(a) * 21;
            return (
              <Line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={c} strokeWidth="2.5"
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
      );

    case 'check':
      return (
        <Svg {...svgProps}>
          <Circle cx="32" cy="32" r="28" fill={b}/>
          <Path
            d="M22 33 L29 40 L43 25"
            stroke={c} strokeWidth="4" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </Svg>
      );

    case 'flame':
      return (
        <Svg {...svgProps}>
          <Circle cx="32" cy="32" r="28" fill={b}/>
          <Path d="M32 16 Q22 26 24 36 Q26 46 32 48 Q38 46 40 36 Q42 26 32 16 Z" fill={c}/>
          <Circle cx="32" cy="40" r="3" fill={b}/>
        </Svg>
      );

    default:
      return (
        <Svg {...svgProps}>
          <Circle cx="32" cy="32" r="28" fill={b}/>
        </Svg>
      );
  }
}
