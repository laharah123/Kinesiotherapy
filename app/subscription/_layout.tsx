import { Stack } from 'expo-router';
import { COLORS } from '@/lib/tokens';

export default function SubscriptionLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg },
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="trial-end"/>
      <Stack.Screen name="plans"/>
      <Stack.Screen name="subscribed"/>
    </Stack>
  );
}
