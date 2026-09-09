import React from 'react';
import { Pressable, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { COLORS } from './tokens';
import type { IconName } from './tokens';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** When provided, the icon is wrapped in a Pressable with a 40x40 touch area. */
  onPress?: () => void;
  /** Applied to the wrapper View / Pressable around the glyph. */
  style?: StyleProp<ViewStyle>;
}

type IconGlyphProps = Pick<IconProps, 'name' | 'size' | 'color' | 'strokeWidth'>;

function IconGlyph({ name, size = 22, color = COLORS.ink, strokeWidth = 1.7 }: IconGlyphProps) {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'back':
      return <Svg {...p}><Path d="M15 5l-7 7 7 7"/></Svg>;

    case 'close':
      return <Svg {...p}><Path d="M6 6l12 12M18 6L6 18"/></Svg>;

    case 'menu':
      return <Svg {...p}><Path d="M4 7h16M4 12h16M4 17h16"/></Svg>;

    case 'more':
      return (
        <Svg {...p}>
          <Circle cx="5" cy="12" r="1.2" fill={color}/>
          <Circle cx="12" cy="12" r="1.2" fill={color}/>
          <Circle cx="19" cy="12" r="1.2" fill={color}/>
        </Svg>
      );

    case 'search':
      return <Svg {...p}><Circle cx="11" cy="11" r="6.5"/><Path d="M16 16l4 4"/></Svg>;

    case 'home':
      return <Svg {...p}><Path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/></Svg>;

    case 'plan':
      return (
        <Svg {...p}>
          <Rect x="4" y="4" width="16" height="16" rx="2"/>
          <Path d="M8 9h8M8 13h6M8 17h4"/>
        </Svg>
      );

    case 'progress':
      return (
        <Svg {...p}>
          <Path d="M4 17l5-5 4 4 7-8"/>
          <Path d="M14 8h6v6"/>
        </Svg>
      );

    case 'profile':
      return (
        <Svg {...p}>
          <Circle cx="12" cy="9" r="3.5"/>
          <Path d="M5 20c1-4 5-5.5 7-5.5s6 1.5 7 5.5"/>
        </Svg>
      );

    case 'play':
      return <Svg {...p}><Path d="M7 5l12 7-12 7z" fill={color} stroke="none"/></Svg>;

    case 'pause':
      return (
        <Svg {...p}>
          <Rect x="7" y="5" width="3" height="14" fill={color} stroke="none"/>
          <Rect x="14" y="5" width="3" height="14" fill={color} stroke="none"/>
        </Svg>
      );

    case 'next':
      return <Svg {...p}><Path d="M9 5l7 7-7 7"/></Svg>;

    case 'check':
      return <Svg {...p}><Path d="M5 12l5 5 9-11"/></Svg>;

    case 'plus':
      return <Svg {...p}><Path d="M12 5v14M5 12h14"/></Svg>;

    case 'flame':
      return <Svg {...p}><Path d="M12 4c-1 4 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 1-5 1 1 2 2 3 0z"/></Svg>;

    case 'clock':
      return <Svg {...p}><Circle cx="12" cy="12" r="8"/><Path d="M12 8v4l3 2"/></Svg>;

    case 'calendar':
      return (
        <Svg {...p}>
          <Rect x="4" y="5" width="16" height="15" rx="2"/>
          <Path d="M4 10h16M9 3v4M15 3v4"/>
        </Svg>
      );

    case 'bell':
      return (
        <Svg {...p}>
          <Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/>
          <Path d="M10 20a2 2 0 0 0 4 0"/>
        </Svg>
      );

    case 'chevron':
      return <Svg {...p}><Path d="M9 6l6 6-6 6"/></Svg>;

    case 'sparkle':
      return <Svg {...p}><Path d="M12 4v6M12 14v6M4 12h6M14 12h6"/></Svg>;

    case 'eye':
      return (
        <Svg {...p}>
          <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/>
          <Circle cx="12" cy="12" r="3"/>
        </Svg>
      );

    case 'lock':
      return (
        <Svg {...p}>
          <Rect x="5" y="11" width="14" height="9" rx="2"/>
          <Path d="M8 11V8a4 4 0 0 1 8 0v3"/>
        </Svg>
      );

    case 'mail':
      return (
        <Svg {...p}>
          <Rect x="3" y="5" width="18" height="14" rx="2"/>
          <Path d="M3 7l9 6 9-6"/>
        </Svg>
      );

    case 'arrowRight':
      return <Svg {...p}><Path d="M5 12h14M13 6l6 6-6 6"/></Svg>;

    case 'pencil':
      return <Svg {...p}><Path d="M4 20h4l11-11-4-4L4 16v4z"/></Svg>;

    case 'heart':
      return <Svg {...p}><Path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></Svg>;

    case 'shield':
      return <Svg {...p}><Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></Svg>;

    case 'bolt':
      return <Svg {...p}><Path d="M13 3L5 14h6l-1 7 8-11h-6z"/></Svg>;

    case 'tap':
      return (
        <Svg {...p}>
          <Path d="M12 4v5M6.4 6.4l3 3M4 12h5"/>
          <Path d="M12.5 12.5l7 2.6-3.1 1.3-1.3 3.1z"/>
        </Svg>
      );

    case 'hand':
      return (
        <Svg {...p}>
          <Path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11"/>
          <Path d="M12 10.5V4.8a1.5 1.5 0 0 1 3 0V11"/>
          <Path d="M15 11V7.5a1.5 1.5 0 0 1 3 0V15a5 5 0 0 1-5 5h-1.6a4 4 0 0 1-3-1.4L6 14.7a1.5 1.5 0 0 1 2.2-2L9 13.6V11"/>
        </Svg>
      );

    case 'volume':
      return (
        <Svg {...p}>
          <Path d="M5 9.5h3l4-3.5v12l-4-3.5H5z"/>
          <Path d="M16 9.2a4 4 0 0 1 0 5.6M18.6 6.6a7.5 7.5 0 0 1 0 10.8"/>
        </Svg>
      );

    case 'volumeOff':
      return (
        <Svg {...p}>
          <Path d="M5 9.5h3l4-3.5v12l-4-3.5H5z"/>
          <Path d="M16 10l4 4M20 10l-4 4"/>
        </Svg>
      );

    case 'info':
      return (
        <Svg {...p}>
          <Circle cx="12" cy="12" r="8.5"/>
          <Path d="M12 11v5.5"/>
          <Circle cx="12" cy="7.9" r="0.9" fill={color} stroke="none"/>
        </Svg>
      );

    case 'warning':
      return (
        <Svg {...p}>
          <Path d="M12 4.2L21 19.2H3z"/>
          <Path d="M12 10v4"/>
          <Circle cx="12" cy="16.6" r="0.9" fill={color} stroke="none"/>
        </Svg>
      );

    case 'trash':
      return (
        <Svg {...p}>
          <Path d="M4 7h16"/>
          <Path d="M9.5 7V5.2h5V7"/>
          <Path d="M6.3 7l.9 12.1a1.6 1.6 0 0 0 1.6 1.5h6.4a1.6 1.6 0 0 0 1.6-1.5L17.7 7"/>
          <Path d="M10.4 11v6M13.6 11v6"/>
        </Svg>
      );

    case 'externalLink':
      return (
        <Svg {...p}>
          <Path d="M13.5 5H19v5.5"/>
          <Path d="M19 5l-8 8"/>
          <Path d="M18 14.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5"/>
        </Svg>
      );

    case 'refresh':
      return (
        <Svg {...p}>
          <Path d="M20 12a8 8 0 1 1-2.6-5.9"/>
          <Path d="M20 4.5V10h-5.5"/>
        </Svg>
      );

    case 'redo':
      return (
        <Svg {...p}>
          <Path d="M9 6L3 12l6 6M3 12h12a6 6 0 0 1 0 12"/>
        </Svg>
      );

    case 'google':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path fill="#4285F4" d="M21.6 12.2c0-.7-.06-1.4-.18-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/>
          <Path fill="#34A853" d="M12 22c2.7 0 5-1 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/>
          <Path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9z"/>
          <Path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6C7.2 7.6 9.4 5.9 12 5.9z"/>
        </Svg>
      );

    case 'apple':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <Path d="M16.4 12.7c0-2.4 1.9-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.9-1.4-.1-2.8.9-3.5.9-.7 0-1.9-.8-3.1-.8-1.6 0-3.1 1-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 3 2.4s1.6-.8 3.1-.8 1.8.8 3.1.8 2.1-1.2 2.9-2.3c.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.7-1-2.7-3.9zM14.2 5.6c.6-.8 1.1-1.9 1-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.7-1.3z"/>
        </Svg>
      );

    default:
      return <Svg {...p}><Circle cx="12" cy="12" r="8"/></Svg>;
  }
}

export function Icon({ name, size, color, strokeWidth, onPress, style }: IconProps) {
  const glyph = <IconGlyph name={name} size={size} color={color} strokeWidth={strokeWidth}/>;

  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={10} style={[styles.touch, style]}>
        {glyph}
      </Pressable>
    );
  }

  if (style) {
    return <View style={style}>{glyph}</View>;
  }

  return glyph;
}

const styles = StyleSheet.create({
  touch: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
