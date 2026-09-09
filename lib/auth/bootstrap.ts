import { create } from 'zustand';

import { getOnboardingComplete, setOnboardingComplete } from '@/lib/auth/onboarding';

interface BootstrapState {
  /** True once the first Supabase auth event has been applied to the store. */
  authReady: boolean;
  /** True once the persisted onboarding flag has been read. */
  flagReady: boolean;
  onboardingComplete: boolean;
  setAuthReady: () => void;
  setFlag: (complete: boolean) => void;
}

const useBootstrapStore = create<BootstrapState>((set) => ({
  authReady: false,
  flagReady: false,
  onboardingComplete: false,
  setAuthReady: () => set({ authReady: true }),
  setFlag: (onboardingComplete) => set({ onboardingComplete, flagReady: true }),
}));

/**
 * Drives the initial route. `ready` flips to true once the first auth event has
 * arrived and the persisted onboarding flag has been read, so the router never
 * decides a destination from half-loaded state.
 */
export function useAuthBootstrap(): { ready: boolean } {
  const ready = useBootstrapStore((s) => s.authReady && s.flagReady);
  return { ready };
}

/** Reactive read of the persisted onboarding flag. */
export function useOnboardingComplete(): boolean {
  return useBootstrapStore((s) => s.onboardingComplete);
}

/** Called by the root layout when the first auth event has been applied. */
export function markAuthReady(): void {
  useBootstrapStore.getState().setAuthReady();
}

/** Called by the root layout on mount to hydrate the onboarding flag. */
export async function loadOnboardingFlag(): Promise<void> {
  const complete = await getOnboardingComplete();
  useBootstrapStore.getState().setFlag(complete);
}

/** Called when the user finishes or skips onboarding. */
export async function markOnboardingComplete(): Promise<void> {
  await setOnboardingComplete(true);
  useBootstrapStore.getState().setFlag(true);
}

/** Test helper: reset bootstrap state. */
export function resetAuthBootstrap(): void {
  useBootstrapStore.setState({ authReady: false, flagReady: false, onboardingComplete: false });
}
