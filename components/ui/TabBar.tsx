import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { COLORS, FONTS, SHADOWS } from '@/lib/tokens';
import { Icon } from '@/lib/icons';
import type { IconName } from '@/lib/tokens';

/** Route names as registered in app/(main)/_layout.tsx */
type TabKey = 'index' | 'plan' | 'progress' | 'profile';

interface TabItem {
  key: TabKey;
  label: string;
  icon: IconName;
}

const TABS: TabItem[] = [
  { key: 'index',    label: 'Today',    icon: 'home' },
  { key: 'plan',     label: 'Plan',     icon: 'plan' },
  { key: 'progress', label: 'Progress', icon: 'progress' },
  { key: 'profile',  label: 'You',      icon: 'profile' },
];

export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const activeRoute = state.routes[state.index]?.name ?? 'index';
  const bottomInset = insets?.bottom ?? 0;

  return (
    <View style={[styles.bar, { paddingBottom: bottomInset + 8 }, SHADOWS.card]}>
      {TABS.map((tab) => {
        const isActive = tab.key === activeRoute;
        const iconColor = isActive ? COLORS.clay : COLORS.ink3;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => {
              if (!isActive) navigation.navigate(tab.key);
            }}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Icon name={tab.icon} size={22} color={iconColor}/>
            </View>
            <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
              {tab.label}
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
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  iconWrap: {
    width: 44,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: COLORS.claySoft,
  },
  label: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '500',
  },
  labelActive: {
    color: COLORS.clay,
  },
  labelInactive: {
    color: COLORS.ink3,
  },
});
