import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useSessionStore } from '@/lib/store/session';
import { useIntakeStore } from '@/lib/store/intake';
import { useAuthStore } from '@/lib/store/auth';
import { canStartSession, PAYWALL_ROUTE } from '@/lib/access';
import { createSession } from '@/lib/supabase';
import { COLORS, FONTS, fontFor } from '@/lib/tokens';

import { ExerciseView } from '@/lib/session/views/ExerciseView';
import { RestView } from '@/lib/session/views/RestView';
import { FeedbackView } from '@/lib/session/views/FeedbackView';
import { CompleteView } from '@/lib/session/views/CompleteView';

type Boot = 'starting' | 'running' | 'restDay' | 'noPlan';

/**
 * The one session screen. Every step of a session is a phase rendered here,
 * so there is only ever a single set of timers alive.
 */
export default function SessionScreen() {
  const router = useRouter();

  const phase                = useSessionStore((s) => s.phase);
  const activeSession        = useSessionStore((s) => s.activeSession);
  const currentExerciseIndex = useSessionStore((s) => s.currentExerciseIndex);

  const [boot, setBoot] = useState<Boot>(activeSession ? 'running' : 'starting');
  const started = useRef(false);

  // ─── Start (or resume) a session ────────────────────────────────────────────
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (useSessionStore.getState().activeSession) {
      setBoot('running');
      return;
    }

    const intake = useIntakeStore.getState();
    const today  = intake.getCurrentDay();

    if (!today || !intake.generatedPlan) {
      setBoot('noPlan');
      return;
    }
    if (today.isRest || today.exercises.length === 0) {
      setBoot('restDay');
      return;
    }
    if (!canStartSession()) {
      router.replace(PAYWALL_ROUTE);
      return;
    }

    const planId = intake.activePlanId;
    useSessionStore.getState().startSession(
      intake.generatedPlan,
      planId ?? 'local',
      today.day,
      today.exercises,
    );
    setBoot('running');

    // Best effort remote row: an offline session still works locally.
    const userId = useAuthStore.getState().user?.id;
    if (userId && planId) {
      (async () => {
        try {
          const row = await createSession(userId, planId, today.day);
          if (row?.id) useSessionStore.getState().setRemoteSessionId(row.id);
        } catch { /* offline: sync later */ }
      })();
    }
  }, [router]);

  // ─── Leaving mid-session ────────────────────────────────────────────────────
  const leave = useCallback(() => {
    useSessionStore.getState().reset();
    router.replace('/(main)');
  }, [router]);

  const confirmClose = useCallback(() => {
    if (!useSessionStore.getState().activeSession) {
      leave();
      return;
    }
    Alert.alert(
      'End session?',
      "Progress for this session won't be saved.",
      [
        { text: 'Keep going', style: 'cancel' },
        { text: 'End session', style: 'destructive', onPress: leave },
      ],
    );
  }, [leave]);

  // Android hardware back gets the same confirmation.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (useSessionStore.getState().phase === 'complete') {
        leave();
        return true;
      }
      confirmClose();
      return true;
    });
    return () => sub?.remove?.();
  }, [confirmClose, leave]);

  if (boot === 'restDay' || boot === 'noPlan') {
    return (
      <EmptyState
        kind={boot}
        onBack={() => router.replace('/(main)')}
      />
    );
  }

  if (boot === 'starting' || !activeSession) {
    return <View style={styles.loading}/>;
  }

  const dark = phase === 'exercise';

  return (
    <View style={[styles.root, { backgroundColor: dark ? COLORS.sessionBg : COLORS.bg }]}>
      <Animated.View
        key={phase === 'exercise' ? `exercise-${currentExerciseIndex}` : phase}
        style={styles.fill}
        entering={FadeIn.duration(240)}
        exiting={FadeOut.duration(160)}
      >
        {phase === 'exercise' && (
          <ExerciseView key={currentExerciseIndex} onRequestClose={confirmClose}/>
        )}
        {phase === 'rest'     && <RestView/>}
        {phase === 'feedback' && <FeedbackView onRequestClose={confirmClose}/>}
        {phase === 'complete' && <CompleteView onDone={leave}/>}
      </Animated.View>
    </View>
  );
}

// ─── Rest day / no plan ───────────────────────────────────────────────────────

function EmptyState({ kind, onBack }: { kind: 'restDay' | 'noPlan'; onBack: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.empty, { paddingTop: insets.top + 80 }]}>
      <Text style={styles.emptyEyebrow}>
        {kind === 'restDay' ? 'Rest day' : 'No plan yet'}
      </Text>
      <Text style={styles.emptyHeadline}>
        {kind === 'restDay' ? 'Nothing to do today.' : 'Let us build your plan.'}
      </Text>
      <Text style={styles.emptyBody}>
        {kind === 'restDay'
          ? 'Recovery is part of the work. Your next session is waiting tomorrow.'
          : 'Finish the short intake and your first session appears on Today.'}
      </Text>
      <TouchableOpacity onPress={onBack} accessibilityRole="button">
        <Text style={styles.emptyLink}>Back to today</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  loading: { flex: 1, backgroundColor: COLORS.sessionBg },

  empty: {
    flex: 1, backgroundColor: COLORS.bg,
    alignItems: 'center', paddingHorizontal: 32,
  },
  emptyEyebrow: {
    fontFamily: fontFor('700'), fontSize: 11,
    letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.ink3, marginBottom: 8,
  },
  emptyHeadline: {
    fontFamily: FONTS.serif, fontSize: 32, color: COLORS.ink,
    textAlign: 'center', marginBottom: 10,
  },
  emptyBody: {
    fontFamily: FONTS.sans, fontSize: 15, color: COLORS.ink2,
    textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },
  emptyLink: { fontFamily: fontFor('600'), fontSize: 15, color: COLORS.clay },
});
