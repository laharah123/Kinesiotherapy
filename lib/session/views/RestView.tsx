import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { useSessionStore } from '@/lib/store/session';
import { EXERCISE_MAP } from '@/data/exercises';
import { Button } from '@/components/ui/Button';
import { Glyph } from '@/lib/glyphs';
import { COLORS, FONTS, RADII, fontFor } from '@/lib/tokens';

const DEFAULT_REST = 30;
const R    = 100;
const CIRC = 2 * Math.PI * R;

/**
 * Rest between two exercises. When the countdown ends the store moves the
 * phase back to 'exercise'. Nothing navigates.
 */
export function RestView() {
  const insets = useSafeAreaInsets();

  const activeSession        = useSessionStore((s) => s.activeSession);
  const currentExerciseIndex = useSessionStore((s) => s.currentExerciseIndex);
  const skipRest             = useSessionStore((s) => s.skipRest);
  const restComplete         = useSessionStore((s) => s.restComplete);

  const exercises = activeSession?.exercises ?? [];
  const nextPe    = exercises[currentExerciseIndex];
  const nextEx    = nextPe ? EXERCISE_MAP[nextPe.exerciseId] : undefined;

  const baseRest = nextPe?.restSeconds ?? DEFAULT_REST;

  const [secs, setSecs]   = useState(baseRest);
  const [total, setTotal] = useState(baseRest);

  useEffect(() => {
    if (secs <= 0) {
      restComplete();
      return;
    }
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs, restComplete]);

  const progress   = total > 0 ? secs / total : 0;
  const strokeDash = CIRC * (1 - progress);

  function addThirty() {
    setSecs((s) => s + 30);
    setTotal((t) => t + 30);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
      {/* Countdown ring */}
      <View style={styles.ringWrap}>
        <Svg width={240} height={240} viewBox="0 0 240 240">
          <Circle cx="120" cy="120" r={R} stroke={COLORS.borderSoft} strokeWidth="8" fill="none"/>
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
          <Text style={styles.countdown}>{Math.max(0, secs)}</Text>
          <Text style={styles.countdownLabel}>seconds</Text>
        </View>
      </View>

      <Text style={styles.headline}>Breathe.</Text>
      <Text style={styles.breatheInstr}>Inhale 4 · Hold 2 · Exhale 6</Text>

      {/* Up next card */}
      {nextEx && nextPe && (
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

      <View style={styles.actions}>
        <Button label="+30s" variant="ghost" onPress={addThirty} style={styles.addBtn}/>
        <Button label="Skip rest" onPress={skipRest} style={styles.skipBtn}/>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: COLORS.bgAlt,
    alignItems: 'center', paddingHorizontal: 24,
  },
  ringWrap: { marginTop: 16, marginBottom: 24, position: 'relative', alignItems: 'center' },
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
    fontFamily: fontFor('700'), fontSize: 10,
    letterSpacing: 1, textTransform: 'uppercase', color: COLORS.ink3, marginBottom: 10,
  },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextInfo: { flex: 1 },
  nextName: { fontFamily: fontFor('600'), fontSize: 15, color: COLORS.ink },
  nextMeta: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3, marginTop: 2 },
  nextIndex: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink4 },

  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  addBtn:  { flex: 1 },
  skipBtn: { flex: 1 },
});
