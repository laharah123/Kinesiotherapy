import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/store/auth';

export default function AuthLayout() {
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);

  // Redirect to main tabs if already signed in
  useEffect(() => {
    if (user) router.replace('/(main)');
  }, [user]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login"/>
      <Stack.Screen name="signup"/>
      <Stack.Screen name="onboarding"/>
    </Stack>
  );
}
