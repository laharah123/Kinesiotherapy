import { useMemo } from 'react';
import { useAuthStore, selectTrial, type Subscription } from '@/lib/store/auth';

/** Route to send the user to when they need to subscribe. */
export const PAYWALL_ROUTE = '/subscription/trial-end' as const;

/**
 * What the current user is allowed to do.
 *
 *  - 'full'     paying subscriber (or cancelled but still inside the paid period)
 *  - 'trial'    inside the free trial, days left
 *  - 'limited'  trial over / no subscription: can view Today, Plan and past
 *               progress, but cannot start a new guided session
 *  - 'unknown'  the subscription row has not loaded yet (first launch, offline).
 *               Treated as allowed so an offline user is never locked out; the
 *               (main) layout re-checks as soon as the row arrives.
 */
export type AccessState = 'full' | 'trial' | 'limited' | 'unknown';

export interface Access {
  state: AccessState;
  /** True unless the state is 'limited'. */
  canStartSession: boolean;
  isTrialing: boolean;
  trialDaysLeft: number;
  hasFullAccess: boolean;
  /** Id of the subscription row the state was derived from, when there is one. */
  subscriptionId: string | null;
}

/** Pure selector: the access state for a subscription row at a point in time. */
export function selectAccess(sub: Subscription | null, now: number = Date.now()): AccessState {
  if (!sub) return 'unknown';
  const { isTrialing, hasFullAccess } = selectTrial(sub, now);
  if (isTrialing) return 'trial';
  if (hasFullAccess) return 'full';
  return 'limited';
}

function buildAccess(sub: Subscription | null, now: number): Access {
  const state = selectAccess(sub, now);
  const { isTrialing, trialDaysLeft, hasFullAccess } = selectTrial(sub, now);
  return {
    state,
    canStartSession: state !== 'limited',
    isTrialing,
    trialDaysLeft,
    hasFullAccess,
    subscriptionId: sub?.id ?? null,
  };
}

/** Non-reactive read, for event handlers and route guards. */
export function getAccess(now: number = Date.now()): Access {
  return buildAccess(useAuthStore.getState().subscription, now);
}

/** Non-reactive read of just the access state. */
export function getAccessState(now: number = Date.now()): AccessState {
  return getAccess(now).state;
}

/**
 * Whether the current user may start a guided session.
 * 'unknown' (subscription not loaded) counts as allowed.
 */
export function canStartSession(): boolean {
  return getAccess().canStartSession;
}

/** Reactive version of `getAccess`, for components. */
export function useAccess(): Access {
  const subscription = useAuthStore((s) => s.subscription);
  // Changes whenever the store re-derives (set, or app foreground), so the
  // memo below recomputes against the current clock rather than staying stale.
  const derivedAt = useAuthStore((s) => s.derivedAt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => buildAccess(subscription, Date.now()), [subscription, derivedAt]);
}

/** Reactive read of just the access state. */
export function useAccessState(): AccessState {
  return useAccess().state;
}
