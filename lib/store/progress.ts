import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { BodyRegion } from '@/components/figures/BodyMap';
import { EXERCISE_MAP } from '@/data/exercises';
import { daysBetween, lastLocalDates, localDateString, toLocalDateKey } from '@/lib/plans/dates';
import { persistStorage } from '@/lib/plans/storage';

/** How many days of history feed the body-region heatmap. */
const REGION_WINDOW_DAYS = 14;

export interface SessionSummary {
  id: string;
  date: string;           // local YYYY-MM-DD
  planTitle: string;
  durationSecs: number;
  avgPain: number;
  exercisesCompleted: number;
  /** Exercises actually completed, used for the body-region heatmap. */
  exerciseIds?: string[];
  /** Schedule day this session covered, when it came from a plan. */
  day?: number;
}

interface ProgressStore {
  // Last 7 calendar days of pain scores (index 0 = oldest, 0 = no session)
  weeklyPain: number[];

  // How often each body region appeared in recent sessions (0–100%)
  regionActivity: Partial<Record<BodyRegion, number>>;

  // Recent session summaries for history list
  recentSessions: SessionSummary[];

  streak: number;
  totalSessions: number;
  sessionsThisWeek: number;

  // Actions
  recordSession: (summary: SessionSummary) => void;
  setWeeklyPain: (values: number[]) => void;
  setRegionActivity: (activity: Partial<Record<BodyRegion, number>>) => void;
  setStreak: (n: number) => void;

  // Bulk hydrate from remote data
  hydrate: (data: {
    weeklyPain?: number[];
    regionActivity?: Partial<Record<BodyRegion, number>>;
    recentSessions?: SessionSummary[];
    streak?: number;
    totalSessions?: number;
    sessionsThisWeek?: number;
  }) => void;
}

// ─── Derivations ──────────────────────────────────────────────────────────────

/** Mean pain per local calendar day for the last 7 days, oldest first. */
export function weeklyPainFrom(sessions: SessionSummary[], today: Date = new Date()): number[] {
  const totals: Record<string, { sum: number; count: number }> = {};
  sessions.forEach((s) => {
    const key = toLocalDateKey(s.date);
    const bucket = totals[key] ?? { sum: 0, count: 0 };
    bucket.sum   += s.avgPain;
    bucket.count += 1;
    totals[key] = bucket;
  });

  return lastLocalDates(7, today).map((key) => {
    const bucket = totals[key];
    return bucket && bucket.count > 0 ? bucket.sum / bucket.count : 0;
  });
}

/**
 * Share of recent sessions that touched each body region, as a percentage.
 * Only sessions that recorded their exercises can contribute.
 */
export function regionActivityFrom(
  sessions: SessionSummary[],
  today: Date = new Date(),
): Partial<Record<BodyRegion, number>> {
  const todayKey = localDateString(today);
  const recent = sessions.filter((s) => {
    if (!s.exerciseIds || s.exerciseIds.length === 0) return false;
    const age = daysBetween(toLocalDateKey(s.date), todayKey);
    return age >= 0 && age < REGION_WINDOW_DAYS;
  });
  if (recent.length === 0) return {};

  const counts: Record<string, number> = {};
  recent.forEach((s) => {
    const regions = new Set<string>();
    (s.exerciseIds ?? []).forEach((id) => {
      EXERCISE_MAP[id]?.bodyRegions.forEach((r) => regions.add(r));
    });
    regions.forEach((r) => { counts[r] = (counts[r] ?? 0) + 1; });
  });

  const activity: Partial<Record<BodyRegion, number>> = {};
  Object.entries(counts).forEach(([region, count]) => {
    activity[region as BodyRegion] = Math.round((count / recent.length) * 100);
  });
  return activity;
}

/** Sessions completed in the last 7 calendar days, today included. */
export function sessionsThisWeekFrom(sessions: SessionSummary[], today: Date = new Date()): number {
  const window = new Set(lastLocalDates(7, today));
  return sessions.filter((s) => window.has(toLocalDateKey(s.date))).length;
}

/** Consecutive days ending today (or yesterday) that have a session. */
export function streakFrom(sessions: SessionSummary[], today: Date = new Date()): number {
  const days = new Set(sessions.map((s) => toLocalDateKey(s.date)));
  if (days.size === 0) return 0;

  const todayKey = localDateString(today);
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // A streak survives until the end of the following day.
  if (!days.has(todayKey)) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (days.has(localDateString(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ─── Store ────────────────────────────────────────────────────────────────────

const INITIAL = {
  weeklyPain: [0, 0, 0, 0, 0, 0, 0] as number[],
  regionActivity: {} as Partial<Record<BodyRegion, number>>,
  recentSessions: [] as SessionSummary[],
  streak: 0,
  totalSessions: 0,
  sessionsThisWeek: 0,
};

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set) => ({
      ...INITIAL,

      recordSession: (summary) =>
        set((s) => {
          const entry: SessionSummary = { ...summary, date: toLocalDateKey(summary.date) };
          const recentSessions = [entry, ...s.recentSessions].slice(0, 30);
          return {
            recentSessions,
            weeklyPain:       weeklyPainFrom(recentSessions),
            regionActivity:   regionActivityFrom(recentSessions),
            sessionsThisWeek: sessionsThisWeekFrom(recentSessions),
            streak:           streakFrom(recentSessions),
            totalSessions:    s.totalSessions + 1,
          };
        }),

      setWeeklyPain: (values) =>
        set({ weeklyPain: values.slice(-7) }),

      setRegionActivity: (activity) => set({ regionActivity: activity }),

      setStreak: (streak) => set({ streak }),

      hydrate: (data) =>
        set((s) => {
          const recentSessions = data.recentSessions ?? s.recentSessions;
          const derived = data.recentSessions
            ? {
                weeklyPain:       weeklyPainFrom(recentSessions),
                regionActivity:   regionActivityFrom(recentSessions),
                sessionsThisWeek: sessionsThisWeekFrom(recentSessions),
              }
            : {
                weeklyPain:       s.weeklyPain,
                regionActivity:   s.regionActivity,
                sessionsThisWeek: s.sessionsThisWeek,
              };

          return {
            recentSessions,
            // Explicit values always win over the derived ones.
            weeklyPain:       data.weeklyPain       ?? derived.weeklyPain,
            regionActivity:   data.regionActivity   ?? derived.regionActivity,
            sessionsThisWeek: data.sessionsThisWeek ?? derived.sessionsThisWeek,
            streak:           data.streak           ?? s.streak,
            totalSessions:    data.totalSessions    ?? s.totalSessions,
          };
        }),
    }),
    {
      name: 'kinesio-progress',
      storage: persistStorage<ProgressStore>(),
      partialize: (s) => ({
        weeklyPain: s.weeklyPain,
        regionActivity: s.regionActivity,
        recentSessions: s.recentSessions,
        streak: s.streak,
        totalSessions: s.totalSessions,
        sessionsThisWeek: s.sessionsThisWeek,
      }) as ProgressStore,
    },
  ),
);
