import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { useSessionStore } from '@/lib/store/session';
import { useIntakeStore } from '@/lib/store/intake';
import { EXERCISE_MAP } from '@/data/exercises';
import { Button } from '@/components/ui/Button';
import { Glyph } from '@/lib/glyphs';
import { COLORS, FONTS, RADII } from '@/lib/tokens';

const DEFAULT_REST = 30;
const R    = 100;
const CIRC = 2 * Math.PI * R;

export default function RestScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { activeSession, currentExerciseIndex, skipRest, restComplete } = useSessionStore();

  const exercises   = activeSession?.exercises ?? [];
  const nextPe      = exercises[currentExerciseIndex];
  const nextEx      = nextPe ? EXERCISE_MAP[nextPe.exerciseId] : null;
  const restDuration = nextPe?.restSeconds ?? DEFAULT_REST;

  const [secs, setSecs]         = useState(restDuration);
  const [extra, setExtra]       = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total   = restDuration + extra;
  const progress = total > 0 ? secs / total : 0;
  const strokeDash = CIRC * (1 - progress);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          restComplete();
          router.push('/session/today');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [extra]);

  function addThirty() {
    setExtra((e) => e + 30);
    setSecs((s) => s + 30);
  }

  function handleSkip() {
    clearInterval(timerRef.current!);
    skipRest();
    router.push('/session/today');
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      {/* Countdown ring */}
      <View style={styles.ringWrap}>
        <Svg width={240} height={240} viewBox="0 0 240 240">
          <Circle
            cx="120" cy="120" r={R}
            stroke={COLORS.borderSoft}
            strokeWidth="8"
            fill="none"
          />
          <Circle
            cx="120" cy="120" r={R}
            stroke={COLORS.sage}
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${CIRC}`}
            strokeDashoffset={`${strokeDash}`}
            strokeLinecap="round"
            transform="rotate(-90 120 120)"
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={styles.countdown}>{secs}</Text>
          <Text style={styles.countdownLabel}>seconds</Text>
        </View>
      </View>

      {/* Breathe instruction */}
      <Text style={styles.headline}>Breathe.</Text>
      <Text style={styles.breatheInstr}>Inhale 4 · Hold 2 · Exhale 6</Text>

      {/* Up next card */}
      {nextEx && (
        <View style={styles.nextCard}>
          <Text style={styles.nextEyebrow}>Up next</Text>
          <View style={styles.nextRow}>
            <Glyph kind={nextEx.glyphKind} size={36} color={COLORS.clay} bg={COLORS.claySoft}/>
            <View style={styles.nextInfo}>
              <Text style={styles.nextName}>{nextEx.name}</Text>
              <Text style={styles.nextMeta}>
                {nextPe.reps} reps · {nextPe.sets} sets
              </Text>
            </View>
            <Text style={styles.nextIndex}>
              {currentExerciseIndex + 1} of {exercises.length}
            </Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Button label="+30s" variant="ghost" onPress={addThirty} style={styles.addBtn}/>
        <Button label="Skip rest" onPress={handleSkip} style={styles.skipBtn}/>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: COLORS.bgAlt,
    alignItems: 'center', paddingHorizontal: 24,
  },
  ringWrap: { marginTop: 32, marginBottom: 24, position: 'relative', alignItems: 'center' },
  ringCenter: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  countdown: { fontFamily: FONTS.serif, fontSize: 88, color: COLORS.ink, lineHeight: 92 },
  countdownLabel: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3 },

  headline: { fontFamily: FONTS.serif, fontSize: 32, color: COLORS.ink, marginBottom: 6 },
  breatheInstr: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink3, marginBottom: 28 },

  nextCard: {
    width: '100%', backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r2, padding: 16, marginBottom: 24,
  },
  nextEyebrow: {
    fontFamily: FONTS.sans, fontSize: 10, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', color: COLORS.ink3, marginBottom: 10,
  },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextInfo: { flex: 1 },
  nextName: { fontFamily: FONTS.sans, fontSize: 15, fontWeight: '600', color: COLORS.ink },
  nextMeta: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3, marginTop: 2 },
  nextIndex: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink4 },

  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  addBtn:  { flex: 1 },
  skipBtn: { flex: 1 },
});
