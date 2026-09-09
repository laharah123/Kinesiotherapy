import { Redirect } from 'expo-router';
import { View, StyleSheet } from 'react-native';

import { useAuthBootstrap, useOnboardingComplete } from '@/lib/auth/bootstrap';
import { useAuthStore } from '@/lib/store/auth';
import { useIntakeStore } from '@/lib/store/intake';
import { COLORS } from '@/lib/tokens';

/**
 * Initial route. Deterministic order:
 *   1. Still bootstrapping        -> blank screen on the app background
 *   2. No user, onboarding unseen -> onboarding (very first launch)
 *   3. No user                    -> login
 *   4. User, onboarding unseen    -> onboarding
 *   5. User, no plan yet          -> intake
 *   6. Otherwise                  -> main tabs
 */
export default function Index() {
  const { ready }          = useAuthBootstrap();
  const onboardingComplete = useOnboardingComplete();
  const user               = useAuthStore((s) => s.user);

  if (!ready) return <View style={styles.splash}/>;

  if (!user) {
    return <Redirect href={onboardingComplete ? '/(auth)/login' : '/(auth)/onboarding'}/>;
  }

  if (!onboardingComplete) return <Redirect href="/(auth)/onboarding"/>;

  // Read-only peek at the intake store; subscribing here would re-run routing.
  if (useIntakeStore.getState().generatedPlan == null) {
    return <Redirect href="/(intake)/body-map"/>;
  }

  return <Redirect href="/(main)"/>;
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: COLORS.bg },
});
