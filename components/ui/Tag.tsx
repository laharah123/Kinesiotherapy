import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { COLORS, RADII, fontFor } from '@/lib/tokens';
import type { ToneColor } from '@/lib/tokens';

interface TagProps {
  tone?: ToneColor;
  /** Text label. Takes precedence over `children` when both are supplied. */
  label?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const TONE_BG: Record<ToneColor, string> = {
  clay:    COLORS.claySoft,
  sage:    COLORS.sageSoft,
  ochre:   COLORS.ochreSoft,
  neutral: COLORS.surface2,
};

const TONE_FG: Record<ToneColor, string> = {
  clay:    COLORS.clayDeep,
  sage:    COLORS.sageDeep,
  ochre:   'rgba(140,110,20,1)',
  neutral: COLORS.ink2,
};

export function Tag({ tone = 'neutral', label, children, style, textStyle }: TagProps) {
  return (
    <View style={[styles.base, { backgroundColor: TONE_BG[tone] }, style]}>
      <Text style={[styles.label, { color: TONE_FG[tone] }, textStyle]}>
        {label ?? children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: RADII.r1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontFamily: fontFor('600'),
    fontSize: 12,
  },
});
