import { useAuthStore, selectTrial } from '@/lib/store/auth';
import type { Subscription, Profile } from '@/lib/store/auth';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetStore() {
  useAuthStore.getState().signOut();
  // Reset trialDaysLeft to the PRICING default (7) since signOut sets it to 0
  useAuthStore.setState({ trialDaysLeft: 7 });
}

function futureDate(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 86_400_000).toISOString();
}

function pastDate(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

function sub(patch: Partial<Subscription> = {}): Subscription {
  return {
    id: 'sub_1',
    planType: null,
    status: 'trialing',
    trialEndsAt: null,
    currentPeriodEnds: null,
    ...patch,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(resetStore);

describe('selectTrial: pure derivation', () => {
  const NOW = Date.parse('2026-03-10T12:00:00.000Z');
  const at = (iso: string) => new Date(iso).toISOString();

  it('returns no access for a null subscription', () => {
    expect(selectTrial(null, NOW)).toEqual({
      isTrialing: false,
      trialDaysLeft: 0,
      hasFullAccess: false,
    });
  });

  it('recomputes on read: the same row goes from trialing to expired as time passes', () => {
    const row = sub({ status: 'trialing', trialEndsAt: at('2026-03-12T12:00:00.000Z') });

    expect(selectTrial(row, NOW)).toEqual({
      isTrialing: true,
      trialDaysLeft: 2,
      hasFullAccess: true,
    });

    // Three days later, same row.
    expect(selectTrial(row, NOW + 3 * 86_400_000)).toEqual({
      isTrialing: false,
      trialDaysLeft: 0,
      hasFullAccess: false,
    });
  });

  it('trialing with no trialEndsAt gives no access', () => {
    expect(selectTrial(sub({ status: 'trialing', trialEndsAt: null }), NOW).hasFullAccess).toBe(false);
  });

  it('active keeps full access regardless of the trial fields', () => {
    const row = sub({ status: 'active', planType: 'yearly', trialEndsAt: at('2020-01-01T00:00:00.000Z') });
    expect(selectTrial(row, NOW)).toEqual({
      isTrialing: false,
      trialDaysLeft: 0,
      hasFullAccess: true,
    });
  });

  it('cancelled keeps access until currentPeriodEnds, then drops it', () => {
    const row = sub({
      status: 'cancelled',
      planType: 'monthly',
      currentPeriodEnds: at('2026-03-20T12:00:00.000Z'),
    });

    expect(selectTrial(row, NOW).hasFullAccess).toBe(true);
    expect(selectTrial(row, NOW + 11 * 86_400_000).hasFullAccess).toBe(false);
  });

  it('cancelled with no period end gives no access', () => {
    expect(selectTrial(sub({ status: 'cancelled' }), NOW).hasFullAccess).toBe(false);
  });

  it('none gives no access', () => {
    expect(selectTrial(sub({ status: 'none' }), NOW).hasFullAccess).toBe(false);
  });
});

describe('useAuthStore: setSubscription', () => {
  it('active status: hasFullAccess=true, isTrialing=false, trialDaysLeft=0', () => {
    const row = sub({
      id: 'sub_1',
      planType: 'monthly',
      status: 'active',
      currentPeriodEnds: futureDate(30),
    });

    useAuthStore.getState().setSubscription(row);
    const state = useAuthStore.getState();

    expect(state.hasFullAccess).toBe(true);
    expect(state.isTrialing).toBe(false);
    expect(state.trialDaysLeft).toBe(0);
    expect(state.subscription).toEqual(row);
  });

  it('trialing with days left: isTrialing=true, hasFullAccess=true', () => {
    useAuthStore.getState().setSubscription(sub({ id: 'sub_2', trialEndsAt: futureDate(5) }));
    const state = useAuthStore.getState();

    expect(state.isTrialing).toBe(true);
    expect(state.hasFullAccess).toBe(true);
    expect(state.trialDaysLeft).toBeGreaterThan(0);
    expect(state.trialDaysLeft).toBeLessThanOrEqual(5);
  });

  it('trialDaysLeft = ceil(ms remaining / 86400000)', () => {
    // 3 days and 1 hour from now, so ceil gives 4
    const threeAndABitDays = Date.now() + 3 * 86_400_000 + 3_600_000;
    useAuthStore.getState().setSubscription(
      sub({ id: 'sub_3', trialEndsAt: new Date(threeAndABitDays).toISOString() }),
    );
    expect(useAuthStore.getState().trialDaysLeft).toBe(4);
  });

  it('expired trial: isTrialing=false, trialDaysLeft=0, hasFullAccess=false', () => {
    useAuthStore.getState().setSubscription(sub({ id: 'sub_4', trialEndsAt: pastDate(2) }));
    const state = useAuthStore.getState();

    expect(state.isTrialing).toBe(false);
    expect(state.trialDaysLeft).toBe(0);
    expect(state.hasFullAccess).toBe(false);
  });

  it('cancelled with period remaining stays full access until currentPeriodEnds', () => {
    useAuthStore.getState().setSubscription(
      sub({ id: 'sub_5', planType: 'yearly', status: 'cancelled', currentPeriodEnds: futureDate(12) }),
    );
    const state = useAuthStore.getState();

    expect(state.hasFullAccess).toBe(true);
    expect(state.isTrialing).toBe(false);
    expect(state.trialDaysLeft).toBe(0);
  });

  it('cancelled with the period already over has no access', () => {
    useAuthStore.getState().setSubscription(
      sub({ id: 'sub_6', planType: 'yearly', status: 'cancelled', currentPeriodEnds: pastDate(1) }),
    );
    const state = useAuthStore.getState();

    expect(state.hasFullAccess).toBe(false);
    expect(state.isTrialing).toBe(false);
  });

  it('setSubscription(null) clears access', () => {
    useAuthStore.getState().setSubscription(
      sub({ id: 'x', planType: 'monthly', status: 'active', currentPeriodEnds: futureDate(10) }),
    );
    expect(useAuthStore.getState().hasFullAccess).toBe(true);

    useAuthStore.getState().setSubscription(null);
    const state = useAuthStore.getState();

    expect(state.subscription).toBeNull();
    expect(state.isTrialing).toBe(false);
    expect(state.trialDaysLeft).toBe(0);
    expect(state.hasFullAccess).toBe(false);
  });
});

describe('useAuthStore: refreshDerived', () => {
  it('re-derives the stored row against the current clock', () => {
    // A trial with one hour left is still access-granting when it is stored.
    useAuthStore.getState().setSubscription(
      sub({ id: 'sub_7', trialEndsAt: new Date(Date.now() + 3_600_000).toISOString() }),
    );
    expect(useAuthStore.getState().hasFullAccess).toBe(true);

    // Two hours later (the app was in the background), the same row has lapsed.
    const realNow = Date.now;
    Date.now = () => realNow() + 2 * 3_600_000;
    try {
      useAuthStore.getState().refreshDerived();
    } finally {
      Date.now = realNow;
    }

    const state = useAuthStore.getState();
    expect(state.hasFullAccess).toBe(false);
    expect(state.isTrialing).toBe(false);
    expect(state.trialDaysLeft).toBe(0);
    // The raw row is kept untouched.
    expect(state.subscription?.id).toBe('sub_7');
  });

  it('bumps derivedAt so subscribers recompute', () => {
    const before = useAuthStore.getState().derivedAt;
    const realNow = Date.now;
    Date.now = () => realNow() + 1_000;
    try {
      useAuthStore.getState().refreshDerived();
    } finally {
      Date.now = realNow;
    }
    expect(useAuthStore.getState().derivedAt).toBeGreaterThan(before);
  });
});

describe('useAuthStore: signOut', () => {
  it('clears user, profile, subscription, and access flags', () => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'test@example.com' },
      profile: {
        id: 'u1',
        displayName: 'Alice',
        createdAt: new Date().toISOString(),
        streakDays: 5,
        lastSession: null,
      },
      subscription: sub({ planType: 'monthly', status: 'active', currentPeriodEnds: futureDate(20) }),
      hasFullAccess: true,
      isTrialing: false,
      trialDaysLeft: 0,
    });

    useAuthStore.getState().signOut();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.subscription).toBeNull();
    expect(state.hasFullAccess).toBe(false);
    expect(state.isTrialing).toBe(false);
    expect(state.trialDaysLeft).toBe(0);
  });
});

