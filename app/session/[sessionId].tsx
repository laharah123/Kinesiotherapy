import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { useSessionStore } from '@/lib/store/session';
import { useIntakeStore } from '@/lib/store/intake';
import { EXERCISE_MAP } from '@/data/exercises';
import { AnimatedFigure } from '@/components/figures/AnimatedFigure';
import { Icon } from '@/lib/icons';
import { COLORS, FONTS, RADII } from '@/lib/tokens';

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

function SegmentBar({ total, done, current }: { total: number; done: number; current: number }) {
  return (
    <View style={seg.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            seg.segment,
            i < done    && seg.segDone,
            i === done  && seg.segActive,
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SessionScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const {
    activeSession, currentExerciseIndex, phase,
    finishExerciseReps, skipExercise,
  } = useSessionStore();
  const { generatedPlan } = useIntakeStore();

  const exercises  = activeSession?.exercises ?? [];
  const pe         = exercises[currentExerciseIndex];
  const exercise   = pe ? EXERCISE_MAP[pe.exerciseId] : null;

  const totalSets = pe?.sets ?? 1;
  const [currentSet, setCurrentSet]   = useState(1);
  const [currentRep, setCurrentRep]   = useState(0);
  const [paused, setPaused]           = useState(false);
  const [holdSecs, setHoldSecs]       = useState(pe?.holdSeconds ?? 0);
  const [holding, setHolding]         = useState(false);

  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const repRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance reps every 1.5 s when not paused and not holding
  useEffect(() => {
    if (paused || holding || !exercise) return;
    repRef.current = setInterval(() => {
      setCurrentRep((r) => {
        const next = r + 1;
        if (next > (pe?.reps ?? 10)) {
          clearInterval(repRef.current!);
          // Start hold if configured
          if ((pe?.holdSeconds ?? 0) > 0) {
            setHolding(true);
            setHoldSecs(pe!.holdSeconds);
          } else {
            handleRepsDone();
          }
          return r;
        }
        return next;
      });
    }, 1500);
    return () => clearInterval(repRef.current!);
  }, [paused, holding, currentExerciseIndex, currentSet]);

  // Hold countdown
  useEffect(() => {
    if (!holding) return;
    holdRef.current = setInterval(() => {
      setHoldSecs((s) => {
        if (s <= 1) {
          clearInterval(holdRef.current!);
          setHolding(false);
          handleRepsDone();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(holdRef.current!);
  }, [holding]);

  function handleRepsDone() {
    if (currentSet < totalSets) {
      setCurrentSet((s) => s + 1);
      setCurrentRep(0);
      setHolding(false);
    } else {
      finishExerciseReps();
    }
  }

  function handleRedo() {
    setCurrentRep(0);
    setHolding(false);
    setCurrentSet(1);
    setPaused(false);
  }

  function handleNext() {
    skipExercise();
    resetCounters();
  }

  function resetCounters() {
    setCurrentRep(0);
    setCurrentSet(1);
    setHolding(false);
    setPaused(false);
  }

  // Navigate when phase changes
  useEffect(() => {
    if (phase === 'feedback') router.push('/session/pain-feedback');
    if (phase === 'rest')     router.push('/session/rest');
    if (phase === 'complete') router.push('/session/complete');
  }, [phase]);

  // Start a new session if none active
  useEffect(() => {
    if (!activeSession && generatedPlan) {
      const firstActiveDay = generatedPlan.schedule.find((d) => !d.isRest);
      if (firstActiveDay) {
        useSessionStore.getState().startSession(generatedPlan, 'local', firstActiveDay.day);
      }
    }
  }, []);

  if (!exercise || !pe) {
    return (
      <View style={styles.root}>
        <Text style={styles.noExText}>No exercises today.</Text>
        <TouchableOpacity onPress={() => router.replace('/(main)')}>
          <Text style={styles.noExLink}>Back to home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const repCount = Math.min(currentRep, pe.reps);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.replace('/(main)')} style={styles.topBtn}>
          <Icon name="close" size={22} color="rgba(255,255,255,0.7)"/>
        </TouchableOpacity>
        <Text style={styles.topTitle}>
          Exercise · {currentExerciseIndex + 1} of {exercises.length}
        </Text>
        <TouchableOpacity style={styles.topBtn}>
          <Icon name="more" size={22} color="rgba(255,255,255,0.7)"/>
        </TouchableOpacity>
      </View>

      {/* Segment progress bar */}
      <SegmentBar
        total={exercises.length}
        done={currentExerciseIndex}
        current={currentExerciseIndex}
      />

      {/* Animated figure */}
      <View style={styles.figureWrap}>
        <AnimatedFigure
          figureType={exercise.figureType}
          accent={COLORS.claySoft}
          dark
          width="100%"
          height={200}
        />
      </View>

      {/* Exercise name + hint */}
      <Text style={styles.exName}>{exercise.name}</Text>
      <Text style={styles.hint}>
        {pe.holdSeconds > 0
          ? `Hold ${pe.holdSeconds}s at the top · breathe`
          : exercise.instructions[0]}
      </Text>

      {/* Rep counter */}
      <View style={styles.counterRow}>
        <Text style={styles.counterNum}>{repCount}</Text>
        <Text style={styles.counterDen}>/{pe.reps}</Text>
        {holding && (
          <HoldRing seconds={holdSecs} total={pe.holdSeconds}/>
        )}
      </View>

      <Text style={styles.setLabel}>
        Reps · Set {currentSet} of {totalSets}
      </Text>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.ctrlSm} onPress={handleRedo}>
          <Icon name="next" size={24} color="rgba(255,255,255,0.7)"
            style={{ transform: [{ scaleX: -1 }] }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctrlLg}
          onPress={() => setPaused((v) => !v)}
        >
          <Icon name={paused ? 'play' : 'pause'} size={30} color={COLORS.clay}/>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ctrlSm} onPress={handleNext}>
          <Icon name="next" size={24} color="rgba(255,255,255,0.7)"/>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: COLORS.sessionBg,
    alignItems: 'center',
  },

  noExText: { color: '#fff', fontFamily: FONTS.serif, fontSize: 20, marginTop: 100 },
  noExLink: { color: COLORS.clay, fontFamily: FONTS.sans, fontSize: 14, marginTop: 16, textAlign: 'center' },

  topBar: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14,
  },
  topBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20,
  },
  topTitle: {
    fontFamily: FONTS.sans, fontSize: 13, fontWeight: '600',
    color: 'rgba(255,255,255,0.6)', letterSpacing: 0.3,
  },

  figureWrap: { width: '100%', marginTop: 24, marginBottom: 8 },

  exName: {
    fontFamily: FONTS.serif, fontSize: 32, color: '#fff',
    textAlign: 'center', paddingHorizontal: 24, marginBottom: 6,
  },
  hint: {
    fontFamily: FONTS.sans, fontSize: 13, color: 'rgba(255,255,255,0.5)',
    textAlign: 'center', paddingHorizontal: 32,
  },

  counterRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    marginTop: 20, gap: 4,
  },
  counterNum: {
    fontFamily: FONTS.serif, fontSize: 92, color: '#fff', lineHeight: 96,
  },
  counterDen: {
    fontFamily: FONTS.serif, fontSize: 36, color: 'rgba(255,255,255,0.35)',
    marginBottom: 12,
  },
  setLabel: {
    fontFamily: FONTS.sans, fontSize: 13, color: 'rgba(255,255,255,0.45)',
    marginTop: 4, marginBottom: 32,
  },

  controls: {
    flexDirection: 'row', alignItems: 'center', gap: 24,
  },
  ctrlSm: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  ctrlLg: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3,
    shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
