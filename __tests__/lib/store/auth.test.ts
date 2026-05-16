import { useAuthStore } from '@/lib/store/auth';
import type { Subscription, Profile } from '@/lib/store/auth';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  user: null,
  profile: null,
  subscription: null,
  isTrialing: false,
  trialDaysLeft: 7, // PRICING.trialDays default
  hasFullAccess: false,
};

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

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(resetStore);

describe('useAuthStore — setSubscription', () => {
  it('active status → hasFullAccess=true, isTrialing=false, trialDaysLeft=0', () => {
    const sub: Subscription = {
      id: 'sub_1',
      planType: 'monthly',
      status: 'active',
      trialEndsAt: null,
      currentPeriodEnds: futureDate(30),
    };

    useAuthStore.getState().setSubscription(sub);
    const state = useAuthStore.getState();

    expect(state.hasFullAccess).toBe(true);
    expect(state.isTrialing).toBe(false);
    expect(state.trialDaysLeft).toBe(0);
    expect(state.subscription).toEqual(sub);
  });

  it('trialing + future trialEndsAt → isTrialing=true, hasFullAccess=true, trialDaysLeft > 0', () => {
    const sub: Subscription = {
      id: 'sub_2',
      planType: null,
      status: 'trialing',
      trialEndsAt: futureDate(5),
      currentPeriodEnds: null,
    };

    useAuthStore.getState().setSubscription(sub);
    const state = useAuthStore.getState();

    expect(state.isTrialing).toBe(true);
    expect(state.hasFullAccess).toBe(true);
    expect(state.trialDaysLeft).toBeGreaterThan(0);
    expect(state.trialDaysLeft).toBeLessThanOrEqual(5);
  });

  it('trialDaysLeft = ceil(ms remaining / 86400000) — approximately correct', () => {
    // 3 days and 1 hour from now → ceil gives 4
    const threeAndABitDays = Date.now() + 3 * 86_400_000 + 3_600_000;
    const sub: Subscription = {
      id: 'sub_3',
      planType: null,
      status: 'trialing',
      trialEndsAt: new Date(threeAndABitDays).toISOString(),
      currentPeriodEnds: null,
    };

    useAuthStore.getState().setSubscription(sub);
    expect(useAuthStore.getState().trialDaysLeft).toBe(4);
  });

  it('trialing + past trialEndsAt → isTrialing=false, trialDaysLeft=0, hasFullAccess=false', () => {
    const sub: Subscription = {
      id: 'sub_4',
      planType: null,
      status: 'trialing',
      trialEndsAt: pastDate(2),
      currentPeriodEnds: null,
    };

    useAuthStore.getState().setSubscription(sub);
    const state = useAuthStore.getState();

    expect(state.isTrialing).toBe(false);
    expect(state.trialDaysLeft).toBe(0);
    expect(state.hasFullAccess).toBe(false);
  });

  it('setSubscription(null) → defaults preserved (no access)', () => {
    // First set an active sub, then clear it
    useAuthStore.getState().setSubscription({
      id: 'x', planType: 'monthly', status: 'active',
      trialEndsAt: null, currentPeriodEnds: futureDate(10),
    });
    expect(useAuthStore.getState().hasFullAccess).toBe(true);

    useAuthStore.getState().setSubscription(null);
    const state = useAuthStore.getState();

    expect(state.subscription).toBeNull();
    expect(state.isTrialing).toBe(false);
    expect(state.trialDaysLeft).toBe(0);
    expect(state.hasFullAccess).toBe(false);
  });

  it('cancelled status → hasFullAccess=false, isTrialing=false', () => {
    const sub: Subscription = {
      id: 'sub_5',
      planType: 'yearly',
      status: 'cancelled',
      trialEndsAt: null,
      currentPeriodEnds: pastDate(1),
    };

    useAuthStore.getState().setSubscription(sub);
    const state = useAuthStore.getState();

    expect(state.hasFullAccess).toBe(false);
    expect(state.isTrialing).toBe(false);
  });
});

describe('useAuthStore — signOut', () => {
  it('clears user, profile, subscription, and access flags', () => {
    // Set up some state
    useAuthStore.setState({
      user: { id: 'u1', email: 'test@example.com' },
      profile: {
        id: 'u1',
        displayName: 'Alice',
        createdAt: new Date().toISOString(),
        streakDays: 5,
        lastSession: null,
      },
      subscription: {
        id: 'sub_1', planType: 'monthly', status: 'active',
        trialEndsAt: null, currentPeriodEnds: futureDate(20),
      },
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

describe('useAuthStore — updateProfile', () => {
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

describe('useAuthStore — setUser / setProfile', () => {
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
