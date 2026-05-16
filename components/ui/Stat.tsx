import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADII, FONTS } from '@/lib/tokens';
import type { ToneColor } from '@/lib/tokens';

interface StatProps {
  label: string;
  value: string;
  unit?: string;
  tone?: ToneColor;
}

const TONE_MAP: Record<ToneColor, { bg: string; fg: string }> = {
  clay:    { bg: COLORS.claySoft,  fg: COLORS.clayDeep },
  sage:    { bg: COLORS.sageSoft,  fg: COLORS.sageDeep },
  ochre:   { bg: COLORS.ochreSoft, fg: 'rgba(120,90,10,1)' },
  neutral: { bg: COLORS.surface2,  fg: COLORS.ink2 },
};

export function Stat({ label, value, unit, tone = 'clay' }: StatProps) {
  const { bg, fg } = TONE_MAP[tone];
  return (
    <View style={[styles.base, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
      <View style={styles.row}>
        <Text style={[styles.value, { color: fg }]}>{value}</Text>
        {unit ? <Text style={[styles.unit, { color: fg }]}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADII.r2,
    padding: 12,
    flex: 1,
  },
  label: {
    fontFamily: FONTS.sans,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginTop: 6,
  },
  value: {
    fontFamily: FONTS.serif,
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  unit: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    marginBottom: 3,
    opacity: 0.7,
  },
});
