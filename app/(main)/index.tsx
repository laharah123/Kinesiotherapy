import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/lib/store/auth';
import { useIntakeStore } from '@/lib/store/intake';
import { useProgressStore } from '@/lib/store/progress';
import { fetchActivePlan, fetchWeeklyPain } from '@/lib/supabase';
import { EXERCISE_MAP } from '@/data/exercises';
import { CONDITION_MAP } from '@/data/conditions';
import { Glyph } from '@/lib/glyphs';
import { Icon } from '@/lib/icons';
import { Card } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { Tag } from '@/components/ui/Tag';
import { COLORS, FONTS, RADII } from '@/lib/tokens';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

export default function HomeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { profile, trialDaysLeft, isTrialing } = useAuthStore();
  const { generatedPlan } = useIntakeStore();
  const { streak, sessionsThisWeek, weeklyPain, setWeeklyPain } = useProgressStore();

  const [remotePlan, setRemotePlan] = useState<any>(null);

  const plan = generatedPlan;
  const avgPain = weeklyPain.length
    ? (weeklyPain.reduce((a, b) => a + b, 0) / weeklyPain.filter((v) => v > 0).length || 0)
    : 0;

  // Today's exercises (day 1 for a fresh plan)
  const todayExercises = plan?.schedule.find((d) => !d.isRest)?.exercises ?? [];
  const todayCount     = todayExercises.length;
  const firstExId      = todayExercises[0]?.exerciseId;
  const firstEx        = firstExId ? EXERCISE_MAP[firstExId] : null;
  const sessionMins    = todayExercises.reduce((acc, e) => {
    const ex = EXERCISE_MAP[e.exerciseId];
    return acc + (ex ? Math.ceil(ex.durationEstimateSecs / 60) : 2);
  }, 0);

  // Suggested extras (different condition exercises)
  const suggestions = Object.values(CONDITION_MAP).slice(0, 3);

  useEffect(() => {
    // Show trial-end modal on day 7
    if (isTrialing && trialDaysLeft === 0) {
      router.push('/subscription/trial-end');
    }
  }, [isTrialing, trialDaysLeft]);

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

  const initials = profile?.displayName
    ? profile.displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* AppBar row */}
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

      {/* Today's session card */}
      {plan ? (
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => router.push('/session/today')}
          style={styles.sessionCardWrap}
        >
          <LinearGradient
            colors={[COLORS.clay, COLORS.clayDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sessionCard}
          >
            <Text style={styles.sessionEyebrow}>{plan.title}</Text>
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
      ) : (
        <Card style={styles.emptyCard} onPress={() => router.push('/(intake)/body-map')}>
          <Glyph kind="spine" size={48} color={COLORS.clay} bg={COLORS.claySoft}/>
          <Text style={styles.emptyTitle}>No plan yet</Text>
          <Text style={styles.emptyBody}>Tell us where it hurts and we'll build your routine.</Text>
          <View style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>Get started</Text>
            <Icon name="arrowRight" size={14} color={COLORS.clay}/>
          </View>
        </Card>
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

      {/* Suggested for you */}
      <Text style={styles.sectionLabel}>Suggested for you</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.suggestRow}
      >
        {suggestions.map((cond) => (
          <TouchableOpacity
            key={cond.id}
            style={styles.suggestCard}
            onPress={() => {
              useIntakeStore.getState().setCondition(cond.id);
              router.push('/(intake)/questionnaire');
            }}
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
    fontFamily: FONTS.sans, fontSize: 11, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', color: COLORS.ink3,
    marginBottom: 4,
  },
  greetingText: { fontFamily: FONTS.serif, fontSize: 26, color: COLORS.ink },
  trialBadge: {
    backgroundColor: COLORS.ochreSoft, borderRadius: RADII.r4,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  trialText: { fontFamily: FONTS.sans, fontSize: 11, fontWeight: '700', color: COLORS.ochre },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.claySoft, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: FONTS.serif, fontSize: 16, color: COLORS.clay },

  // Session card
  sessionCardWrap: { marginBottom: 20, borderRadius: RADII.r3, overflow: 'hidden' },
  sessionCard: { padding: 22, borderRadius: RADII.r3 },
  sessionEyebrow: {
    fontFamily: FONTS.sans, fontSize: 10, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.65)', marginBottom: 6,
  },
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
  beginBtnText: { fontFamily: FONTS.sans, fontSize: 14, fontWeight: '700', color: COLORS.clay },

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
  emptyBtnText: { fontFamily: FONTS.sans, fontSize: 14, fontWeight: '600', color: COLORS.clay },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statItem: { flex: 1 },

  // Suggested
  sectionLabel: {
    fontFamily: FONTS.sans, fontSize: 11, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', color: COLORS.ink3,
    marginBottom: 12,
  },
  suggestRow: { gap: 12, paddingRight: 20 },
  suggestCard: {
    width: 148, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r2, padding: 14, gap: 6,
  },
  suggestTitle: {
    fontFamily: FONTS.sans, fontSize: 13, fontWeight: '600', color: COLORS.ink,
  },
  suggestSub: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3 },
});
