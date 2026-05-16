import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { COLORS, FONTS } from '@/lib/tokens';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <Text style={styles.code}>404</Text>
      <Text style={styles.message}>This screen doesn't exist.</Text>
      <Button label="Go home" onPress={() => router.replace('/(main)')} style={styles.btn}/>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: COLORS.bg,
    alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32,
  },
  code: { fontFamily: FONTS.serif, fontSize: 72, color: COLORS.ink4 },
  message: { fontFamily: FONTS.sans, fontSize: 16, color: COLORS.ink3 },
  btn: { marginTop: 8 },
});
