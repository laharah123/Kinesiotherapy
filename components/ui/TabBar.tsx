import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { COLORS, FONTS, SHADOWS } from '@/lib/tokens';
import { Icon } from '@/lib/icons';
import type { IconName } from '@/lib/tokens';

type TabKey = 'home' | 'plan' | 'progress' | 'profile';

interface TabItem {
  key: TabKey;
  label: string;
  icon: IconName;
  href: string;
}

const TABS: TabItem[] = [
  { key: 'home',     label: 'Today',    icon: 'home',     href: '/' },
  { key: 'plan',     label: 'Plan',     icon: 'plan',     href: '/plan' },
  { key: 'progress', label: 'Progress', icon: 'progress', href: '/progress' },
  { key: 'profile',  label: 'You',      icon: 'profile',  href: '/profile' },
];

interface TabBarProps {
  active?: TabKey;
}

export function TabBar({ active }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const currentKey = active ?? (
    TABS.find(t => pathname === t.href || pathname.startsWith(t.href + '/'))?.key ?? 'home'
  );

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 8 }, SHADOWS.card]}>
      {TABS.map((tab) => {
        const isActive = tab.key === currentKey;
        const iconColor = isActive ? COLORS.clay : COLORS.ink3;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            activeOpacity={0.7}
            onPress={() => router.push(tab.href as any)}
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
