import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { supabase } from '@/lib/supabase';
import { fetchProfile, fetchSubscription, createTrialSubscription } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store/auth';
import { initRevenueCat, identifyRevenueCatUser } from '@/lib/revenuecat';
import { COLORS } from '@/lib/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { setUser, setProfile, setSubscription, signOut } = useAuthStore();

  const [fontsLoaded, fontError] = useFonts({
    InstrumentSerif: require('@/assets/fonts/InstrumentSerif-Regular.ttf'),
    'InstrumentSerif-Italic': require('@/assets/fonts/InstrumentSerif-Italic.ttf'),
    Inter: require('@/assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('@/assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('@/assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('@/assets/fonts/Inter-Bold.ttf'),
  });

  // Hide splash once fonts are ready
  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Bootstrap auth state and listen for changes
  useEffect(() => {
    initRevenueCat();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email ?? '' });
          identifyRevenueCatUser(session.user.id);

          // Load profile
          try {
            const profile = await fetchProfile(session.user.id);
            setProfile({
              id: profile.id,
              displayName: profile.display_name ?? '',
              createdAt: profile.created_at,
              streakDays: profile.streak_days,
              lastSession: profile.last_session,
            });
          } catch {
            // Profile created by trigger; retry once
            await new Promise((r) => setTimeout(r, 500));
            try {
              const profile = await fetchProfile(session.user.id);
              setProfile({
                id: profile.id,
                displayName: profile.display_name ?? '',
                createdAt: profile.created_at,
                streakDays: profile.streak_days,
                lastSession: profile.last_session,
              });
            } catch { /* silent */ }
          }

          // Load or create subscription
          try {
            let sub = await fetchSubscription(session.user.id);
            if (!sub) sub = await createTrialSubscription(session.user.id);
            setSubscription({
              id: sub.id,
              planType: sub.plan_type,
              status: sub.status as 'trialing' | 'active' | 'cancelled' | 'none',
              trialEndsAt: sub.trial_ends_at,
              currentPeriodEnds: sub.current_period_ends,
            });
          } catch { /* silent */ }
        } else {
          signOut();
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  if (!fontsLoaded && !fontError) return null;

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
