import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EXERCISE_MAP } from '@/data/exercises';
import { useIntakeStore } from '@/lib/store/intake';
import { AnimatedFigure } from '@/components/figures/AnimatedFigure';
import { AppBar } from '@/components/ui/AppBar';
import { IconBtn } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { Icon } from '@/lib/icons';
import { COLORS, FONTS, RADII } from '@/lib/tokens';

export default function ExerciseDetailScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const { generatedPlan } = useIntakeStore();

  const exercise = EXERCISE_MAP[exerciseId ?? ''];

  // Find this exercise's params in today's session
  const today    = generatedPlan?.schedule.find((d) => !d.isRest);
  const planEx   = today?.exercises.find((e) => e.exerciseId === exerciseId);

  const reps    = planEx?.reps          ?? exercise?.defaultReps          ?? 10;
  const sets    = planEx?.sets          ?? exercise?.defaultSets          ?? 2;
  const hold    = planEx?.holdSeconds   ?? exercise?.defaultHoldSeconds   ?? 0;
  const rest    = planEx?.restSeconds   ?? exercise?.defaultRestSeconds   ?? 20;

  const [playing, setPlaying] = useState(true);
  const [liked,   setLiked]   = useState(false);

  // Count position in sequence
  const seqIndex = today?.exercises.findIndex((e) => e.exerciseId === exerciseId) ?? -1;
  const seqTotal = today?.exercises.length ?? 0;

  if (!exercise) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Exercise not found.</Text>
        <Button label="Back" variant="ghost" onPress={() => router.back()}/>
      </View>
    );
  }

  const categoryTone =
    exercise.category === 'strength' ? 'clay' :
    exercise.category === 'stretch'  ? 'sage' :
    exercise.category === 'breathing'? 'ochre' : 'neutral';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <AppBar
        left={<IconBtn icon="close" onPress={() => router.back()}/>}
        title={seqIndex >= 0 ? `${seqIndex + 1} of ${seqTotal}` : ''}
        right={
          <TouchableOpacity onPress={() => setLiked((v) => !v)}>
            <Icon name="heart" size={22} color={liked ? COLORS.clay : COLORS.ink3}/>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Illustration panel */}
        <View style={styles.illustrationCard}>
          <AnimatedFigure
            figureType={exercise.figureType}
            accent={COLORS.clay}
            width="100%"
            height={220}
          />

          {/* Play/pause overlay */}
          <TouchableOpacity
            style={styles.playBtn}
            onPress={() => setPlaying((v) => !v)}
          >
            <Icon name={playing ? 'pause' : 'play'} size={20} color={COLORS.clay}/>
          </TouchableOpacity>

          {/* Loop tag */}
          <View style={styles.loopTag}>
            <Icon name="play" size={10} color={COLORS.ink3}/>
            <Text style={styles.loopText}>Loop · 4s</Text>
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Tag label={exercise.category} tone={categoryTone}/>
          <Text style={styles.name}>{exercise.name}</Text>
        </View>

        {/* Mini stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{reps}</Text>
            <Text style={styles.statLabel}>Reps</Text>
          </View>
          <View style={styles.statDivider}/>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{sets}</Text>
            <Text style={styles.statLabel}>Sets</Text>
          </View>
          <View style={styles.statDivider}/>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{hold > 0 ? `${hold}s` : '—'}</Text>
            <Text style={styles.statLabel}>Hold</Text>
          </View>
          <View style={styles.statDivider}/>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{rest}s</Text>
            <Text style={styles.statLabel}>Rest</Text>
          </View>
        </View>

        {/* Instructions */}
        <Text style={styles.sectionTitle}>How to move</Text>
        <View style={styles.steps}>
          {exercise.instructions.map((step, i) => (
            <View key={i} style={styles.step}>
              <Text style={styles.stepNum}>{i + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Therapist cue */}
        <View style={styles.cueBox}>
          <View style={styles.cueIconWrap}>
            <Icon name="shield" size={16} color={COLORS.sageDeep}/>
          </View>
          <Text style={styles.cueText}>{exercise.therapistCue}</Text>
        </View>

        <View style={{ height: 120 }}/>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label="Skip"
          variant="ghost"
          onPress={() => router.back()}
          style={styles.skipBtn}
        />
        <Button
          label="Start exercise"
          onPress={() => router.push('/session/today')}
          style={styles.startBtn}
          icon="play"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  notFound: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  notFoundText: { fontFamily: FONTS.sans, fontSize: 16, color: COLORS.ink3 },

  scroll: { paddingBottom: 20 },

  illustrationCard: {
    backgroundColor: COLORS.claySoft, height: 260,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 0,
  },
  playBtn: {
    position: 'absolute', bottom: 16, right: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  loopTag: {
    position: 'absolute', bottom: 16, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.surface, borderRadius: RADII.r4,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  loopText: { fontFamily: FONTS.sans, fontSize: 11, color: COLORS.ink3 },

  header: { paddingHorizontal: 20, paddingTop: 20, gap: 6, marginBottom: 20 },
  name: { fontFamily: FONTS.serif, fontSize: 28, color: COLORS.ink },

  statsRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 28,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r2, overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue: { fontFamily: FONTS.serif, fontSize: 22, color: COLORS.ink },
  statLabel: {
    fontFamily: FONTS.sans, fontSize: 10, fontWeight: '700',
    letterSpacing: 0.8, textTransform: 'uppercase', color: COLORS.ink3, marginTop: 2,
  },
  statDivider: { width: 1, backgroundColor: COLORS.borderSoft, marginVertical: 10 },

  sectionTitle: {
    fontFamily: FONTS.sans, fontSize: 11, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', color: COLORS.ink3,
    paddingHorizontal: 20, marginBottom: 14,
  },
  steps: { paddingHorizontal: 20, gap: 16, marginBottom: 24 },
  step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  stepNum: {
    fontFamily: FONTS.serif, fontSize: 22, color: COLORS.clay,
    width: 28, lineHeight: 26,
  },
  stepText: {
    flex: 1, fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink2,
    lineHeight: 22, paddingTop: 2,
  },

  cueBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: COLORS.sageSoft, borderRadius: RADII.r2,
    padding: 14, marginHorizontal: 20,
  },
  cueIconWrap: { marginTop: 1 },
  cueText: {
    flex: 1, fontFamily: FONTS.sans, fontSize: 13,
    color: COLORS.sageDeep, lineHeight: 20,
  },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.borderSoft,
  },
  skipBtn: { width: 90 },
  startBtn: { flex: 1 },
});
