import {
  PAYWALL_ROUTE, canStartSession, getAccess, getAccessState, selectAccess,
} from '@/lib/access';
import { useAuthStore } from '@/lib/store/auth';
import type { Subscription } from '@/lib/store/auth';

const NOW = Date.parse('2026-03-10T12:00:00.000Z');
const iso = (offsetDays: number) => new Date(NOW + offsetDays * 86_400_000).toISOString();

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

function setSubscription(value: Subscription | null) {
  useAuthStore.getState().setSubscription(value);
}

beforeEach(() => {
  useAuthStore.getState().signOut();
});

describe('selectAccess', () => {
  it('is unknown when no row has loaded', () => {
    expect(selectAccess(null, NOW)).toBe('unknown');
  });

  it('is trial while trial days remain', () => {
    expect(selectAccess(sub({ trialEndsAt: iso(3) }), NOW)).toBe('trial');
  });

  it('is limited once the trial has run out', () => {
    expect(selectAccess(sub({ trialEndsAt: iso(-1) }), NOW)).toBe('limited');
  });

  it('is full for an active subscription', () => {
    expect(selectAccess(sub({ status: 'active', planType: 'yearly' }), NOW)).toBe('full');
  });

  it('is full for a cancelled subscription with period left, limited after', () => {
    const row = sub({ status: 'cancelled', planType: 'monthly', currentPeriodEnds: iso(5) });
    expect(selectAccess(row, NOW)).toBe('full');
    expect(selectAccess(row, NOW + 6 * 86_400_000)).toBe('limited');
  });

  it('is limited for status none', () => {
    expect(selectAccess(sub({ status: 'none' }), NOW)).toBe('limited');
  });

  it('recomputes on read as the trial lapses', () => {
    const row = sub({ trialEndsAt: iso(1) });
    expect(selectAccess(row, NOW)).toBe('trial');
    expect(selectAccess(row, NOW + 2 * 86_400_000)).toBe('limited');
  });
});

describe('getAccessState / getAccess', () => {
  it('reports unknown before the subscription loads', () => {
    expect(getAccessState()).toBe('unknown');
    expect(getAccess().subscriptionId).toBeNull();
  });

  it('reports trial and exposes the derived trial fields', () => {
    setSubscription(sub({ id: 's_trial', trialEndsAt: new Date(Date.now() + 3 * 86_400_000).toISOString() }));

    const access = getAccess();
    expect(access.state).toBe('trial');
    expect(access.isTrialing).toBe(true);
    expect(access.trialDaysLeft).toBe(3);
    expect(access.hasFullAccess).toBe(true);
    expect(access.subscriptionId).toBe('s_trial');
  });

  it('reports full for an active subscription', () => {
    setSubscription(sub({ status: 'active', planType: 'monthly' }));
    expect(getAccessState()).toBe('full');
    expect(getAccess().hasFullAccess).toBe(true);
  });

  it('reports limited after the trial with no subscription', () => {
    setSubscription(sub({ trialEndsAt: new Date(Date.now() - 86_400_000).toISOString() }));
    expect(getAccessState()).toBe('limited');
    expect(getAccess().hasFullAccess).toBe(false);
  });
});

describe('canStartSession', () => {
  it('allows an unknown (not yet loaded) subscription so offline users are not locked out', () => {
    expect(useAuthStore.getState().subscription).toBeNull();
    expect(canStartSession()).toBe(true);
  });

  it('allows a trialing user', () => {
    setSubscription(sub({ trialEndsAt: new Date(Date.now() + 86_400_000).toISOString() }));
    expect(canStartSession()).toBe(true);
  });

  it('allows an active subscriber', () => {
    setSubscription(sub({ status: 'active', planType: 'yearly' }));
    expect(canStartSession()).toBe(true);
  });

  it('allows a cancelled subscriber until the paid period ends', () => {
    setSubscription(sub({
      status: 'cancelled',
      planType: 'yearly',
      currentPeriodEnds: new Date(Date.now() + 4 * 86_400_000).toISOString(),
    }));
    expect(canStartSession()).toBe(true);
  });

  it('blocks a limited user once the trial has expired', () => {
    setSubscription(sub({ trialEndsAt: new Date(Date.now() - 2 * 86_400_000).toISOString() }));
    expect(canStartSession()).toBe(false);
  });

  it('blocks a lapsed subscription (status none)', () => {
    setSubscription(sub({ status: 'none', planType: 'monthly', currentPeriodEnds: new Date(Date.now() - 86_400_000).toISOString() }));
    expect(canStartSession()).toBe(false);
  });

  it('re-checks after the subscription row arrives', () => {
    // Offline first launch: allowed.
    expect(canStartSession()).toBe(true);
    // The row lands and says the trial is over.
    setSubscription(sub({ trialEndsAt: new Date(Date.now() - 86_400_000).toISOString() }));
    expect(canStartSession()).toBe(false);
  });
});

describe('PAYWALL_ROUTE', () => {
  it('points at a screen inside app/subscription', () => {
    expect(PAYWALL_ROUTE).toBe('/subscription/trial-end');
  });
});
