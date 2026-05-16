import { useEffect } from 'react';
import { Stack, Tabs, useRouter, usePathname } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useAuthStore } from '@/lib/store/auth';
import { TabBar } from '@/components/ui/TabBar';
import { COLORS } from '@/lib/tokens';

export default function MainLayout() {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) router.replace('/(auth)/login');
  }, [user]);

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props}/>}
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bg } }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Today' }}/>
      <Tabs.Screen name="plan"     options={{ title: 'Plan' }}/>
      <Tabs.Screen name="progress" options={{ title: 'Progress' }}/>
      <Tabs.Screen name="profile"  options={{ title: 'You' }}/>
    </Tabs>
  );
}
