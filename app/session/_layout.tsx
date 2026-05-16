import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/lib/store/auth';
import { COLORS } from '@/lib/tokens';

export default function SessionLayout() {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) router.replace('/(auth)/login');
  }, [user]);

  return (
    <>
      {/* Force light text on the dark session background */}
      <StatusBar style="light"/>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.sessionBg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="[sessionId]"/>
        <Stack.Screen name="rest"/>
        <Stack.Screen name="pain-feedback"/>
        <Stack.Screen name="complete"/>
      </Stack>
    </>
  );
}
