/**
 * Unit tests for lib/store/progress.ts.
 *
 * The derived values are the point here: pain keyed by local calendar day,
 * the body-region heatmap built from the exercises actually completed, and the
 * week/streak counters.
 */

// AsyncStorage has no native module under Jest, so persistence runs in memory.
import {
  useProgressStore,
  weeklyPainFrom,
  regionActivityFrom,
  sessionsThisWeekFrom,
  streakFrom,
  type SessionSummary,
} from '@/lib/store/progress';
import { localDateString } from '@/lib/plans/dates';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem:    jest.fn(async (key: string) => store[key] ?? null),
      setItem:    jest.fn(async (key: string, value: string) => { store[key] = value; }),
      removeItem: jest.fn(async (key: string) => { delete store[key]; }),
    },
  };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TODAY = new Date(2026, 8, 9);   // 9 September 2026, local

function dayKey(offset: number, from: Date = TODAY): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset);
  return localDateString(d);
}

function summary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: `s-${Math.random()}`,
    date: dayKey(0),
    planTitle: 'Lower back relief',
    durationSecs: 600,
    avgPain: 2,
    exercisesCompleted: 3,
    ...overrides,
  };
}

const INITIAL = {
  weeklyPain: [0, 0, 0, 0, 0, 0, 0],
  regionActivity: {},
  recentSessions: [],
  streak: 0,
  totalSessions: 0,
  sessionsThisWeek: 0,
};

beforeEach(() => { useProgressStore.setState(INITIAL); });

// ─── weeklyPainFrom ───────────────────────────────────────────────────────────

