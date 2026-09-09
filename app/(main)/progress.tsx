import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

import { useAuthStore } from '@/lib/store/auth';
import { useProgressStore } from '@/lib/store/progress';
import { fetchWeeklyPain, fetchRecentSessions } from '@/lib/supabase';
import { dayInitials, lastLocalDates, parseLocalDate, toLocalDateKey } from '@/lib/plans/dates';
import { PainChart, RegionBar } from '@/components/charts/PainChart';
import { BodyMap, type BodyRegion } from '@/components/figures/BodyMap';
import { AppBar } from '@/components/ui/AppBar';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Glyph } from '@/lib/glyphs';
import { Icon } from '@/lib/icons';
import { COLORS, FONTS, RADII, fontFor } from '@/lib/tokens';

function painLabel(avg: number): string {
  if (avg === 0)  return 'No data yet';
  if (avg < 1.0)  return 'Pain has almost gone';
  if (avg < 2.0)  return 'Pain is easing nicely';
  if (avg < 3.0)  return 'Pain is easing';
  return 'Pain is still present';
}

function painTagTone(avg: number): 'sage' | 'ochre' | 'clay' {
  if (avg < 1.5) return 'sage';
  if (avg < 2.5) return 'ochre';
  return 'clay';
}

export default function ProgressScreen() {
  const { profile, hasFullAccess } = useAuthStore();
  const {
    weeklyPain, regionActivity, recentSessions,
    streak, sessionsThisWeek, totalSessions,
    setWeeklyPain, hydrate,
  } = useProgressStore();

  const nonZero = weeklyPain.filter((v) => v > 0);
  const avgPain = nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;

  // The headline counts sessions, not days with a session.
  const weekDates    = lastLocalDates(7);
  const weekWindow   = new Set(weekDates);
  const weekSessions = recentSessions.filter((s) => weekWindow.has(toLocalDateKey(s.date))).length;
  const labels       = dayInitials(weekDates);

  // Sort regions by activity percentage descending
  const regionEntries = Object.entries(regionActivity) as [BodyRegion, number][];
  regionEntries.sort((a, b) => b[1] - a[1]);
  const topRegions = regionEntries.slice(0, 5);
  const selectedRegions = topRegions.map(([r]) => r);

  useEffect(() => {
    async function load() {
      if (!profile?.id) return;
      try {
        const pain = await fetchWeeklyPain(profile.id);
        setWeeklyPain(pain);
        const sessions = await fetchRecentSessions(profile.id, 20);
        hydrate({
          // fetchWeeklyPain above is authoritative for the chart, so only the
          // history list is replaced here.
          weeklyPain: pain,
          recentSessions: sessions.map((row) => ({
            id:                 row.id,
            date:               toLocalDateKey(row.date),
            planTitle:          row.plans?.title ?? 'Session',
            durationSecs:       row.duration_secs ?? 0,
            avgPain:            Number(row.avg_pain ?? 0),
            exercisesCompleted: 0,
          })),
        });
      } catch { /* offline */ }
    }
    load();
  }, [profile?.id]);

  return (
    <View style={styles.root}>
      {/* AppBar applies the top inset itself */}
      <AppBar title="Progress"/>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary headline */}
        <Text style={styles.headline}>{painLabel(avgPain)}</Text>
        {weekSessions > 0 && (
          <Text style={styles.subline}>
            Based on your last {weekSessions} session{weekSessions !== 1 ? 's' : ''}.
          </Text>
        )}

        {/* Pain chart */}
        <Card style={styles.chartCard}>
          {/* Pain runs 0 to 4. The labels prop is spread so this compiles
              whether or not PainChart accepts it yet. */}
          <PainChart data={weeklyPain} maxValue={4} showTrend {...({ labels } as object)}/>
        </Card>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Glyph kind="check" size={36} color={COLORS.sageDeep} bg={COLORS.sageSoft}/>
            <Text style={styles.statValue}>{totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Glyph kind="flame" size={36} color={COLORS.ochre} bg={COLORS.ochreSoft}/>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Day streak</Text>
          </View>
          <View style={styles.statCard}>
            <Glyph kind="sun" size={36} color={COLORS.clay} bg={COLORS.claySoft}/>
            <Text style={styles.statValue}>{sessionsThisWeek}</Text>
            <Text style={styles.statLabel}>This week</Text>
          </View>
        </View>

        {/* Body heatmap */}
        <Text style={styles.sectionLabel}>Where you've felt it</Text>
        {topRegions.length > 0 ? (
          <Card style={styles.heatmapCard}>
            <View style={styles.heatmapInner}>
              <BodyMap
                width={110}
                side="front"
                selected={selectedRegions}
                hot={COLORS.clay}
              />
              <View style={styles.regionBars}>
                {topRegions.map(([region, pct]) => (
                  <RegionBar
                    key={region}
                    name={region.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                    pct={pct}
                    color={COLORS.clay}
                  />
                ))}
              </View>
            </View>
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Complete sessions to see which body areas you've been working on.
            </Text>
          </Card>
        )}

        {/* Recent history */}
        <Text style={styles.sectionLabel}>Recent history</Text>
        {recentSessions.length > 0 ? (
          <View style={styles.historyList}>
            {recentSessions.slice(0, 8).map((s) => {
              const mins  = Math.round(s.durationSecs / 60);
              const date  = (parseLocalDate(s.date) ?? new Date()).toLocaleDateString(undefined, {
                weekday: 'short', month: 'short', day: 'numeric',
              });
              return (
                <View key={s.id} style={styles.historyRow}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyDate}>{date}</Text>
                    <Text style={styles.historyTitle}>{s.planTitle}</Text>
                  </View>
                  <View style={styles.historyRight}>
                    {mins > 0 && (
                      <Text style={styles.historyDuration}>{mins} min</Text>
                    )}
                    <Tag
                      label={`Pain ${s.avgPain.toFixed(1)}`}
                      tone={painTagTone(s.avgPain)}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Your completed sessions will appear here.
            </Text>
          </Card>
        )}

        {/* Paywall notice for trial users */}
        {!hasFullAccess && (
          <View style={styles.paywallBanner}>
            <Icon name="lock" size={16} color={COLORS.clay}/>
            <Text style={styles.paywallText}>
              Subscribe to unlock full progress insights and trends.
            </Text>
          </View>
        )}

        <View style={{ height: 80 }}/>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 20 },

  headline: {
    fontFamily: FONTS.serif, fontSize: 28, color: COLORS.ink,
    marginTop: 8, marginBottom: 4,
  },
  subline: {
    fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3, marginBottom: 20,
  },

  chartCard: { marginBottom: 16, padding: 16 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderWidth: 1,
    borderColor: COLORS.border, borderRadius: RADII.r2,
    padding: 14, alignItems: 'center', gap: 6,
  },
  statValue: { fontFamily: FONTS.serif, fontSize: 26, color: COLORS.ink },
  statLabel: { fontFamily: FONTS.sans, fontSize: 11, color: COLORS.ink3 },

  sectionLabel: {
    fontFamily: fontFor('700'), fontSize: 11,
    letterSpacing: 1, textTransform: 'uppercase', color: COLORS.ink3,
    marginBottom: 12 },

  heatmapCard: { marginBottom: 28, padding: 16 },
  heatmapInner: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  regionBars: { flex: 1, justifyContent: 'center' },

  historyList: { gap: 2, marginBottom: 20 },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r2, padding: 14, marginBottom: 8,
  },
  historyLeft: { gap: 2 },
  historyDate: { fontFamily: FONTS.sans, fontSize: 11, color: COLORS.ink3 },
  historyTitle: { fontFamily: fontFor('600'), fontSize: 14, color: COLORS.ink },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyDuration: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3 },

  emptyCard: { padding: 20, marginBottom: 28 },
  emptyText: {
    fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3,
    textAlign: 'center', lineHeight: 20,
  },

  paywallBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.claySoft, borderRadius: RADII.r2,
    padding: 14, marginBottom: 8,
  },
  paywallText: {
    flex: 1, fontFamily: FONTS.sans, fontSize: 13, color: COLORS.clay, lineHeight: 19,
  },
});
