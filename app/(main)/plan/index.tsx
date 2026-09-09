import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIntakeStore } from '@/lib/store/intake';
import { useSessionStore } from '@/lib/store/session';
import { canStartSession, PAYWALL_ROUTE } from '@/lib/access';
import { EXERCISE_MAP } from '@/data/exercises';
import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { Icon } from '@/lib/icons';
import { COLORS, FONTS, RADII, fontFor } from '@/lib/tokens';

export default function PlanScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { generatedPlan, getCurrentDay, getNextActiveDay } = useIntakeStore();
  const { activeSession, currentExerciseIndex } = useSessionStore();

  const plan       = generatedPlan;
  const today      = getCurrentDay();
  const nextActive = getNextActiveDay();
  // A rest day or a finished day previews the next real session instead.
  const shownDay   = !today || today.isRest || today.completedToday ? nextActive : today;
  const exercises  = shownDay?.exercises ?? [];
  const completedCount = activeSession ? currentExerciseIndex : 0;

  function startSession() {
    if (!canStartSession()) {
      router.push(PAYWALL_ROUTE);
      return;
    }
    router.push('/session/today');
  }

  if (!plan) {
    return (
      <View style={styles.empty}>
        <Icon name="plan" size={40} color={COLORS.ink4}/>
        <Text style={styles.emptyTitle}>No plan yet</Text>
        <Text style={styles.emptySub}>Complete the intake to build your routine.</Text>
        <Button label="Start intake" onPress={() => router.push('/(intake)/body-map')}/>
      </View>
    );
  }

  const sessionMins = exercises.reduce((acc, e) => {
    const ex = EXERCISE_MAP[e.exerciseId];
    return acc + (ex ? Math.ceil(ex.durationEstimateSecs / 60) : 2);
  }, 0);

  return (
    <View style={styles.root}>
      {/* AppBar applies the top inset itself */}
      <AppBar title={plan.title}/>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>
            {today?.isRest
              ? `Rest day · day ${today.day} of ${plan.durationDays}`
              : today?.completedToday
                ? `Day ${today.day} complete`
                : `Day ${shownDay?.day ?? 1} of ${plan.durationDays}`}
          </Text>
          <Text style={styles.heroTitle}>
            {today?.isRest || today?.completedToday ? 'Next session' : "Today's session"}
          </Text>
          <View style={styles.heroMeta}>
            <View style={styles.heroMetaItem}>
              <Icon name="clock" size={14} color={COLORS.ink3}/>
              <Text style={styles.heroMetaText}>{sessionMins} min</Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Icon name="plan" size={14} color={COLORS.ink3}/>
              <Text style={styles.heroMetaText}>{exercises.length} exercises</Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Icon name="bolt" size={14} color={COLORS.ink3}/>
              <Text style={styles.heroMetaText}>{plan.effort}</Text>
            </View>
          </View>
        </View>

        {/* Sequence header */}
        <View style={styles.seqHeader}>
          <Text style={styles.seqTitle}>Your sequence</Text>
          <Text style={styles.seqCount}>{completedCount} of {exercises.length} done</Text>
        </View>

        {/* Exercise list */}
        <View style={styles.sequence}>
          {exercises.map((pe, idx) => {
            const ex      = EXERCISE_MAP[pe.exerciseId];
            const done    = idx < completedCount;
            const active  = idx === completedCount;
            if (!ex) return null;

            return (
              <View key={`${pe.exerciseId}-${idx}`} style={styles.rowWrap}>
                {/* Connecting line */}
                {idx < exercises.length - 1 && (
                  <View style={[styles.connector, done && styles.connectorDone]}/>
                )}

                <TouchableOpacity
                  style={[
                    styles.exRow,
                    active && styles.exRowActive,
                    done && styles.exRowDone,
                  ]}
                  onPress={() => router.push(`/(main)/plan/${ex.id}`)}
                  activeOpacity={0.75}
                >
                  {/* Circle indicator */}
                  <View style={[
                    styles.circle,
                    done   && styles.circleDone,
                    active && styles.circleActive,
                  ]}>
                    {done
                      ? <Icon name="check" size={14} color="#fff"/>
                      : <Text style={[styles.circleNum, active && styles.circleNumActive]}>
                          {idx + 1}
                        </Text>
                    }
                  </View>

                  <View style={styles.exBody}>
                    {active && (
                      <Text style={styles.upNextLabel}>Up next</Text>
                    )}
                    <Text style={[styles.exName, done && styles.exNameDone]}>{ex.name}</Text>
                    <Text style={styles.exMeta}>
                      {pe.reps > 1 ? `${pe.reps} reps` : ''}{pe.reps > 1 && pe.sets > 1 ? ' · ' : ''}{pe.sets > 1 ? `${pe.sets} sets` : ''}{pe.holdSeconds > 0 ? ` · ${pe.holdSeconds}s hold` : ''}
                    </Text>
                  </View>

                  <Tag
                    label={ex.category}
                    tone={ex.category === 'strength' ? 'clay' : ex.category === 'stretch' ? 'sage' : 'neutral'}
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={{ height: 120 }}/>
      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label={completedCount > 0 ? 'Continue session' : 'Start session'}
          full
          icon="play"
          disabled={exercises.length === 0}
          onPress={startSession}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, padding: 32, backgroundColor: COLORS.bg,
  },
  emptyTitle: { fontFamily: FONTS.serif, fontSize: 22, color: COLORS.ink },
  emptySub: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink3, textAlign: 'center' },

  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },

  heroCard: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r2, padding: 18, marginBottom: 24,
  },
  heroEyebrow: {
    fontFamily: fontFor('700'), fontSize: 10,
    letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.ink3, marginBottom: 6 },
  heroTitle: { fontFamily: FONTS.serif, fontSize: 20, color: COLORS.ink, marginBottom: 12 },
  heroMeta: { flexDirection: 'row', gap: 18 },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroMetaText: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3 },

  seqHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  seqTitle: { fontFamily: fontFor('700'), fontSize: 13, color: COLORS.ink },
  seqCount: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3 },

  sequence: { gap: 0 },
  rowWrap: { position: 'relative' },
  connector: {
    position: 'absolute', left: 19, top: 56, bottom: -10,
    width: 2, backgroundColor: COLORS.borderSoft, zIndex: 0,
  },
  connectorDone: { backgroundColor: COLORS.sage },

  exRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r2, padding: 14, marginBottom: 10, zIndex: 1,
  },
  exRowActive: { borderColor: COLORS.clay, backgroundColor: COLORS.claySoft },
  exRowDone: { opacity: 0.6 },

  circle: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  circleDone: { backgroundColor: COLORS.sage, borderColor: COLORS.sage },
  circleActive: { backgroundColor: COLORS.clay, borderColor: COLORS.clay },
  circleNum: { fontFamily: fontFor('700'), fontSize: 13, color: COLORS.ink3 },
  circleNumActive: { color: '#fff' },

  exBody: { flex: 1 },
  upNextLabel: {
    fontFamily: fontFor('700'), fontSize: 10,
    letterSpacing: 0.8, textTransform: 'uppercase', color: COLORS.clay, marginBottom: 2 },
  exName: { fontFamily: fontFor('600'), fontSize: 14, color: COLORS.ink },
  exNameDone: { color: COLORS.ink3 },
  exMeta: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3, marginTop: 2 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.borderSoft,
  },
});
