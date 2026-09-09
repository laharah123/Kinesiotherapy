import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
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
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: COLORS.bg } }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Today' }}/>
      <Tabs.Screen name="plan"     options={{ title: 'Plan' }}/>
      <Tabs.Screen name="progress" options={{ title: 'Progress' }}/>
      <Tabs.Screen name="profile"  options={{ title: 'You' }}/>
    </Tabs>
  );
}