describe('useAuthStore: updateProfile', () => {
  const baseProfile: Profile = {
    id: 'u1',
    displayName: 'Alice',
    createdAt: '2024-01-01T00:00:00.000Z',
    streakDays: 3,
    lastSession: null,
  };

  it('merges patch into existing profile', () => {
    useAuthStore.setState({ profile: baseProfile });

    useAuthStore.getState().updateProfile({ displayName: 'Bob', streakDays: 10 });

    const { profile } = useAuthStore.getState();
    expect(profile).not.toBeNull();
    expect(profile!.displayName).toBe('Bob');
    expect(profile!.streakDays).toBe(10);
    // Untouched fields remain
    expect(profile!.id).toBe('u1');
    expect(profile!.createdAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('does nothing when profile is null', () => {
    useAuthStore.setState({ profile: null });
    useAuthStore.getState().updateProfile({ displayName: 'Bob' });
    expect(useAuthStore.getState().profile).toBeNull();
  });
});

describe('useAuthStore: setUser / setProfile', () => {
  it('setUser stores the user object', () => {
    useAuthStore.getState().setUser({ id: 'u1', email: 'a@b.com' });
    expect(useAuthStore.getState().user).toEqual({ id: 'u1', email: 'a@b.com' });
  });

  it('setProfile stores the profile object', () => {
    const profile: Profile = {
      id: 'u1',
      displayName: 'Alice',
      createdAt: new Date().toISOString(),
      streakDays: 0,
      lastSession: null,
    };
    useAuthStore.getState().setProfile(profile);
    expect(useAuthStore.getState().profile).toEqual(profile);
  });
});
