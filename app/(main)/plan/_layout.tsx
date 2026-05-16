import { Stack } from 'expo-router';
import { COLORS } from '@/lib/tokens';

export default function PlanLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index"/>
      <Stack.Screen name="[exerciseId]"/>
    </Stack>
  );
}
