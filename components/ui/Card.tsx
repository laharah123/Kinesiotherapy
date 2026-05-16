import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { COLORS, RADII, SHADOWS } from '@/lib/tokens';

interface CardProps {
  children: React.ReactNode;
  padding?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
}

export function Card({ children, padding = 16, onPress, style, elevated = false }: CardProps) {
  const containerStyle = [
    styles.base,
    elevated ? SHADOWS.cardHi : SHADOWS.card,
    { padding },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={containerStyle}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.r3,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
});
