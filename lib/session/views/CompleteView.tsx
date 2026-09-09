import { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Ellipse } from 'react-native-svg';

import { useSessionStore } from '@/lib/store/session';
import { useIntakeStore } from '@/lib/store/intake';
import { useProgressStore } from '@/lib/store/progress';
import { completeSession, saveExerciseLogs } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { COLORS, FONTS, RADII, fontFor } from '@/lib/tokens';

// ─── Floating petals ──────────────────────────────────────────────────────────

function Petal({ x, delay, color }: { x: number; delay: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

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
  { x: 30,  delay: 0,   color: COLORS.clay },
  { x: 80,  delay: 400, color: COLORS.sage },
  { x: 150, delay: 200, color: COLORS.ochre },
  { x: 220, delay: 600, color: COLORS.claySoft2 },
  { x: 280, delay: 100, color: COLORS.sageSoft },
  { x: 330, delay: 800, color: COLORS.clay },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** YYYY-MM-DD for the device's own calendar day. */
function localDay(d = new Date()): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function painTone(avg: number): 'sage' | 'ochre' | 'clay' {
  if (avg < 1.5) return 'sage';
  if (avg < 2.5) return 'ochre';
  return 'clay';
}

interface CompleteViewProps {
  /** Leaves the session: the screen resets the store and navigates. */
  onDone: () => void;
}

/**
 * Session summary. The numbers are read from finalize() once, before anything
 * resets the store, so the card never re-renders as an empty session.
 */
export function CompleteView({ onDone }: CompleteViewProps) {
  const insets = useSafeAreaInsets();

  const activeSession   = useSessionStore((s) => s.activeSession);
  const remoteSessionId = useSessionStore((s) => s.remoteSessionId);

  // Computed once. finalize() never mutates the store.
  const summary = useMemo(() => useSessionStore.getState().finalize(), []);
  const session = useRef(activeSession).current;
  const persisted = useRef(false);

  useEffect(() => {
    if (!summary || !session || persisted.current) return;
    persisted.current = true;

    const { durationSecs, avgPain, completedLogs, adaptation } = summary;

    if (remoteSessionId) {
      (async () => {
        try {
          await completeSession(remoteSessionId, {
            duration_secs: durationSecs,
            avg_pain: avgPain,
          });
          await saveExerciseLogs(
            remoteSessionId,
            completedLogs.map((l) => ({
              exercise_id:   l.exerciseId,
              pain_level:    l.painLevel,
              feedback_tags: l.feedbackTags,
              notes:         l.notes,
            })),
          );
        } catch { /* offline: the local stores still have it */ }
      })();
    }

    useIntakeStore.getState().applyAdaptation(adaptation, session.currentDay);

    useProgressStore.getState().recordSession({
      id:                 remoteSessionId ?? `local-${session.startedAt}`,
      date:               localDay(),
      planTitle:          session.plan.title,
      durationSecs,
      avgPain,
      exercisesCompleted: completedLogs.length,
      exerciseIds:        completedLogs.map((l) => l.exerciseId),
      day:                session.currentDay,
    });
  }, [summary, session, remoteSessionId]);

  const done        = summary?.completedLogs.length ?? 0;
  const skipped     = summary?.skippedCount ?? 0;
  const avgPain     = summary?.avgPain ?? 0;
  const minutes     = Math.max(1, Math.round((summary?.durationSecs ?? 0) / 60));
  const adaptation  = summary?.adaptation;

  const tierLine = adaptation?.promoted
    ? 'New exercises unlocked for your next session.'
    : adaptation?.demoted
      ? 'We have eased your plan back a level for now.'
      : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.petalsContainer} pointerEvents="none">
        {PETALS.map((p, i) => <Petal key={i} {...p}/>)}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Session complete</Text>
        <Text style={styles.headline}>Great work.</Text>
        <Text style={styles.sub}>
          You completed {done.toLocaleString()} exercise{done !== 1 ? 's' : ''} in{' '}
          {minutes.toLocaleString()} minute{minutes !== 1 ? 's' : ''}.
          {skipped > 0 ? ` ${skipped.toLocaleString()} skipped.` : ''}
        </Text>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{minutes.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Minutes</Text>
            </View>
            <View style={styles.summaryDivider}/>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{done.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Exercises</Text>
            </View>
            <View style={styles.summaryDivider}/>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {done > 0
                  ? avgPain.toLocaleString(undefined, {
                      minimumFractionDigits: 1, maximumFractionDigits: 1,
                    })
                  : '-'}
              </Text>
              <Text style={styles.summaryLabel}>Avg pain</Text>
            </View>
          </View>
        </View>

        {done > 0 && (
          <View style={styles.tagRow}>
            <Tag
              label={avgPain < 1 ? 'Low pain' : avgPain < 2.5 ? 'Moderate pain' : 'High pain'}
              tone={painTone(avgPain)}
            />
          </View>
        )}

        {/* What happens next */}
        {(adaptation?.parameterNote || tierLine) && (
          <View style={styles.nextCard}>
            <Text style={styles.nextEyebrow}>Next session</Text>
            {adaptation?.parameterNote && (
              <Text style={styles.nextNote}>{adaptation.parameterNote}</Text>
            )}
            {tierLine && <Text style={styles.nextTier}>{tierLine}</Text>}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button label="Back to today" full onPress={onDone} icon="home"/>
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
    paddingTop: 48, paddingBottom: 120,
  },
  eyebrow: {
    fontFamily: fontFor('700'), fontSize: 11,
    letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.ink3, marginBottom: 8,
  },
  headline: { fontFamily: FONTS.serif, fontSize: 42, color: COLORS.ink, marginBottom: 8 },
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

  tagRow: { marginBottom: 24 },

  nextCard: {
    width: '100%', backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r2, padding: 16,
  },
  nextEyebrow: {
    fontFamily: fontFor('700'), fontSize: 10,
    letterSpacing: 1, textTransform: 'uppercase', color: COLORS.ink3, marginBottom: 8,
  },
  nextNote: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink2, lineHeight: 21 },
  nextTier: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3, marginTop: 6 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingTop: 12,
    backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.borderSoft,
  },
});
