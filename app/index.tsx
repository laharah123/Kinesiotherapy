import { Redirect } from 'expo-router';

import { useAuthStore } from '@/lib/store/auth';

/** Initial route: send the user to the app or to sign-in. */
export default function Index() {
  const user = useAuthStore((s) => s.user);

  return <Redirect href={user ? '/(main)' : '/(auth)/login'} />;
}
