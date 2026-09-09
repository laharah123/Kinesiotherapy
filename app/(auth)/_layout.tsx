import { useEffect } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { useAuthStore } from '@/lib/store/auth';

// Lets a returning auth session browser hand its result back to the app.
WebBrowser.maybeCompleteAuthSession();

export default function AuthLayout() {
  const router   = useRouter();
  const pathname = usePathname();
  const user     = useAuthStore((s) => s.user);

  // Signed-in users have no business on login or signup. Onboarding is never
  // redirected away from: it runs before intake, signed in or not.
  useEffect(() => {
    if (!user) return;
    if (pathname.endsWith('/login') || pathname.endsWith('/signup')) {
      router.replace('/');
    }
  }, [user, pathname, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login"/>
      <Stack.Screen name="signup"/>
      <Stack.Screen name="onboarding"/>
    </Stack>
  );
}