describe('weeklyPainFrom', () => {
  it('returns seven values', () => {
    expect(weeklyPainFrom([], TODAY)).toHaveLength(7);
  });

  it('returns zeros with no sessions', () => {
    expect(weeklyPainFrom([], TODAY)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('places today at the end of the array', () => {
    const values = weeklyPainFrom([summary({ date: dayKey(0), avgPain: 3 })], TODAY);
    expect(values[6]).toBe(3);
    expect(values.slice(0, 6)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('keys pain by calendar day, not by session order', () => {
    const values = weeklyPainFrom([
      summary({ date: dayKey(0),  avgPain: 1 }),
      summary({ date: dayKey(-3), avgPain: 4 }),
    ], TODAY);
    expect(values[6]).toBe(1);
    expect(values[3]).toBe(4);
  });

  it('averages two sessions completed on the same day', () => {
    const values = weeklyPainFrom([
      summary({ date: dayKey(-1), avgPain: 1 }),
      summary({ date: dayKey(-1), avgPain: 3 }),
    ], TODAY);
    expect(values[5]).toBe(2);
  });

  it('leaves a day without a session at zero rather than shifting', () => {
    const values = weeklyPainFrom([
      summary({ date: dayKey(-6), avgPain: 4 }),
      summary({ date: dayKey(0),  avgPain: 1 }),
    ], TODAY);
    expect(values).toEqual([4, 0, 0, 0, 0, 0, 1]);
  });

  it('ignores sessions older than seven days', () => {
    const values = weeklyPainFrom([summary({ date: dayKey(-9), avgPain: 4 })], TODAY);
    expect(values).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

// ─── regionActivityFrom ───────────────────────────────────────────────────────

describe('regionActivityFrom', () => {
  it('is empty when no session recorded its exercises', () => {
    expect(regionActivityFrom([summary()], TODAY)).toEqual({});
  });

  it('reports 100% for a region every session touched', () => {
    const activity = regionActivityFrom([
      summary({ date: dayKey(0),  exerciseIds: ['pelvic-tilt'] }),
      summary({ date: dayKey(-1), exerciseIds: ['pelvic-tilt'] }),
    ], TODAY);
    expect(activity.lowBack).toBe(100);
  });

  it('reports the share of sessions that touched a region', () => {
    const activity = regionActivityFrom([
      summary({ date: dayKey(0),  exerciseIds: ['chin-tuck'] }),   // neck
      summary({ date: dayKey(-1), exerciseIds: ['pelvic-tilt'] }), // lowBack
    ], TODAY);
    expect(activity.neck).toBe(50);
    expect(activity.lowBack).toBe(50);
  });

  it('counts a region once per session however many exercises hit it', () => {
    const activity = regionActivityFrom([
      summary({ date: dayKey(0), exerciseIds: ['pelvic-tilt', 'knee-to-chest'] }),
    ], TODAY);
    expect(activity.lowBack).toBe(100);
  });

  it('covers every region an exercise targets', () => {
    // cat-cow targets lowBack, midBack and neck
    const activity = regionActivityFrom([
      summary({ date: dayKey(0), exerciseIds: ['cat-cow'] }),
    ], TODAY);
    expect(activity.lowBack).toBe(100);
    expect(activity.midBack).toBe(100);
    expect(activity.neck).toBe(100);
  });

  it('only looks at the last fourteen days', () => {
    const activity = regionActivityFrom([
      summary({ date: dayKey(-20), exerciseIds: ['chin-tuck'] }),
      summary({ date: dayKey(-1),  exerciseIds: ['pelvic-tilt'] }),
    ], TODAY);
    expect(activity.neck).toBeUndefined();
    expect(activity.lowBack).toBe(100);
  });

  it('ignores unknown exercise ids', () => {
    const activity = regionActivityFrom([
      summary({ date: dayKey(0), exerciseIds: ['does-not-exist'] }),
    ], TODAY);
    expect(activity).toEqual({});
  });
});

// ─── sessionsThisWeekFrom and streakFrom ──────────────────────────────────────

describe('sessionsThisWeekFrom', () => {
  it('counts sessions inside the last seven days', () => {
    const count = sessionsThisWeekFrom([
      summary({ date: dayKey(0) }),
      summary({ date: dayKey(-6) }),
      summary({ date: dayKey(-7) }),
    ], TODAY);
    expect(count).toBe(2);
  });

  it('counts two sessions on the same day separately', () => {
    const count = sessionsThisWeekFrom([
      summary({ date: dayKey(0) }),
      summary({ date: dayKey(0) }),
    ], TODAY);
    expect(count).toBe(2);
  });
});

describe('streakFrom', () => {
  it('is zero without sessions', () => {
    expect(streakFrom([], TODAY)).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const streak = streakFrom([
      summary({ date: dayKey(0) }),
      summary({ date: dayKey(-1) }),
      summary({ date: dayKey(-2) }),
    ], TODAY);
    expect(streak).toBe(3);
  });

  it('survives a day that is not over yet', () => {
    const streak = streakFrom([
      summary({ date: dayKey(-1) }),
      summary({ date: dayKey(-2) }),
    ], TODAY);
    expect(streak).toBe(2);
  });

  it('breaks on a missed day', () => {
    const streak = streakFrom([
      summary({ date: dayKey(0) }),
      summary({ date: dayKey(-2) }),
    ], TODAY);
    expect(streak).toBe(1);
  });

  it('is zero when the last session is older than yesterday', () => {
    expect(streakFrom([summary({ date: dayKey(-3) })], TODAY)).toBe(0);
  });
});

// ─── recordSession ────────────────────────────────────────────────────────────

describe('useProgressStore — recordSession', () => {
  it('prepends the session to the history', () => {
    useProgressStore.getState().recordSession(summary({ id: 'a', date: localDateString() }));
    useProgressStore.getState().recordSession(summary({ id: 'b', date: localDateString() }));
    expect(useProgressStore.getState().recentSessions.map((s) => s.id)).toEqual(['b', 'a']);
  });

  it('caps the history at 30 entries', () => {
    for (let i = 0; i < 35; i++) {
      useProgressStore.getState().recordSession(summary({ id: `s${i}`, date: localDateString() }));
    }
    expect(useProgressStore.getState().recentSessions).toHaveLength(30);
  });

  it('increments the lifetime session count', () => {
    useProgressStore.getState().recordSession(summary({ date: localDateString() }));
    useProgressStore.getState().recordSession(summary({ date: localDateString() }));
    expect(useProgressStore.getState().totalSessions).toBe(2);
  });

  it('writes the pain for today into the last slot of the week', () => {
    useProgressStore.getState().recordSession(summary({ date: localDateString(), avgPain: 2.5 }));
    const { weeklyPain } = useProgressStore.getState();
    expect(weeklyPain).toHaveLength(7);
    expect(weeklyPain[6]).toBeCloseTo(2.5, 5);
  });

  it('does not shift the week when two sessions land on the same day', () => {
    useProgressStore.getState().recordSession(summary({ date: localDateString(), avgPain: 1 }));
    useProgressStore.getState().recordSession(summary({ date: localDateString(), avgPain: 3 }));
    const { weeklyPain } = useProgressStore.getState();
    expect(weeklyPain[6]).toBeCloseTo(2, 5);
    expect(weeklyPain[5]).toBe(0);
  });

  it('populates regionActivity from the completed exercises', () => {
    useProgressStore.getState().recordSession(
      summary({ date: localDateString(), exerciseIds: ['pelvic-tilt'] }),
    );
    expect(useProgressStore.getState().regionActivity.lowBack).toBe(100);
  });

  it('counts the session in this week and in the streak', () => {
    useProgressStore.getState().recordSession(summary({ date: localDateString() }));
    const s = useProgressStore.getState();
    expect(s.sessionsThisWeek).toBe(1);
    expect(s.streak).toBe(1);
  });

  it('normalises an ISO timestamp to a local calendar day', () => {
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    useProgressStore.getState().recordSession(summary({ date: noon.toISOString() }));
    expect(useProgressStore.getState().recentSessions[0].date).toBe(localDateString());
  });
});

// ─── hydrate and setters ──────────────────────────────────────────────────────

describe('useProgressStore — hydrate', () => {
  it('recomputes the derived values from hydrated sessions', () => {
    useProgressStore.getState().hydrate({
      recentSessions: [
        summary({ date: localDateString(), avgPain: 2, exerciseIds: ['pelvic-tilt'] }),
      ],
    });
    const s = useProgressStore.getState();
    expect(s.weeklyPain[6]).toBe(2);
    expect(s.regionActivity.lowBack).toBe(100);
    expect(s.sessionsThisWeek).toBe(1);
  });

  it('lets an explicit weeklyPain win over the derived one', () => {
    useProgressStore.getState().hydrate({
      recentSessions: [summary({ date: localDateString(), avgPain: 2 })],
      weeklyPain: [1, 1, 1, 1, 1, 1, 1],
    });
    expect(useProgressStore.getState().weeklyPain).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });

  it('leaves untouched fields alone', () => {
    useProgressStore.setState({ ...INITIAL, streak: 4, totalSessions: 9 });
    useProgressStore.getState().hydrate({ recentSessions: [] });
    const s = useProgressStore.getState();
    expect(s.streak).toBe(4);
    expect(s.totalSessions).toBe(9);
  });
});

describe('useProgressStore — setters', () => {
  it('setWeeklyPain keeps the last seven values', () => {
    useProgressStore.getState().setWeeklyPain([9, 1, 2, 3, 4, 5, 6, 7]);
    expect(useProgressStore.getState().weeklyPain).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('setRegionActivity replaces the map', () => {
    useProgressStore.getState().setRegionActivity({ neck: 42 });
    expect(useProgressStore.getState().regionActivity).toEqual({ neck: 42 });
  });

  it('setStreak stores the value', () => {
    useProgressStore.getState().setStreak(6);
    expect(useProgressStore.getState().streak).toBe(6);
  });
});
