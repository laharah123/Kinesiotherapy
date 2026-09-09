import AsyncStorage from '@react-native-async-storage/async-storage';

/** Storage key for the "user has seen onboarding" flag. */
export const ONBOARDING_STORAGE_KEY = 'kinesiotherapy.onboardingComplete';

/**
 * Whether the user finished (or skipped) the onboarding carousel.
 * Returns false when storage is unavailable, so onboarding is shown again
 * rather than silently skipped.
 */
export async function getOnboardingComplete(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)) === 'true';
  } catch {
    return false;
  }
}

/** Persists the onboarding flag. Never throws. */
export async function setOnboardingComplete(value = true): Promise<void> {
  try {
    if (value) await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    else       await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    // Storage is best effort; routing falls back to showing onboarding.
  }
}
