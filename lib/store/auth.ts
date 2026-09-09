import { create } from 'zustand';
import { PRICING } from '@/lib/tokens';

export interface Profile {
  id: string;
  displayName: string;
  createdAt: string;
  streakDays: number;
  lastSession: string | null;
}

export interface Subscription {
  id: string;
  planType: 'monthly' | 'yearly' | null;
  status: 'trialing' | 'active' | 'cancelled' | 'none';
  trialEndsAt: string | null;
  currentPeriodEnds: string | null;
}

/** The values derived from a subscription row. Recomputed on every read. */
export interface DerivedAccess {
  isTrialing: boolean;
  trialDaysLeft: number;
  hasFullAccess: boolean;
}

interface AuthStore {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  subscription: Subscription | null;

  // Derived (recomputed by setSubscription and refreshDerived)
  isTrialing: boolean;
  trialDaysLeft: number;
  hasFullAccess: boolean;
  /** Timestamp of the last derivation. Lets hooks recompute when time moves on. */
  derivedAt: number;

  // Actions
  setUser: (user: { id: string; email: string } | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSubscription: (sub: Subscription | null) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  /** Re-derives trial/access flags from the stored row. Call on app foreground. */
  refreshDerived: () => void;
  signOut: () => void;
}

const DAY_MS = 86_400_000;

function msToDays(msLeft: number): number {
  return Math.max(0, Math.ceil(msLeft / DAY_MS));
}

function isFuture(iso: string | null, now: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t > now;
}

/**
 * Pure selector for trial / access state.
 *
 * Access rules:
 *  - `active`    full access. The store row is written by the RevenueCat webhook,
 *                so it stays authoritative even if the period end looks stale.
 *  - `trialing`  full access while `trialEndsAt` is in the future.
 *  - `cancelled` full access until `currentPeriodEnds` passes (the user paid for
 *                the rest of the period), then none.
 *  - `none`      no access.
 *  - no row      no access here. Callers that need "not loaded yet" semantics use
 *                `getAccessState()` in lib/access.ts, which reports 'unknown'.
 *
 * Takes `now` so callers can recompute on read instead of freezing the value at
 * the moment the row was stored.
 */
export function selectTrial(sub: Subscription | null, now: number = Date.now()): DerivedAccess {
  const none: DerivedAccess = { isTrialing: false, trialDaysLeft: 0, hasFullAccess: false };
  if (!sub) return none;

  switch (sub.status) {
    case 'active':
      return { isTrialing: false, trialDaysLeft: 0, hasFullAccess: true };

    case 'trialing': {
      if (!sub.trialEndsAt) return none;
      const daysLeft = msToDays(new Date(sub.trialEndsAt).getTime() - now);
      return {
        isTrialing: daysLeft > 0,
        trialDaysLeft: daysLeft,
        hasFullAccess: daysLeft > 0,
      };
    }

    case 'cancelled':
      // Cancelled but paid up: keep access until the period actually ends.
      return {
        isTrialing: false,
        trialDaysLeft: 0,
        hasFullAccess: isFuture(sub.currentPeriodEnds, now),
      };

    default:
      return none;
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  subscription: null,
  isTrialing: false,
  trialDaysLeft: PRICING.trialDays,
  hasFullAccess: false,
  derivedAt: Date.now(),

  setUser: (user) => set({ user }),

  setProfile: (profile) => set({ profile }),

  setSubscription: (subscription) =>
    set({ subscription, ...selectTrial(subscription), derivedAt: Date.now() }),

  updateProfile: (patch) =>
    set((s) => ({
      profile: s.profile ? { ...s.profile, ...patch } : null,
    })),

  refreshDerived: () =>
    set({ ...selectTrial(get().subscription), derivedAt: Date.now() }),

  signOut: () =>
    set({
      user: null,
      profile: null,
      subscription: null,
      isTrialing: false,
      trialDaysLeft: 0,
      hasFullAccess: false,
      derivedAt: Date.now(),
    }),
}));
