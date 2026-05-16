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

interface AuthStore {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  subscription: Subscription | null;

  // Derived
  isTrialing: boolean;
  trialDaysLeft: number;
  hasFullAccess: boolean;

  // Actions
  setUser: (user: { id: string; email: string } | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSubscription: (sub: Subscription | null) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  signOut: () => void;
}

function deriveTrialState(sub: Subscription | null): {
  isTrialing: boolean;
  trialDaysLeft: number;
  hasFullAccess: boolean;
} {
  if (!sub) return { isTrialing: false, trialDaysLeft: 0, hasFullAccess: false };

  if (sub.status === 'active') {
    return { isTrialing: false, trialDaysLeft: 0, hasFullAccess: true };
  }

  if (sub.status === 'trialing' && sub.trialEndsAt) {
    const msLeft = new Date(sub.trialEndsAt).getTime() - Date.now();
    const daysLeft = Math.max(0, Math.ceil(msLeft / 86_400_000));
    return {
      isTrialing: daysLeft > 0,
      trialDaysLeft: daysLeft,
      hasFullAccess: daysLeft > 0,
    };
  }

  return { isTrialing: false, trialDaysLeft: 0, hasFullAccess: false };
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  profile: null,
  subscription: null,
  isTrialing: false,
  trialDaysLeft: PRICING.trialDays,
  hasFullAccess: false,

  setUser: (user) => set({ user }),

  setProfile: (profile) => set({ profile }),

  setSubscription: (subscription) =>
    set({ subscription, ...deriveTrialState(subscription) }),

  updateProfile: (patch) =>
    set((s) => ({
      profile: s.profile ? { ...s.profile, ...patch } : null,
    })),

  signOut: () =>
    set({
      user: null,
      profile: null,
      subscription: null,
      isTrialing: false,
      trialDaysLeft: 0,
      hasFullAccess: false,
    }),
}));
