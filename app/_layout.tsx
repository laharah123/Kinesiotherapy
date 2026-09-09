import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppState, StyleSheet, type AppStateStatus } from 'react-native';

import { supabase, fetchProfile, fetchSubscription } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store/auth';
import { loadOnboardingFlag, markAuthReady, useAuthBootstrap } from '@/lib/auth/bootstrap';
import {
  initRevenueCat,
  identifyRevenueCatUser,
  resetRevenueCatUser,
} from '@/lib/revenuecat';
import { COLORS } from '@/lib/tokens';

SplashScreen.preventAutoHideAsync();

/** Profile rows are created by a database trigger, so the first read can race it. */
const PROFILE_RETRIES = [0, 400, 1200];

export default function RootLayout() {
  const { ready } = useAuthBootstrap();

  const [fontsLoaded, fontError] = useFonts({
    InstrumentSerif: InstrumentSerif_400Regular,
    'InstrumentSerif-Italic': InstrumentSerif_400Regular_Italic,
    Inter: Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const fontsReady = fontsLoaded || !!fontError;

  // Hide the splash only once fonts AND the first auth event have arrived
  useEffect(() => {
    if (fontsReady && ready) SplashScreen.hideAsync().catch(() => { /* already hidden */ });
  }, [fontsReady, ready]);

  // Hydrate the persisted onboarding flag
  useEffect(() => {
    loadOnboardingFlag();
  }, []);

  // Bootstrap auth state and listen for changes
  useEffect(() => {
    initRevenueCat();

    const { setUser, setProfile, setSubscription } = useAuthStore.getState();
    let cancelled = false;

    async function loadProfile(userId: string) {
      for (const delay of PROFILE_RETRIES) {
        if (delay > 0) await new Promise((r) => setTimeout(r, delay));
        if (cancelled) return;
        try {
          const profile = await fetchProfile(userId);
          if (cancelled) return;
          setProfile({
            id: profile.id,
            displayName: profile.display_name ?? '',
            createdAt: profile.created_at,
            streakDays: profile.streak_days,
            lastSession: profile.last_session,
          });
          return;
        } catch {
          // Trigger may not have run yet; fall through to the next attempt.
        }
      }
    }

    async function loadSubscription(userId: string) {
      try {
        const sub = await fetchSubscription(userId);
        if (cancelled) return;
        setSubscription(
          sub
            ? {
                id: sub.id,
                planType: sub.plan_type,
                status: sub.status as 'trialing' | 'active' | 'cancelled' | 'none',
                trialEndsAt: sub.trial_ends_at,
                currentPeriodEnds: sub.current_period_ends,
              }
            : null,
        );
      } catch {
        // Leave the existing subscription state alone on a transient failure.
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          event !== 'INITIAL_SESSION' &&
          event !== 'SIGNED_IN' &&
          event !== 'TOKEN_REFRESHED' &&
          event !== 'SIGNED_OUT' &&
          event !== 'USER_UPDATED'
        ) {
          return;
        }

        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email ?? '' });
          identifyRevenueCatUser(session.user.id);
          // Routing can proceed as soon as the user is known.
          markAuthReady();
          loadProfile(session.user.id);
          loadSubscription(session.user.id);
        } else {
          useAuthStore.getState().signOut();
          resetRevenueCatUser();
          markAuthReady();
        }
      },
    );

    // Safety net: never leave the app stuck on the splash if the first auth
    // event never arrives (for example when storage is unavailable).
    const fallback = setTimeout(markAuthReady, 5000);

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, []);

  // Supabase auto refresh should only run while the app is in the foreground
  useEffect(() => {
    function handleAppState(state: AppStateStatus) {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    }

    handleAppState(AppState.currentState);
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, []);

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark"/>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bg } }}>
        <Stack.Screen name="(auth)"         options={{ animation: 'none' }}/>
        <Stack.Screen name="(intake)"       options={{ animation: 'slide_from_right' }}/>
        <Stack.Screen name="(main)"         options={{ animation: 'none' }}/>
        <Stack.Screen name="session"        options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}/>
        <Stack.Screen name="subscription"   options={{ animation: 'slide_from_bottom', presentation: 'modal' }}/>
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
