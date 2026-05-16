import { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signUpWithEmail, signInWithOAuth } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { COLORS, FONTS, RADII } from '@/lib/tokens';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSignUp() {
    if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError(null);
    try {
      await signUpWithEmail(email.trim(), password, name.trim());
      router.replace('/(auth)/onboarding');
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.wordmark}>Kinesiotherapy</Text>
        <Text style={styles.headline}>Let's get started.</Text>
        <Text style={styles.sub}>7 days free, then $12.99/month.</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.fields}>
          <View style={styles.fieldRow}>
            <Icon name="profile" size={18} color={COLORS.ink3}/>
            <TextInput
              style={[styles.input, styles.flex]}
              placeholder="Your name"
              placeholderTextColor={COLORS.ink4}
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.fieldRow}>
            <Icon name="mail" size={18} color={COLORS.ink3}/>
            <TextInput
              style={[styles.input, styles.flex]}
              placeholder="Email"
              placeholderTextColor={COLORS.ink4}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.fieldRow}>
            <Icon name="lock" size={18} color={COLORS.ink3}/>
            <TextInput
              style={[styles.input, styles.flex]}
              placeholder="Password (8+ characters)"
              placeholderTextColor={COLORS.ink4}
              secureTextEntry={!showPw}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPw((v) => !v)}>
              <Icon name="eye" size={18} color={COLORS.ink3}/>
            </TouchableOpacity>
          </View>
        </View>

        <Button label="Create account" onPress={handleSignUp} full loading={loading}/>

        <View style={styles.dividerRow}>
          <View style={styles.divider}/>
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider}/>
        </View>

        <Button
          label="Continue with Google"
          variant="ghost"
          icon="google"
          full
          onPress={() => signInWithOAuth('google')}
        />
        <View style={styles.gap}/>
        <Button
          label="Continue with Apple"
          variant="ghost"
          icon="apple"
          full
          onPress={() => signInWithOAuth('apple')}
        />

        <Text style={styles.legal}>
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </Text>

        <TouchableOpacity style={styles.switchRow} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.switchText}>
            Already have an account? <Text style={styles.switchLink}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.bg },
  container: { flexGrow: 1, padding: 28, paddingTop: 72, justifyContent: 'center' },
  wordmark: { fontFamily: FONTS.serif, fontSize: 22, color: COLORS.clay, marginBottom: 8 },
  headline: { fontFamily: FONTS.serif, fontSize: 34, color: COLORS.ink, marginBottom: 4 },
  sub: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink3, marginBottom: 28 },
  errorText: {
    fontFamily: FONTS.sans, fontSize: 13, color: COLORS.clay,
    marginBottom: 12, backgroundColor: COLORS.claySoft,
    padding: 10, borderRadius: RADII.r1,
  },
  fields: { gap: 12, marginBottom: 20 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r2, paddingHorizontal: 14, paddingVertical: 12,
  },
  input: { fontFamily: FONTS.sans, fontSize: 15, color: COLORS.ink },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.borderSoft },
  dividerText: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3 },
  gap: { height: 10 },
  legal: {
    fontFamily: FONTS.sans, fontSize: 11, color: COLORS.ink4,
    textAlign: 'center', marginTop: 20, lineHeight: 16,
  },
  switchRow: { alignItems: 'center', marginTop: 16 },
  switchText: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3 },
  switchLink: { color: COLORS.clay, fontWeight: '600' },
});
