import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { useSessionStore } from '@/lib/store/session';
import { EXERCISE_MAP } from '@/data/exercises';
import { AnimatedFigure } from '@/components/figures/AnimatedFigure';
import { Icon } from '@/lib/icons';
import { COLORS, FONTS, fontFor } from '@/lib/tokens';

// One rep is 2 s up and 2 s down. A hold sits between the two halves.
const REP_UP_MS   = 2000;
const REP_DOWN_MS = 2000;
export const REP_TEMPO_MS = REP_UP_MS + REP_DOWN_MS;

type Stage = 'up' | 'hold' | 'down' | 'setRest';
type Pace  = 'auto' | 'manual';

// ─── Haptics (never let a missing motor break the session) ────────────────────

function tickHaptic() {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } catch { /* haptics unavailable */ }
}

function setDoneHaptic() {
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } catch { /* haptics unavailable */ }
}

// ─── Hold timer ring ──────────────────────────────────────────────────────────

function HoldRing({ seconds, total }: { seconds: number; total: number }) {
  const R          = 28;
  const CIRC       = 2 * Math.PI * R;
  const progress   = total > 0 ? seconds / total : 0;
  const strokeDash = CIRC * (1 - progress);

  return (
    <View style={ring.wrap}>
      <Svg width={72} height={72} viewBox="0 0 72 72">
        <Circle cx="36" cy="36" r={R} stroke="rgba(255,255,255,0.12)" strokeWidth="4" fill="none"/>
        <Circle
          cx="36" cy="36" r={R}
          stroke={COLORS.ochre}
          strokeWidth="4"
          fill="none"
          strokeDasharray={`${CIRC}`}
          strokeDashoffset={`${strokeDash}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
      </Svg>
      <View style={ring.label}>
        <Text style={ring.num}>{seconds}</Text>
        <Text style={ring.sub}>hold</Text>
      </View>
    </View>
  );
}

const ring = StyleSheet.create({
  wrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  label: { position: 'absolute', alignItems: 'center' },
  num: { fontFamily: FONTS.serif, fontSize: 22, color: '#fff' },
  sub: { fontFamily: FONTS.sans, fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: -2 },
});

// ─── Segment progress bar ─────────────────────────────────────────────────────

function SegmentBar({ total, done }: { total: number; done: number }) {
  return (
    <View style={seg.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            seg.segment,
            i < done   && seg.segDone,
            i === done && seg.segActive,
          ]}
        />
      ))}
    </View>
  );
}

const seg = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, paddingHorizontal: 20 },
  segment: {
    flex: 1, height: 3, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  segDone:   { backgroundColor: COLORS.sage },
  segActive: { backgroundColor: 'rgba(255,255,255,0.7)' },
});

// ─── Exercise view ────────────────────────────────────────────────────────────

interface ExerciseViewProps {
  /** Asks the session screen to confirm ending the session. */
  onRequestClose: () => void;
}

/**
 * Runs one exercise. The session screen mounts this with a key of the
 * exercise index, so every counter here resets when the exercise changes.
 */
export function ExerciseView({ onRequestClose }: ExerciseViewProps) {
  const insets = useSafeAreaInsets();

  const activeSession        = useSessionStore((s) => s.activeSession);
  const currentExerciseIndex = useSessionStore((s) => s.currentExerciseIndex);
  const finishExerciseReps   = useSessionStore((s) => s.finishExerciseReps);
  const skipExercise         = useSessionStore((s) => s.skipExercise);

  const exercises = activeSession?.exercises ?? [];
  const pe        = exercises[currentExerciseIndex];
  const exercise  = pe ? EXERCISE_MAP[pe.exerciseId] : undefined;

  const totalSets   = pe?.sets ?? 1;
  const totalReps   = pe?.reps ?? 10;
  const holdSeconds = pe?.holdSeconds ?? 0;
  const setRest     = pe?.restSeconds ?? 20;

  const [pace, setPace]     = useState<Pace>('auto');
  const [paused, setPaused] = useState(false);
  const [set, setSet]       = useState(1);
  const [rep, setRep]       = useState(0);
  const [stage, setStage]   = useState<Stage>('up');
  const [holdLeft, setHoldLeft]     = useState(holdSeconds);
  const [restLeft, setRestLeft]     = useState(setRest);

  const running = pace === 'auto' && !paused;

  /** Counts one rep and moves on to the next rep, set or the feedback step. */
  const completeRep = useCallback(() => {
    const nextRep = rep + 1;
    tickHaptic();

    if (nextRep < totalReps) {
      setRep(nextRep);
      setStage('up');
      setHoldLeft(holdSeconds);
      return;
    }

    setDoneHaptic();
    setRep(nextRep);

    if (set >= totalSets) {
      finishExerciseReps();
      return;
    }

    setRestLeft(setRest);
    setStage('setRest');
  }, [rep, set, totalReps, totalSets, holdSeconds, setRest, finishExerciseReps]);

  // Auto pacing: up (2 s) -> optional hold -> down (2 s) -> rep counted.
  useEffect(() => {
    if (!running) return;

    if (stage === 'up') {
      const t = setTimeout(() => {
        if (holdSeconds > 0) {
          setHoldLeft(holdSeconds);
          setStage('hold');
        } else {
          setStage('down');
        }
      }, REP_UP_MS);
      return () => clearTimeout(t);
    }

    if (stage === 'down') {
      const t = setTimeout(completeRep, REP_DOWN_MS);
      return () => clearTimeout(t);
    }

    return;
  }, [running, stage, rep, set, holdSeconds, completeRep]);

  // Per-rep hold countdown.
  useEffect(() => {
    if (!running || stage !== 'hold') return;
    if (holdLeft <= 0) {
      setStage('down');
      return;
    }
    const t = setTimeout(() => setHoldLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, stage, holdLeft]);

  // Rest between sets (the rest between exercises is a separate phase).
  useEffect(() => {
    if (stage !== 'setRest' || paused) return;
    if (restLeft <= 0) {
      setSet((s) => s + 1);
      setRep(0);
      setHoldLeft(holdSeconds);
      setStage('up');
      return;
    }
    const t = setTimeout(() => setRestLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, restLeft, paused, holdSeconds]);

  function restartExercise() {
    setSet(1);
    setRep(0);
    setStage('up');
    setHoldLeft(holdSeconds);
    setRestLeft(setRest);
    setPaused(false);
  }

  function handleCentre() {
    if (pace === 'manual') {
      if (stage === 'setRest') return;
      completeRep();
      return;
    }
    setPaused((v) => !v);
  }

  if (!pe || !exercise) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Text style={styles.emptyText}>Nothing left to do here.</Text>
        <TouchableOpacity onPress={onRequestClose}>
          <Text style={styles.emptyLink}>Back to today</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const repsDone  = Math.min(rep, totalReps);
  const resting   = stage === 'setRest';
  const centreIcon = pace === 'manual' ? 'tap' : paused ? 'play' : 'pause';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onRequestClose} style={styles.topBtn} hitSlop={8}>
          <Icon name="close" size={22} color="rgba(255,255,255,0.7)"/>
        </TouchableOpacity>
        <Text style={styles.topTitle}>
          Exercise · {currentExerciseIndex + 1} of {exercises.length}
        </Text>
        <TouchableOpacity
          onPress={() => setPaused((v) => !v)}
          style={styles.topBtn}
          hitSlop={8}
          accessibilityLabel={paused ? 'Resume' : 'Pause'}
        >
          <Icon name={paused ? 'play' : 'pause'} size={20} color="rgba(255,255,255,0.7)"/>
        </TouchableOpacity>
      </View>

      <SegmentBar total={exercises.length} done={currentExerciseIndex}/>

      {/* Figure: remounted with each set so it starts with the rep cycle */}
      <View style={styles.figureWrap}>
        <AnimatedFigure
          key={`${currentExerciseIndex}-${set}`}
          figureType={exercise.figureType}
          exerciseId={exercise.id}
          paused={paused || resting}
          holding={stage === 'hold'}
          tempoMs={REP_TEMPO_MS}
          accent={COLORS.claySoft}
          dark
          width="100%"
          height={200}
        />
      </View>

      <Text style={styles.exName}>{exercise.name}</Text>
      <Text style={styles.hint}>
        {holdSeconds > 0
          ? `Hold ${holdSeconds}s at the top of each rep · breathe`
          : exercise.instructions[0]}
      </Text>

      {resting ? (
        <View style={styles.restBlock}>
          <Text style={styles.restNum}>{restLeft}</Text>
          <Text style={styles.restLabel}>
            Rest · Set {Math.min(set + 1, totalSets)} of {totalSets} next
          </Text>
          <TouchableOpacity
            onPress={() => setRestLeft(0)}
            style={styles.restSkip}
            accessibilityRole="button"
          >
            <Text style={styles.restSkipText}>Skip rest</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.counterRow}>
            <Text style={styles.counterNum}>{repsDone}</Text>
            <Text style={styles.counterDen}>/{totalReps}</Text>
            {stage === 'hold' && <HoldRing seconds={holdLeft} total={holdSeconds}/>}
          </View>

          <Text style={styles.setLabel}>
            Reps · Set {set} of {totalSets}
          </Text>
        </>
      )}

      {/* Pace toggle */}
      <View style={styles.paceRow}>
        {(['auto', 'manual'] as Pace[]).map((p) => {
          const on = pace === p;
          return (
            <TouchableOpacity
              key={p}
              onPress={() => setPace(p)}
              style={[styles.pacePill, on && styles.pacePillOn]}
              accessibilityRole="button"
            >
              <Text style={[styles.paceText, on && styles.paceTextOn]}>
                {p === 'auto' ? 'Auto' : 'Manual'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.ctrlSm}
          onPress={restartExercise}
          accessibilityLabel="Restart this exercise"
        >
          <Icon name="redo" size={22} color="rgba(255,255,255,0.7)"/>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctrlLg}
          onPress={handleCentre}
          accessibilityLabel={pace === 'manual' ? 'Count a rep' : paused ? 'Resume' : 'Pause'}
        >
          <Icon name={centreIcon} size={30} color={COLORS.clay}/>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctrlSm}
          onPress={skipExercise}
          accessibilityLabel="Skip this exercise"
        >
          <Icon name="next" size={22} color="rgba(255,255,255,0.7)"/>
        </TouchableOpacity>
      </View>

      <Text style={styles.centreHint}>
        {pace === 'manual'
          ? 'Tap when you finish a rep'
          : paused ? 'Paused' : 'Counting for you every 4 seconds'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.sessionBg, alignItems: 'center' },

  emptyText: { color: '#fff', fontFamily: FONTS.serif, fontSize: 20, marginTop: 100 },
  emptyLink: {
    color: COLORS.clay, fontFamily: FONTS.sans, fontSize: 14,
    marginTop: 16, textAlign: 'center',
  },

  topBar: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14,
  },
  topBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20,
  },
  topTitle: {
    fontFamily: fontFor('600'), fontSize: 13,
    color: 'rgba(255,255,255,0.6)', letterSpacing: 0.3,
  },

  figureWrap: { width: '100%', marginTop: 20, marginBottom: 8 },

  exName: {
    fontFamily: FONTS.serif, fontSize: 32, color: '#fff',
    textAlign: 'center', paddingHorizontal: 24, marginBottom: 6,
  },
  hint: {
    fontFamily: FONTS.sans, fontSize: 13, color: 'rgba(255,255,255,0.5)',
    textAlign: 'center', paddingHorizontal: 32,
  },

  counterRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 16, gap: 4 },
  counterNum: { fontFamily: FONTS.serif, fontSize: 92, color: '#fff', lineHeight: 96 },
  counterDen: {
    fontFamily: FONTS.serif, fontSize: 36,
    color: 'rgba(255,255,255,0.35)', marginBottom: 12,
  },
  setLabel: {
    fontFamily: FONTS.sans, fontSize: 13,
    color: 'rgba(255,255,255,0.45)', marginTop: 4, marginBottom: 20,
  },

  restBlock: { alignItems: 'center', marginTop: 16, marginBottom: 20 },
  restNum: { fontFamily: FONTS.serif, fontSize: 92, color: '#fff', lineHeight: 96 },
  restLabel: { fontFamily: FONTS.sans, fontSize: 13, color: 'rgba(255,255,255,0.55)' },
  restSkip: {
    marginTop: 10, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  restSkipText: { fontFamily: FONTS.sans, fontSize: 12, color: 'rgba(255,255,255,0.75)' },

  paceRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  pacePill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  pacePillOn: { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.35)' },
  paceText: { fontFamily: FONTS.sans, fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  paceTextOn: { color: '#fff', fontFamily: fontFor('600') },

  controls: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  ctrlSm: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  ctrlLg: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3,
    shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  centreHint: {
    fontFamily: FONTS.sans, fontSize: 12,
    color: 'rgba(255,255,255,0.45)', marginTop: 12,
  },
});
