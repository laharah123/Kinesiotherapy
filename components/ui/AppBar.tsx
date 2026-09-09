import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, fontFor } from '@/lib/tokens';
import { Icon } from '@/lib/icons';
import type { IconName } from '@/lib/tokens';

// ─── IconBtn ────────────────────────────────────────────────────────────────

interface IconBtnProps {
  /** Icon to render. Alias of `name` — takes precedence when both are given. */
  icon?: IconName;
  name?: IconName;
  onPress?: () => void;
  color?: string;
  tinted?: boolean;
}

export function IconBtn({ icon, name, onPress, color, tinted = false }: IconBtnProps) {
  const iconColor = color ?? (tinted ? '#fff' : COLORS.ink);
  const iconName = icon ?? name;
  if (!iconName) return null;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={8}
      style={[styles.iconBtn, tinted && styles.iconBtnTinted]}
    >
      <Icon name={iconName} size={20} color={iconColor}/>
    </TouchableOpacity>
  );
}

// ─── AppBar ─────────────────────────────────────────────────────────────────

interface AppBarProps {
  left?: React.ReactNode;
  title?: React.ReactNode;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Set true for dark (session) screens so safe-area padding uses dark bg */
  dark?: boolean;
}

export function AppBar({ left, title, right, style, dark = false }: AppBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }, style]}>
      <View style={styles.side}>{left ?? <View style={styles.iconBtn}/>}</View>

      <View style={styles.titleWrap}>
        {typeof title === 'string' ? (
          <Text style={[styles.title, dark && styles.titleDark]} numberOfLines={1}>
            {title}
          </Text>
        ) : (
          title ?? null
        )}
      </View>

      <View style={[styles.side, styles.sideRight]}>{right ?? <View style={styles.iconBtn}/>}</View>
    </View>
  );
}

// ─── SegmentedControl ────────────────────────────────────────────────────────

interface SegmentedControlProps {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl({ options, value, onChange, style }: SegmentedControlProps) {
  return (
    <View style={[styles.segRow, style]}>
      {options.map((opt) => {
        const on = opt === value;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            activeOpacity={0.8}
            style={[styles.seg, on ? styles.segOn : styles.segOff]}
          >
            <Text style={[styles.segLabel, on ? styles.segLabelOn : styles.segLabelOff]}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  side: {
    width: 40,
    alignItems: 'flex-start',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontFamily: fontFor('600'),
    fontSize: 15,
    color: COLORS.ink,
  },
  titleDark: {
    color: 'rgba(255,255,255,0.85)',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnTinted: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  // Segmented control
  segRow: {
    flexDirection: 'row',
    gap: 8,
  },
  seg: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  segOn: {
    backgroundColor: COLORS.ink,
    borderColor: COLORS.ink,
  },
  segOff: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  segLabel: {
    fontFamily: fontFor('500'),
    fontSize: 13,
  },
  segLabelOn: {
    color: COLORS.bg,
  },
  segLabelOff: {
    color: COLORS.ink2,
  },
});
