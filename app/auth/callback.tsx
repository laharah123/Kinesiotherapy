import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/lib/tokens';

/**
 * Landing route for OAuth redirects opened outside the in-app auth session
 * (for example when the browser hands the deep link straight to the app).
 * The root layout's auth listener applies the session; this screen just
 * returns the user to the router's entry point.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace('/'), 400);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <View style={styles.root}>
      <ActivityIndicator color={COLORS.clay}/>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
});
