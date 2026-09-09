import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse } from 'react-native-svg';

import { useSessionStore } from '@/lib/store/session';
import { useAuthStore } from '@/lib/store/auth';
import { useProgressStore } from '@/lib/store/progress';
import { completeSession, saveExerciseLogs } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { COLORS, FONTS, RADII } from '@/lib/tokens';

// Floating petal animation
function Petal({ x, delay, color }: { x: number; delay: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -300] });
  const opacity    = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.8, 0.6, 0] });
  const rotate     = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '120deg'] });

  return (
    <Animated.View
      style={[styles.petal, { left: x, transform: [{ translateY }, { rotate }], opacity }]}
    >
      <Svg width={16} height={22}>
        <Ellipse cx="8" cy="11" rx="6" ry="10" fill={color}/>
      </Svg>
    </Animated.View>
  );
}

const PETALS = [
  { x: 30,  delay: 0,    color: COLORS.clay },
  { x: 80,  delay: 400,  color: COLORS.sage },
  { x: 150, delay: 200,  color: COLORS.ochre },
  { x: 220, delay: 600,  color: COLORS.claySoft2 },
  { x: 280, delay: 100,  color: COLORS.sageSoft },
  { x: 330, delay: 800,  color: COLORS.clay },
];

export default function SessionCompleteScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { logs, activeSession, endSession } = useSessionStore();
  const { user } = useAuthStore();
  const { recordSession } = useProgressStore();

  const durationSecs     = activeSession
    ? Math.round((Date.now() - activeSession.startedAt) / 1000)
    : 0;
  const exerciseDone     = logs.length;
  const avgPain          = exerciseDone > 0
    ? logs.reduce((a, l) => a + l.painLevel, 0) / exerciseDone
    : 0;
  const durationMins     = Math.max(1, Math.round(durationSecs / 60));

  useEffect(() => {
    async function persist() {
      const result = endSession();
      if (!result || !user || !activeSession) return;

      try {
        await completeSession(activeSession.planId, {
          duration_secs: result.durationSecs,
          avg_pain: result.avgPain,
        });
        await saveExerciseLogs(
          activeSession.planId,
          result.logs.map((l) => ({
            exercise_id:   l.exerciseId,
            pain_level:    l.painLevel,
            feedback_tags: l.feedbackTags,
            notes:         l.notes,
          })),
        );
      } catch { /* offline — sync later */ }

      recordSession({
        id:                   activeSession.planId,
        date:                 new Date().toISOString().slice(0, 10),
        planTitle:            activeSession.plan.title,
        durationSecs:         result.durationSecs,
        avgPain:              result.avgPain,
        exercisesCompleted:   result.logs.length,
      });
    }
    persist();
  }, []);

  function painTone(avg: number): 'sage' | 'ochre' | 'clay' {
    if (avg < 1.5) return 'sage';
    if (avg < 2.5) return 'ochre';
    return 'clay';
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Floating petals */}
      <View style={styles.petalsContainer} pointerEvents="none">
        {PETALS.map((p, i) => <Petal key={i} {...p}/>)}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Headline */}
        <Text style={styles.eyebrow}>Session complete</Text>
        <Text style={styles.headline}>Great work.</Text>
        <Text style={styles.sub}>
          You completed {exerciseDone} exercise{exerciseDone !== 1 ? 's' : ''} in {durationMins} minute{durationMins !== 1 ? 's' : ''}.
        </Text>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{durationMins}</Text>
              <Text style={styles.summaryLabel}>Minutes</Text>
            </View>
            <View style={styles.summaryDivider}/>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{exerciseDone}</Text>
              <Text style={styles.summaryLabel}>Exercises</Text>
            </View>
            <View style={styles.summaryDivider}/>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{avgPain.toFixed(1)}</Text>
              <Text style={styles.summaryLabel}>Avg pain</Text>
            </View>
          </View>
        </View>

        {/* Pain tag */}
        {exerciseDone > 0 && (
          <View style={styles.tagRow}>
            <Tag
              label={avgPain < 1 ? 'Low pain ↓' : avgPain < 2.5 ? 'Moderate pain' : 'High pain'}
              tone={painTone(avgPain)}
            />
          </View>
        )}

        {/* Quick overall rating */}
        <Text style={styles.ratingLabel}>How was it overall?</Text>
        <View style={styles.ratingRow}>
          {['😣', '😐', '🙂', '😊', '🌟'].map((emoji, i) => (
            <TouchableOpacity key={i} style={styles.ratingBtn}>
              <Text style={styles.ratingEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label="Back to today"
          full
          onPress={() => router.replace('/(main)')}
          icon="home"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  petalsContainer: {
    position: 'absolute', bottom: 80, left: 0, right: 0, height: 400,
    overflow: 'hidden',
  },
  petal: { position: 'absolute', bottom: 0 },

  scroll: {
    alignItems: 'center', paddingHorizontal: 24,
    paddingTop: 60, paddingBottom: 120,
  },
  eyebrow: {
    fontFamily: FONTS.sans, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.ink3, marginBottom: 8,
  },
  headline: {
    fontFamily: FONTS.serif, fontSize: 42, color: COLORS.ink, marginBottom: 8,
  },
  sub: {
    fontFamily: FONTS.sans, fontSize: 15, color: COLORS.ink2,
    textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },

  summaryCard: {
    width: '100%', backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r3, overflow: 'hidden', marginBottom: 16,
  },
  summaryRow: { flexDirection: 'row' },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  summaryValue: { fontFamily: FONTS.serif, fontSize: 34, color: COLORS.ink },
  summaryLabel: {
    fontFamily: FONTS.sans, fontSize: 11, color: COLORS.ink3,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4,
  },
  summaryDivider: { width: 1, backgroundColor: COLORS.borderSoft, marginVertical: 12 },

  tagRow: { marginBottom: 32 },

  ratingLabel: {
    fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3, marginBottom: 14,
  },
  ratingRow: { flexDirection: 'row', gap: 12 },
  ratingBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  ratingEmoji: { fontSize: 24 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingTop: 12,
    backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.borderSoft,
  },
});
