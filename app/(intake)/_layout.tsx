import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/store/auth';

export default function IntakeLayout() {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) router.replace('/(auth)/login');
  }, [user]);

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="body-map"/>
      <Stack.Screen name="condition"/>
      <Stack.Screen name="questionnaire"/>
    </Stack>
  );
}
