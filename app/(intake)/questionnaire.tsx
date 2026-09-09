import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Choice } from '@/components/ui/Choice';
import { useIntakeStore } from '@/lib/store/intake';
import { savePlan } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store/auth';
import { Icon } from '@/lib/icons';
import { COLORS, FONTS, RADII } from '@/lib/tokens';

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  {
    key: 'painDuration' as const,
    question: 'How long have you had this pain?',
    options: [
      { value: 'acute',      label: 'Just a few days',        subtitle: 'Started recently' },
      { value: 'subacute',   label: '1–4 weeks',              subtitle: 'Coming and going' },
      { value: 'persistent', label: 'Over a month',           subtitle: 'Ongoing issue' },
      { value: 'chronic',    label: 'On and off for years',   subtitle: 'Long-standing' },
    ],
  },
  {
    key: 'painIntensity' as const,
    question: 'How intense is the pain right now?',
    options: [
      { value: '0', label: 'None',     subtitle: 'No pain at rest' },
      { value: '1', label: 'Mild',     subtitle: 'Noticeable but manageable' },
      { value: '2', label: 'Moderate', subtitle: 'Affects daily tasks' },
      { value: '3', label: 'Severe',   subtitle: 'Hard to ignore' },
      { value: '4', label: 'Very severe', subtitle: 'Constant, limiting' },
    ],
  },
  {
    key: 'aggravatingFactors' as const,
    question: 'What makes it worse?',
    multi: true,
    options: [
      { value: 'sitting',   label: 'Sitting',   subtitle: 'Desk or driving' },
      { value: 'standing',  label: 'Standing',  subtitle: 'Prolonged standing' },
      { value: 'morning',   label: 'Morning',   subtitle: 'Worse on waking' },
      { value: 'exercise',  label: 'Exercise',  subtitle: 'During or after' },
      { value: 'none',      label: 'None',      subtitle: 'No clear trigger' },
    ],
  },
  {
    key: 'previousTreatment' as const,
    question: 'Have you had treatment before?',
    multi: true,
    options: [
      { value: 'none',    label: 'None',            subtitle: 'First time seeking help' },
      { value: 'physio',  label: 'Physiotherapy',   subtitle: 'Exercise-based treatment' },
      { value: 'chiro',   label: 'Chiropractic',    subtitle: 'Manual therapy' },
      { value: 'surgery', label: 'Surgery',         subtitle: 'Surgical intervention' },
    ],
  },
  {
    key: 'goals' as const,
    question: "What's your main goal?",
    multi: true,
    options: [
      { value: 'reduce-pain',     label: 'Reduce pain',        subtitle: 'Day-to-day relief' },
      { value: 'mobility',        label: 'Improve mobility',   subtitle: 'Move more freely' },
      { value: 'maintain',        label: 'Maintain progress',  subtitle: 'Stay on track' },
      { value: 'return-to-sport', label: 'Return to sport',    subtitle: 'Athletic goals' },
    ],
  },
];

const TOTAL = STEPS.length;

export default function QuestionnaireScreen() {
  const router   = useRouter();
  const { answers, setAnswer, submitQuestionnaire } = useIntakeStore();
  const { user } = useAuthStore();

  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);

  const current = STEPS[step];
  const isMulti = 'multi' in current && current.multi;

  // Current answer value(s)
  const rawValue = answers[current.key];
  const selected: string[] = Array.isArray(rawValue)
    ? rawValue
    : rawValue != null ? [String(rawValue)] : [];

  function toggle(value: string) {
    if (isMulti) {
      const next = selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value];
      setAnswer(current.key as any, next as any);
    } else {
      setAnswer(current.key as any, value as any);
    }
  }

  function canAdvance() {
    return selected.length > 0;
  }

  async function handleNext() {
    if (step < TOTAL - 1) {
      setStep((s) => s + 1);
      return;
    }

    // Final step — generate plan and navigate
    setLoading(true);
    try {
      const plan = submitQuestionnaire();
      if (user) {
        await savePlan(user.id, {
          condition_id:  plan.conditionId,
          title:         plan.title,
          effort:        plan.effort,
          duration_days: plan.durationDays,
          exercise_pool: plan.exercisePool,
          user_tier:     plan.userTier,
          pain_ema:      plan.painEMA,
        });
      }
      router.replace('/(main)');
    } catch {
      // Continue anyway — plan lives in local store
      router.replace('/(main)');
    } finally {
      setLoading(false);
    }
  }

  const highPain = answers.painIntensity != null && Number(answers.painIntensity) >= 3;

  return (
    <View style={styles.root}>
      <AppBar
        left={
          step > 0
            ? <Icon name="back" size={22} color={COLORS.ink} onPress={() => setStep((s) => s - 1)}/>
            : <Icon name="back" size={22} color={COLORS.ink} onPress={() => router.back()}/>
        }
        title={`${step + 1} of ${TOTAL}`}
      />

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((step + 1) / TOTAL) * 100}%` as any }]}/>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.question}>{current.question}</Text>
        {isMulti && (
          <Text style={styles.multiHint}>Select all that apply</Text>
        )}

        <View style={styles.choices}>
          {current.options.map((opt) => (
            <Choice
              key={opt.value}
              value={opt.label}
              subtitle={opt.subtitle}
              selected={selected.includes(opt.value)}
              onPress={() => toggle(opt.value)}
            />
          ))}
        </View>

        {/* Safety notice for high-pain responses */}
        {highPain && step === 1 && (
          <View style={styles.safetyBox}>
            <Icon name="shield" size={18} color={COLORS.sageDeep}/>
            <Text style={styles.safetyText}>
              We'll start with gentle exercises and go at your pace. If your pain is severe or
              worsening, please consult a healthcare professional first.
            </Text>
          </View>
        )}

        <View style={styles.bottomPad}/>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={step < TOTAL - 1 ? 'Next' : 'Build my plan'}
          onPress={handleNext}
          full
          loading={loading}
          icon={step < TOTAL - 1 ? 'arrowRight' : 'sparkle'}
          iconPosition="right"
          disabled={!canAdvance()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  progressTrack: {
    height: 3, backgroundColor: COLORS.borderSoft, marginHorizontal: 0,
  },
  progressFill: {
    height: '100%', backgroundColor: COLORS.clay, borderRadius: 2,
  },

  scroll: { padding: 24, paddingBottom: 20 },
  question: {
    fontFamily: FONTS.serif, fontSize: 26, color: COLORS.ink,
    marginBottom: 6, marginTop: 8,
  },
  multiHint: {
    fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3, marginBottom: 20,
  },
  choices: { gap: 10, marginTop: 16 },

  safetyBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: COLORS.sageSoft, borderRadius: RADII.r2,
    padding: 14, marginTop: 24,
  },
  safetyText: {
    flex: 1, fontFamily: FONTS.sans, fontSize: 13, color: COLORS.sageDeep, lineHeight: 19,
  },

  bottomPad: { height: 100 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 24, paddingBottom: 40, backgroundColor: COLORS.bg,
    borderTopWidth: 1, borderTopColor: COLORS.borderSoft,
  },
});
