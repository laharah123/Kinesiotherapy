import { create } from 'zustand';
import type { BodyRegion } from '@/components/figures/BodyMap';

export interface SessionSummary {
  id: string;
  date: string;           // ISO date string
  planTitle: string;
  durationSecs: number;
  avgPain: number;
  exercisesCompleted: number;
}

interface ProgressStore {
  // Last 7 days of pain scores (index 0 = oldest)
  weeklyPain: number[];

  // How often each body region appeared in completed sessions (0–100%)
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

export const useProgressStore = create<ProgressStore>((set, get) => ({
  weeklyPain: [0, 0, 0, 0, 0, 0, 0],
  regionActivity: {},
  recentSessions: [],
  streak: 0,
  totalSessions: 0,
  sessionsThisWeek: 0,

  recordSession: (summary) =>
    set((s) => {
      // Shift weekly pain: append today's avg, drop oldest
      const updated = [...s.weeklyPain.slice(-6), summary.avgPain];
      return {
        recentSessions: [summary, ...s.recentSessions].slice(0, 30),
        weeklyPain: updated,
        totalSessions: s.totalSessions + 1,
        sessionsThisWeek: s.sessionsThisWeek + 1,
      };
    }),

  setWeeklyPain: (values) =>
    set({ weeklyPain: values.slice(-7) }),

  setRegionActivity: (activity) => set({ regionActivity: activity }),

  setStreak: (streak) => set({ streak }),

  hydrate: (data) =>
    set((s) => ({
      weeklyPain:      data.weeklyPain      ?? s.weeklyPain,
      regionActivity:  data.regionActivity  ?? s.regionActivity,
      recentSessions:  data.recentSessions  ?? s.recentSessions,
      streak:          data.streak          ?? s.streak,
      totalSessions:   data.totalSessions   ?? s.totalSessions,
      sessionsThisWeek: data.sessionsThisWeek ?? s.sessionsThisWeek,
    })),
}));
