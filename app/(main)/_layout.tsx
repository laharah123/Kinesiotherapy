import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore } from '@/lib/store/auth';
import { useAccess, PAYWALL_ROUTE } from '@/lib/access';
import { TabBar } from '@/components/ui/TabBar';
import { COLORS } from '@/lib/tokens';

/** One key per subscription row, so a new trial can present the paywall again. */
const seenKey = (subscriptionId: string) => `paywallShownFor:${subscriptionId}`;

export default function MainLayout() {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const refreshDerived = useAuthStore((s) => s.refreshDerived);
  const access = useAccess();

  useEffect(() => {
    if (!user) router.replace('/(auth)/login');
  }, [user]);

  // Trial state is time based, so re-derive on mount and whenever the app comes
  // back to the foreground (a trial can lapse while the app is backgrounded).
  useEffect(() => {
    refreshDerived();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refreshDerived();
    });
    return () => sub.remove();
  }, [refreshDerived]);

  // Present the paywall once, the first time we see the trial has run out.
  // While trial days remain the Home badge does the reminding; no modal.
  useEffect(() => {
    if (!user) return;
    if (access.state !== 'limited') return;

    const subscriptionId = access.subscriptionId;
    if (!subscriptionId) return;

    let cancelled = false;
    (async () => {
      try {
        const alreadyShown = await AsyncStorage.getItem(seenKey(subscriptionId));
        if (alreadyShown || cancelled) return;
        await AsyncStorage.setItem(seenKey(subscriptionId), new Date().toISOString());
        if (!cancelled) router.push(PAYWALL_ROUTE);
      } catch {
        // Storage unavailable: skip the one-time paywall rather than showing it
        // on every launch.
      }
    })();

    return () => { cancelled = true; };
  }, [user, access.state, access.subscriptionId]);

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props}/>}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: COLORS.bg } }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Today' }}/>
      <Tabs.Screen name="plan"     options={{ title: 'Plan' }}/>
      <Tabs.Screen name="progress" options={{ title: 'Progress' }}/>
      <Tabs.Screen name="profile"  options={{ title: 'You' }}/>
    </Tabs>
  );
}
