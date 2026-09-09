import { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/lib/store/auth';
import { useIntakeStore } from '@/lib/store/intake';
import { useProgressStore } from '@/lib/store/progress';
import { fetchWeeklyPain } from '@/lib/supabase';
import { canStartSession, PAYWALL_ROUTE } from '@/lib/access';
import { usePlanSync } from '@/lib/plans/usePlanSync';
import { EXERCISE_MAP } from '@/data/exercises';
import { CONDITION_MAP } from '@/data/conditions';
import { Glyph } from '@/lib/glyphs';
import { Icon } from '@/lib/icons';
import { Card } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { Tag } from '@/components/ui/Tag';
import { COLORS, FONTS, RADII, fontFor } from '@/lib/tokens';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

export default function HomeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { profile, trialDaysLeft, isTrialing } = useAuthStore();
  const { generatedPlan, selectedCondition, getCurrentDay, getNextActiveDay } = useIntakeStore();
  const { streak, sessionsThisWeek, weeklyPain, setWeeklyPain } = useProgressStore();

  // Pulls the active plan down when there is none locally, and pushes a plan
  // that was built offline once the user is signed in.
  usePlanSync();

  const plan = generatedPlan;
  const painDays = weeklyPain.filter((v) => v > 0);
  const avgPain  = painDays.length
    ? painDays.reduce((a, b) => a + b, 0) / painDays.length
    : 0;

  const today       = getCurrentDay();
  const nextActive  = getNextActiveDay();
  const isRestDay   = today?.isRest ?? false;
  const doneToday   = today?.completedToday ?? false;
  // On a rest day or a finished day, the card previews the next real session.
  const previewDay  = !today || isRestDay || doneToday ? nextActive : today;

  const todayExercises = previewDay?.exercises ?? [];
  const todayCount     = todayExercises.length;
  const firstExId      = todayExercises[0]?.exerciseId;
  const firstEx        = firstExId ? EXERCISE_MAP[firstExId] : null;
  const sessionMins    = todayExercises.reduce((acc, e) => {
    const ex = EXERCISE_MAP[e.exerciseId];
    return acc + (ex ? Math.ceil(ex.durationEstimateSecs / 60) : 2);
  }, 0);

  // Other programmes the user could switch to
  const suggestions = Object.values(CONDITION_MAP)
    .filter((c) => c.id !== selectedCondition)
    .slice(0, 3);

  useEffect(() => {
    async function loadProgress() {
      if (!profile?.id) return;
      try {
        const pain = await fetchWeeklyPain(profile.id);
        setWeeklyPain(pain);
      } catch { /* offline */ }
    }
    loadProgress();
  }, [profile?.id]);

  function startSession() {
    if (!canStartSession()) {
      router.push(PAYWALL_ROUTE);
      return;
    }
    router.push('/session/today');
  }

  function confirmSwitchPlan(conditionId: string, name: string) {
    Alert.alert(
      'Switch plan?',
      `Building a ${name} programme replaces your current plan and its progress.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          style: 'destructive',
          onPress: () => {
            useIntakeStore.getState().setCondition(conditionId);
            router.push('/(intake)/questionnaire');
          },
        },
      ],
    );
  }

  const initials = profile?.displayName
    ? profile.displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting row. This screen has no AppBar, so it owns its safe area. */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.eyebrow}>{todayLabel()}</Text>
          <Text style={styles.greetingText}>{greeting()}{profile?.displayName ? `, ${profile.displayName.split(' ')[0]}` : ''}.</Text>
        </View>
        <View style={styles.topRight}>
          {isTrialing && trialDaysLeft > 0 && (
            <TouchableOpacity
              style={styles.trialBadge}
              onPress={() => router.push('/subscription/plans')}
            >
              <Text style={styles.trialText}>Day {8 - trialDaysLeft} of 7</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.push('/(main)/profile')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {!plan ? (
        <Card style={styles.emptyCard} onPress={() => router.push('/(intake)/body-map')}>
          <Glyph kind="spine" size={48} color={COLORS.clay} bg={COLORS.claySoft}/>
          <Text style={styles.emptyTitle}>No plan yet</Text>
          <Text style={styles.emptyBody}>Tell us where it hurts and we'll build your routine.</Text>
          <View style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>Get started</Text>
            <Icon name="arrowRight" size={14} color={COLORS.clay}/>
          </View>
        </Card>
      ) : !today ? (
        <Card style={styles.emptyCard}>
          <Glyph kind="check" size={48} color={COLORS.sageDeep} bg={COLORS.sageSoft}/>
          <Text style={styles.emptyTitle}>Programme complete</Text>
          <Text style={styles.emptyBody}>
            You have finished every day of {plan.title}. Build a new plan when you are ready.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push('/(intake)/body-map')}
          >
            <Text style={styles.emptyBtnText}>Build a new plan</Text>
            <Icon name="arrowRight" size={14} color={COLORS.clay}/>
          </TouchableOpacity>
        </Card>
      ) : doneToday ? (
        <Card style={styles.restCard}>
          <Glyph kind="check" size={44} color={COLORS.sageDeep} bg={COLORS.sageSoft}/>
          <Text style={styles.restTitle}>Done for today</Text>
          <Text style={styles.restBody}>
            Day {today.day} of {plan.durationDays} is complete. Rest is part of the programme.
          </Text>
          {nextActive && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={startSession}>
              <Text style={styles.secondaryBtnText}>Do another session</Text>
              <Icon name="arrowRight" size={14} color={COLORS.clay}/>
            </TouchableOpacity>
          )}
        </Card>
      ) : isRestDay ? (
        <Card style={styles.restCard}>
          <Glyph kind="leaf" size={44} color={COLORS.sageDeep} bg={COLORS.sageSoft}/>
          <Text style={styles.restTitle}>Rest day</Text>
          <Text style={styles.restBody}>
            Day {today.day} of {plan.durationDays}. Recovery is when the work settles in.
          </Text>
          {nextActive && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={startSession}>
              <Text style={styles.secondaryBtnText}>Train anyway</Text>
              <Icon name="arrowRight" size={14} color={COLORS.clay}/>
            </TouchableOpacity>
          )}
        </Card>
      ) : (
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={startSession}
          style={styles.sessionCardWrap}
        >
          <LinearGradient
            colors={[COLORS.clay, COLORS.clayDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sessionCard}
          >
            <Text style={styles.sessionEyebrow}>
              {plan.title} · Day {today.day} of {plan.durationDays}
            </Text>
            <Text style={styles.sessionTitle}>
              {firstEx?.name ?? 'Your session'} & more
            </Text>

            <View style={styles.sessionMeta}>
              <View style={styles.metaItem}>
                <Icon name="clock" size={14} color="rgba(255,255,255,0.7)"/>
                <Text style={styles.metaText}>{sessionMins} min</Text>
              </View>
              <View style={styles.metaItem}>
                <Icon name="plan" size={14} color="rgba(255,255,255,0.7)"/>
                <Text style={styles.metaText}>{todayCount} exercises</Text>
              </View>
              <View style={styles.metaItem}>
                <Icon name="bolt" size={14} color="rgba(255,255,255,0.7)"/>
                <Text style={styles.metaText}>{plan.effort}</Text>
              </View>
            </View>

            <View style={styles.beginBtn}>
              <Text style={styles.beginBtnText}>Begin session</Text>
              <Icon name="arrowRight" size={16} color={COLORS.clay}/>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Stat
          label="Streak"
          value={String(streak)}
          unit="days"
          tone="ochre"
          style={styles.statItem}
        />
        <Stat
          label="This week"
          value={String(sessionsThisWeek)}
          unit="sessions"
          tone="sage"
          style={styles.statItem}
        />
        <Stat
          label="Pain avg"
          value={avgPain > 0 ? avgPain.toFixed(1) : '—'}
          unit={avgPain > 0 ? '/ 4' : ''}
          tone="clay"
          style={styles.statItem}
        />
      </View>

      {/* Other programmes. Switching replaces the current plan, so confirm first. */}
      <Text style={styles.sectionLabel}>Other programmes</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.suggestRow}
      >
        {suggestions.map((cond) => (
          <TouchableOpacity
            key={cond.id}
            style={styles.suggestCard}
            onPress={() => confirmSwitchPlan(cond.id, cond.name)}
            activeOpacity={0.75}
          >
            <Glyph kind={cond.glyphKind} size={40} color={COLORS.clay} bg={COLORS.claySoft}/>
            <Text style={styles.suggestTitle}>{cond.name}</Text>
            <Text style={styles.suggestSub}>{cond.routineTemplate.dailyMinutes} min/day</Text>
            <Tag label={cond.badgeText} tone={cond.tone}/>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 20, paddingBottom: 100 },

  topRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 24,
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrow: {
    fontFamily: fontFor('700'), fontSize: 11,
    letterSpacing: 1, textTransform: 'uppercase', color: COLORS.ink3,
    marginBottom: 4 },
  greetingText: { fontFamily: FONTS.serif, fontSize: 26, color: COLORS.ink },
  trialBadge: {
    backgroundColor: COLORS.ochreSoft, borderRadius: RADII.r4,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  trialText: { fontFamily: fontFor('700'), fontSize: 11, color: COLORS.ochre },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.claySoft, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: FONTS.serif, fontSize: 16, color: COLORS.clay },

  // Session card
  sessionCardWrap: { marginBottom: 20, borderRadius: RADII.r3, overflow: 'hidden' },
  sessionCard: { padding: 22, borderRadius: RADII.r3 },
  sessionEyebrow: {
    fontFamily: fontFor('700'), fontSize: 10,
    letterSpacing: 1.2, textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.65)', marginBottom: 6 },
  sessionTitle: {
    fontFamily: FONTS.serif, fontSize: 22, color: '#fff', marginBottom: 16,
  },
  sessionMeta: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: FONTS.sans, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  beginBtn: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: RADII.r4,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  beginBtnText: { fontFamily: fontFor('700'), fontSize: 14, color: COLORS.clay },

  // Rest / done card
  restCard: { alignItems: 'center', padding: 26, marginBottom: 20, gap: 8 },
  restTitle: { fontFamily: FONTS.serif, fontSize: 22, color: COLORS.ink, marginTop: 4 },
  restBody: {
    fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3,
    textAlign: 'center', lineHeight: 19,
  },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
  },
  secondaryBtnText: { fontFamily: fontFor('600'), fontSize: 14, color: COLORS.clay },

  // Empty state
  emptyCard: { alignItems: 'center', padding: 28, marginBottom: 20, gap: 8 },
  emptyTitle: { fontFamily: FONTS.serif, fontSize: 20, color: COLORS.ink, marginTop: 4 },
  emptyBody: {
    fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3,
    textAlign: 'center', lineHeight: 19,
  },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
  },
  emptyBtnText: { fontFamily: fontFor('600'), fontSize: 14, color: COLORS.clay },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statItem: { flex: 1 },

  // Other programmes
  sectionLabel: {
    fontFamily: fontFor('700'), fontSize: 11,
    letterSpacing: 1, textTransform: 'uppercase', color: COLORS.ink3,
    marginBottom: 12 },
  suggestRow: { gap: 12, paddingRight: 20 },
  suggestCard: {
    width: 148, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r2, padding: 14, gap: 6,
  },
  suggestTitle: {
    fontFamily: fontFor('600'), fontSize: 13, color: COLORS.ink },
  suggestSub: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3 },
});
