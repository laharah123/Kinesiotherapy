import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { COLORS, RADII, FONTS } from '@/lib/tokens';
import { Icon } from '@/lib/icons';

interface ChoiceProps {
  value: string;
  subtitle?: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Choice({ value, subtitle, selected = false, onPress }: ChoiceProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[
        styles.base,
        selected ? styles.selected : styles.unselected,
      ]}
    >
      <View style={styles.text}>
        <Text style={[styles.value, selected && styles.valueSelected]}>{value}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, selected && styles.subtitleSelected]}>{subtitle}</Text>
        ) : null}
      </View>
      <View style={[styles.radio, selected ? styles.radioSelected : styles.radioUnselected]}>
        {selected && <Icon name="check" size={12} color="#fff" strokeWidth={2.6}/>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADII.r2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
  },
  selected: {
    borderColor: COLORS.clay,
    backgroundColor: COLORS.claySoft,
  },
  unselected: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  text: {
    flex: 1,
  },
  value: {
    fontFamily: FONTS.sans,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.ink,
  },
  valueSelected: {
    color: COLORS.clayDeep,
  },
  subtitle: {
    fontFamily: FONTS.sans,
    fontSize: 12.5,
    color: COLORS.ink3,
    marginTop: 2,
  },
  subtitleSelected: {
    color: COLORS.clay,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.clay,
    backgroundColor: COLORS.clay,
  },
  radioUnselected: {
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
});
