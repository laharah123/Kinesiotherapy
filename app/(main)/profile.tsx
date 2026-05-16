import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/lib/store/auth';
import { useIntakeStore } from '@/lib/store/intake';
import { useProgressStore } from '@/lib/store/progress';
import { signOut } from '@/lib/supabase';
import { CONDITION_MAP } from '@/data/conditions';
import { AppBar } from '@/components/ui/AppBar';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Icon } from '@/lib/icons';
import { COLORS, FONTS, RADII } from '@/lib/tokens';

interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  tinted?: boolean;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
}

function SettingRow({
  icon, label, value, onPress, tinted, toggle, toggleValue, onToggle,
}: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress && !toggle}
      activeOpacity={0.6}
    >
      <View style={[styles.settingIcon, tinted && styles.settingIconTinted]}>
        <Icon name={icon as any} size={18} color={tinted ? COLORS.clay : COLORS.ink2}/>
      </View>
      <Text style={[styles.settingLabel, tinted && styles.settingLabelTinted]}>{label}</Text>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ true: COLORS.clay, false: COLORS.borderSoft }}
          thumbColor="#fff"
        />
      ) : (
        <View style={styles.settingRight}>
          {value && <Text style={styles.settingValue}>{value}</Text>}
          {onPress && <Icon name="chevron" size={16} color={COLORS.ink4}/>}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { profile, subscription, isTrialing, trialDaysLeft, signOut: clearAuth } = useAuthStore();
  const { generatedPlan, selectedCondition, selectedRegions, toggleRegion } = useIntakeStore();
  const { streak } = useProgressStore();

  const [reminders, setReminders]     = useState(true);
  const [sessionLength, setSessionLen] = useState<'15' | '20' | '30'>('20');

  const initials = profile?.displayName
    ? profile.displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  const conditionName = selectedCondition
    ? CONDITION_MAP[selectedCondition]?.name
    : null;

  const planProgress = generatedPlan
    ? Math.round(
        (generatedPlan.schedule.filter((d) => !d.isRest && d.exercises.length > 0).length /
          Math.max(1, generatedPlan.schedule.filter((d) => !d.isRest).length)) * 100,
      )
    : 0;

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          clearAuth();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <AppBar
        title="You"
        right={<Icon name="more" size={22} color={COLORS.ink}/>}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.displayName}>{profile?.displayName ?? 'You'}</Text>
          <Text style={styles.memberSub}>
            Member since {memberSince}
            {streak > 0 ? `  ·  🔥 ${streak} day streak` : ''}
          </Text>
          {isTrialing && (
            <TouchableOpacity
              style={styles.trialPill}
              onPress={() => router.push('/subscription/plans')}
            >
              <Text style={styles.trialText}>
                {trialDaysLeft > 0
                  ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left in trial`
                  : 'Trial ended — subscribe to continue'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Active plan card */}
        {generatedPlan && (
          <>
            <Text style={styles.sectionLabel}>Active plan</Text>
            <Card style={styles.planCard}>
              <View style={styles.planHeader}>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{generatedPlan.title}</Text>
                  <Text style={styles.planSub}>
                    {generatedPlan.durationDays} day programme · {generatedPlan.effort}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(intake)/questionnaire')}>
                  <Icon name="pencil" size={18} color={COLORS.ink3}/>
                </TouchableOpacity>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${planProgress}%` as any }]}/>
              </View>
              <Text style={styles.progressLabel}>{planProgress}% complete</Text>
            </Card>
          </>
        )}

        {/* Working on */}
        <Text style={styles.sectionLabel}>Working on</Text>
        <View style={styles.tagsRow}>
          {conditionName && (
            <Tag label={conditionName} tone="clay"/>
          )}
          {selectedRegions.slice(0, 4).map((r) => (
            <Tag
              key={r}
              label={r.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
              tone="neutral"
            />
          ))}
          <TouchableOpacity
            style={styles.addAreaBtn}
            onPress={() => router.push('/(intake)/body-map')}
          >
            <Icon name="plus" size={12} color={COLORS.ink3}/>
            <Text style={styles.addAreaText}>Add area</Text>
          </TouchableOpacity>
        </View>

        {/* Settings */}
        <Text style={styles.sectionLabel}>Settings</Text>
        <Card style={styles.settingsCard}>
          <SettingRow
            icon="bell"
            label="Daily reminder"
            toggle
            toggleValue={reminders}
            onToggle={setReminders}
          />
          <View style={styles.settingDivider}/>
          <SettingRow
            icon="clock"
            label="Session length"
            value={`${sessionLength} min`}
            onPress={() => {
              const next: Record<string, '15' | '20' | '30'> = { '15': '20', '20': '30', '30': '15' };
              setSessionLen((v) => next[v]);
            }}
          />
          <View style={styles.settingDivider}/>
          <SettingRow
            icon="bolt"
            label="Effort level"
            value={generatedPlan?.effort ?? 'Light'}
            onPress={() => router.push('/(intake)/questionnaire')}
          />
          <View style={styles.settingDivider}/>
          <SettingRow
            icon="shield"
            label="Therapist on call"
            tinted
            onPress={() => router.push('/subscription/plans')}
          />
          <View style={styles.settingDivider}/>
          <SettingRow
            icon="lock"
            label="Privacy & data"
            onPress={() => {}}
          />
        </Card>

        {/* Subscription status */}
        {subscription?.status === 'active' && (
          <>
            <Text style={styles.sectionLabel}>Subscription</Text>
            <Card style={styles.subCard}>
              <View style={styles.subRow}>
                <Text style={styles.subPlan}>
                  {subscription.planType === 'yearly' ? 'Yearly plan' : 'Monthly plan'}
                </Text>
                <Tag label="Active" tone="sage"/>
              </View>
              {subscription.currentPeriodEnds && (
                <Text style={styles.subRenews}>
                  Renews {new Date(subscription.currentPeriodEnds).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </Text>
              )}
            </Card>
          </>
        )}

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Kinesiotherapy v1.0.0</Text>

        <View style={{ height: 80 }}/>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 20 },

  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: COLORS.claySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontFamily: FONTS.serif, fontSize: 32, color: COLORS.clay },
  displayName: { fontFamily: FONTS.serif, fontSize: 24, color: COLORS.ink, marginBottom: 4 },
  memberSub: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3 },
  trialPill: {
    marginTop: 12, backgroundColor: COLORS.ochreSoft,
    borderRadius: RADII.r4, paddingHorizontal: 14, paddingVertical: 6,
  },
  trialText: { fontFamily: FONTS.sans, fontSize: 12, fontWeight: '600', color: COLORS.ochre },

  sectionLabel: {
    fontFamily: FONTS.sans, fontSize: 11, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', color: COLORS.ink3,
    marginBottom: 10, marginTop: 4,
  },

  planCard: { marginBottom: 24, padding: 16 },
  planHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  planInfo: { flex: 1 },
  planName: { fontFamily: FONTS.sans, fontSize: 15, fontWeight: '600', color: COLORS.ink },
  planSub: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3, marginTop: 2 },
  progressTrack: {
    height: 6, borderRadius: 3, backgroundColor: COLORS.borderSoft, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.clay },
  progressLabel: {
    fontFamily: FONTS.sans, fontSize: 11, color: COLORS.ink3, marginTop: 6,
  },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  addAreaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
    borderRadius: RADII.r4, paddingHorizontal: 12, paddingVertical: 5,
  },
  addAreaText: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3 },

  settingsCard: { marginBottom: 24, padding: 0, overflow: 'hidden' },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  settingIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: COLORS.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  settingIconTinted: { backgroundColor: COLORS.claySoft },
  settingLabel: { flex: 1, fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink },
  settingLabelTinted: { color: COLORS.clay, fontWeight: '600' },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingValue: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3 },
  settingDivider: { height: 1, backgroundColor: COLORS.borderSoft, marginLeft: 62 },

  subCard: { marginBottom: 24, padding: 16 },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  subPlan: { fontFamily: FONTS.sans, fontSize: 15, fontWeight: '600', color: COLORS.ink },
  subRenews: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3 },

  signOutBtn: { alignItems: 'center', paddingVertical: 14, marginBottom: 8 },
  signOutText: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.clay },
  version: {
    fontFamily: FONTS.sans, fontSize: 11, color: COLORS.ink4, textAlign: 'center',
  },
});
