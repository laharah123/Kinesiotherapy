import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { COLORS, RADII, FONTS } from '@/lib/tokens';
import { Icon } from '@/lib/icons';
import type { IconName } from '@/lib/tokens';

type Variant = 'primary' | 'ghost';

interface ButtonProps {
  variant?: Variant;
  full?: boolean;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  /** Text label. Takes precedence over `children` when both are supplied. */
  label?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  variant = 'primary',
  full = false,
  icon,
  iconPosition = 'right',
  loading = false,
  disabled = false,
  label,
  children,
  onPress,
  style,
  textStyle,
}: ButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.78}
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.ghost,
        full && styles.full,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : COLORS.clay} size="small"/>
      ) : (
        <View style={styles.row}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>
              <Icon name={icon} size={16} color={isPrimary ? '#fff' : COLORS.clay}/>
            </View>
          )}
          <Text style={[
            styles.label,
            isPrimary ? styles.labelPrimary : styles.labelGhost,
            textStyle,
          ]}>
            {label ?? children}
          </Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>
              <Icon name={icon} size={16} color={isPrimary ? '#fff' : COLORS.clay}/>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: RADII.r4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: COLORS.clay,
  },
  ghost: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  full: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.45,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontFamily: FONTS.sans,
    fontSize: 15,
    fontWeight: '600',
  },
  labelPrimary: {
    color: '#fff',
  },
  labelGhost: {
    color: COLORS.ink,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
