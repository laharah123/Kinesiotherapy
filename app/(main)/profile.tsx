import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking,
  type DimensionValue,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useAuthStore } from '@/lib/store/auth';
import { useIntakeStore } from '@/lib/store/intake';
import { useProgressStore } from '@/lib/store/progress';
import { signOut } from '@/lib/supabase';
import { PRIVACY_URL } from '@/lib/plans/links';
import { CONDITION_MAP } from '@/data/conditions';
import { AppBar } from '@/components/ui/AppBar';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Icon } from '@/lib/icons';
import { COLORS, FONTS, RADII, type IconName, fontFor } from '@/lib/tokens';

interface SettingRowProps {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
}

function SettingRow({ icon, label, value, onPress }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.6}
    >
      <View style={styles.settingIcon}>
        <Icon name={icon} size={18} color={COLORS.ink2}/>
      </View>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.settingRight}>
        {value ? <Text style={styles.settingValue}>{value}</Text> : null}
        {onPress ? <Icon name="chevron" size={16} color={COLORS.ink4}/> : null}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router  = useRouter();
  const { profile, subscription, isTrialing, trialDaysLeft, signOut: clearAuth } = useAuthStore();
  const { generatedPlan, selectedCondition, selectedRegions, completedDays } = useIntakeStore();
  const { streak } = useProgressStore();

  const initials = profile?.displayName
    ? profile.displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : '';

  const conditionName = selectedCondition
    ? CONDITION_MAP[selectedCondition]?.name
    : null;

  // Progress is days done out of the days that ask for a session.
  const activeDays = generatedPlan
    ? generatedPlan.schedule.filter((d) => !d.isRest).length
    : 0;
  const planProgress = activeDays > 0
    ? Math.min(100, Math.round((completedDays.length / activeDays) * 100))
    : 0;

  function confirmRebuildPlan() {
    Alert.alert(
      'Rebuild plan?',
      'Answering the questions again replaces your current plan and its progress.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rebuild',
          style: 'destructive',
          onPress: () => router.push('/(intake)/questionnaire'),
        },
      ],
    );
  }

  async function openPrivacy() {
    try {
      await Linking.openURL(PRIVACY_URL);
    } catch {
      Alert.alert('Could not open the privacy policy', 'Please try again later.');
    }
  }

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
    <View style={styles.root}>
      {/* AppBar applies the top inset itself */}
      <AppBar title="You"/>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.displayName}>{profile?.displayName ?? 'You'}</Text>
          <View style={styles.memberRow}>
            <Text style={styles.memberSub}>Member since {memberSince}</Text>
            {streak > 0 && (
              <>
                <Text style={styles.memberSub}> · </Text>
                <Icon name="flame" size={13} color={COLORS.ochre}/>
                <Text style={styles.memberSub}> {streak} day streak</Text>
              </>
            )}
          </View>
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
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Rebuild plan"
                  onPress={confirmRebuildPlan}
                >
                  <Icon name="pencil" size={18} color={COLORS.ink3}/>
                </TouchableOpacity>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${planProgress}%` as DimensionValue }]}/>
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
          {/* Effort follows the plan's adapted pain EMA, so it is shown, not set. */}
          <SettingRow
            icon="bolt"
            label="Effort level"
            value={generatedPlan?.effort ?? '—'}
          />
          <View style={styles.settingDivider}/>
          <SettingRow
            icon="plan"
            label="Rebuild my plan"
            onPress={confirmRebuildPlan}
          />
          <View style={styles.settingDivider}/>
          <SettingRow
            icon="lock"
            label="Privacy & data"
            onPress={openPrivacy}
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
                  Renews {new Date(subscription.currentPeriodEnds).toLocaleDateString(undefined, {
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
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  memberSub: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3 },
  trialPill: {
    marginTop: 12, backgroundColor: COLORS.ochreSoft,
    borderRadius: RADII.r4, paddingHorizontal: 14, paddingVertical: 6,
  },
  trialText: { fontFamily: fontFor('600'), fontSize: 12, color: COLORS.ochre },

  sectionLabel: {
    fontFamily: fontFor('700'), fontSize: 11,
    letterSpacing: 1, textTransform: 'uppercase', color: COLORS.ink3,
    marginBottom: 10, marginTop: 4 },

  planCard: { marginBottom: 24, padding: 16 },
  planHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  planInfo: { flex: 1 },
  planName: { fontFamily: fontFor('600'), fontSize: 15, color: COLORS.ink },
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
  settingLabel: { flex: 1, fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingValue: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3 },
  settingDivider: { height: 1, backgroundColor: COLORS.borderSoft, marginLeft: 62 },

  subCard: { marginBottom: 24, padding: 16 },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  subPlan: { fontFamily: fontFor('600'), fontSize: 15, color: COLORS.ink },
  subRenews: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3 },

  signOutBtn: { alignItems: 'center', paddingVertical: 14, marginBottom: 8 },
  signOutText: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.clay },
  version: {
    fontFamily: FONTS.sans, fontSize: 11, color: COLORS.ink4, textAlign: 'center',
  },
});
