import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSessionStore } from '@/lib/store/session';
import { EXERCISE_MAP } from '@/data/exercises';
import { AppBar, IconBtn } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { COLORS, FONTS, RADII, fontFor } from '@/lib/tokens';

const PAIN_LEVELS = [
  { value: 0, label: 'None',        sub: 'No pain',        color: COLORS.pain0 },
  { value: 1, label: 'Mild',        sub: 'Manageable',     color: COLORS.pain1 },
  { value: 2, label: 'Moderate',    sub: 'Noticeable',     color: COLORS.pain2 },
  { value: 3, label: 'Severe',      sub: 'Hard to ignore', color: COLORS.pain3 },
  { value: 4, label: 'Very severe', sub: 'Limiting',       color: COLORS.pain4 },
];

// 'Pinched', 'Felt good', 'Easy' and 'Tightness' drive adaptSession: keep the wording.
const FEEDBACK_TAGS = [
  'Felt good', 'Easy', 'Tightness', 'Pinched', 'Off-balance', 'Knees clicked',
];

interface FeedbackViewProps {
  onRequestClose: () => void;
}

/** Check-in for the exercise that was just finished (the current index). */
export function FeedbackView({ onRequestClose }: FeedbackViewProps) {
  const insets = useSafeAreaInsets();

  const activeSession        = useSessionStore((s) => s.activeSession);
  const currentExerciseIndex = useSessionStore((s) => s.currentExerciseIndex);
  const submitFeedback       = useSessionStore((s) => s.submitFeedback);

  const exercises = activeSession?.exercises ?? [];
  const pe        = exercises[currentExerciseIndex];
  const exercise  = pe ? EXERCISE_MAP[pe.exerciseId] : undefined;

  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [tags, setTags]           = useState<string[]>([]);
  const [notes, setNotes]         = useState('');

  function toggleTag(tag: string) {
    setTags((ts) => (ts.includes(tag) ? ts.filter((t) => t !== tag) : [...ts, tag]));
  }

  function handleContinue() {
    if (painLevel === null) return;
    submitFeedback(painLevel, tags, notes);
  }

  return (
    <View style={styles.root}>
      <AppBar
        left={<IconBtn icon="close" onPress={onRequestClose}/>}
        title="Quick check-in"
        right={
          <Text style={styles.indexText}>
            {currentExerciseIndex + 1} of {exercises.length}
          </Text>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {exercise && <Text style={styles.eyebrow}>{exercise.name}</Text>}
        <Text style={styles.headline}>How did that feel?</Text>

        <View style={styles.painGrid}>
          {PAIN_LEVELS.map((level) => {
            const selected = painLevel === level.value;
            return (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.painCard,
                  selected && { borderColor: level.color, backgroundColor: level.color + '22' },
                ]}
                onPress={() => setPainLevel(level.value)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <View style={[styles.painDot, { backgroundColor: level.color }]}/>
                <Text style={[styles.painLabel, selected && { color: level.color }]}>
                  {level.label}
                </Text>
                <Text style={styles.painSub}>{level.sub}</Text>
                {selected && (
                  <View style={[styles.painCheck, { backgroundColor: level.color }]}>
                    <Icon name="check" size={13} color="#fff" strokeWidth={2.4}/>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.chipsLabel}>Anything else?</Text>
        <View style={styles.chips}>
          {FEEDBACK_TAGS.map((tag) => {
            const active = tags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleTag(tag)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{tag}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={styles.notesInput}
          placeholder="Any notes? (optional)"
          placeholderTextColor={COLORS.ink4}
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
        />

        <View style={{ height: 100 }}/>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label="Continue"
          full
          onPress={handleContinue}
          disabled={painLevel === null}
          icon="arrowRight"
          iconPosition="right"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  indexText: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3 },

  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  eyebrow: {
    fontFamily: fontFor('700'), fontSize: 11,
    letterSpacing: 1, textTransform: 'uppercase', color: COLORS.ink3, marginBottom: 4,
  },
  headline: { fontFamily: FONTS.serif, fontSize: 28, color: COLORS.ink, marginBottom: 24 },

  painGrid: { gap: 8, marginBottom: 28 },
  painCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADII.r2, padding: 14, position: 'relative',
  },
  painDot: { width: 14, height: 14, borderRadius: 7 },
  painLabel: {
    fontFamily: fontFor('600'), fontSize: 15, color: COLORS.ink, flex: 1,
  },
  painSub: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3 },
  painCheck: {
    position: 'absolute', right: 14,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },

  chipsLabel: {
    fontFamily: fontFor('700'), fontSize: 11,
    letterSpacing: 1, textTransform: 'uppercase', color: COLORS.ink3, marginBottom: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADII.r4, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipActive: { backgroundColor: COLORS.claySoft, borderColor: COLORS.clay },
  chipText: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink2 },
  chipTextActive: { color: COLORS.clay, fontFamily: fontFor('600') },

  notesInput: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r2, padding: 14, fontFamily: FONTS.sans,
    fontSize: 14, color: COLORS.ink, minHeight: 80, textAlignVertical: 'top',
  },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.borderSoft,
  },
});
