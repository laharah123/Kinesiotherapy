import React from 'react';
import { Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { COLORS, FONTS, fontFor } from '@/lib/tokens';

interface EyebrowProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  color?: string;
}

export function Eyebrow({ children, style, color }: EyebrowProps) {
  return (
    <Text style={[styles.base, color ? { color } : undefined, style]}>
      {children}
    </Text>
  );
}

// Shared serif heading styles used across screens
export function H1({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h1, style]}>{children}</Text>;
}

export function H2({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h2, style]}>{children}</Text>;
}

export function H3({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h3, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  base: {
    fontFamily: fontFor('700'),
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.ink3,
  },
  h1: {
    fontFamily: FONTS.serif,
    fontSize: 36,
    lineHeight: 42,
    color: COLORS.ink,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: FONTS.serif,
    fontSize: 26,
    lineHeight: 32,
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: FONTS.serif,
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.ink,
    letterSpacing: -0.2,
  },
});
