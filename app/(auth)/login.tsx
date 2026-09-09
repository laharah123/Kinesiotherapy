import { useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';

import { signInWithEmail, signInWithOAuth, sendPasswordReset } from '@/lib/supabase';
import { authErrorMessage } from '@/lib/auth/errors';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { COLORS, FONTS, RADII, fontFor } from '@/lib/tokens';

export default function LoginScreen() {
  const router      = useRouter();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function handleSignIn() {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError(null); setResetSent(false);
    try {
      await signInWithEmail(email.trim(), password);
      // Auth listener in the root layout handles navigation
    } catch (e: unknown) {
      setError(authErrorMessage(e, 'Sign in failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setError(null); setResetSent(false);
    try {
      await signInWithOAuth(provider);
    } catch (e: unknown) {
      setError(authErrorMessage(e, 'Sign in failed. Please try again.'));
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) { setError('Enter your email address first.'); return; }
    setError(null);
    try {
      await sendPasswordReset(email.trim());
      setResetSent(true);
    } catch (e: unknown) {
      setError(authErrorMessage(e, 'Could not send the reset email.'));
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.wordmark}>Kinesiotherapy</Text>
        <Text style={styles.headline}>Welcome back.</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}
        {resetSent && (
          <Text style={styles.noticeText}>
            Password reset sent. Check your email for a link to choose a new password.
          </Text>
        )}

        <View style={styles.fields}>
          <View style={styles.fieldRow}>
            <Icon name="mail" size={18} color={COLORS.ink3}/>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.ink4}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              autoComplete="email"
              returnKeyType="next"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={() => passwordRef.current?.focus()}
              submitBehavior="submit"
            />
          </View>

          <View style={styles.fieldRow}>
            <Icon name="lock" size={18} color={COLORS.ink3}/>
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.ink4}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              autoComplete="current-password"
              returnKeyType="go"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleSignIn}
            />
            <TouchableOpacity
              onPress={() => setShowPw((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={showPw ? 'Hide password' : 'Show password'}
            >
              <Icon name="eye" size={18} color={COLORS.ink3}/>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.forgotRow} onPress={handleForgotPassword}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <Button label="Sign in" onPress={handleSignIn} full loading={loading}/>

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
          onPress={() => handleOAuth('google')}
        />
        {Platform.OS === 'ios' && (
          <>
            <View style={styles.gap}/>
            <Button
              label="Continue with Apple"
              variant="ghost"
              icon="apple"
              full
              onPress={() => handleOAuth('apple')}
            />
          </>
        )}

        <TouchableOpacity style={styles.switchRow} onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.switchText}>
            Don't have an account? <Text style={styles.switchLink}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.bg },
  container: {
    flexGrow: 1, padding: 28, paddingTop: 72, justifyContent: 'center',
  },
  wordmark: {
    fontFamily: FONTS.serif, fontSize: 22, color: COLORS.clay,
    marginBottom: 8,
  },
  headline: {
    fontFamily: FONTS.serif, fontSize: 34, color: COLORS.ink,
    marginBottom: 32,
  },
  errorText: {
    fontFamily: FONTS.sans, fontSize: 13, color: COLORS.clay,
    marginBottom: 12,
    backgroundColor: COLORS.claySoft,
    padding: 10, borderRadius: RADII.r1,
  },
  noticeText: {
    fontFamily: FONTS.sans, fontSize: 13, color: COLORS.sageDeep,
    marginBottom: 12,
    backgroundColor: COLORS.sageSoft,
    padding: 10, borderRadius: RADII.r1, lineHeight: 19,
  },
  fields: { gap: 12, marginBottom: 12 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r2, paddingHorizontal: 14, paddingVertical: 12,
  },
  input: {
    flex: 1, fontFamily: FONTS.sans, fontSize: 15, color: COLORS.ink,
    backgroundColor: 'transparent',
  },
  forgotRow: { alignSelf: 'flex-end', marginBottom: 18, paddingVertical: 4 },
  forgotText: { fontFamily: fontFor('600'), fontSize: 13, color: COLORS.clay },
  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginVertical: 20,
  },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.borderSoft },
  dividerText: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3 },
  gap: { height: 10 },
  switchRow: { alignItems: 'center', marginTop: 28 },
  switchText: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3 },
  switchLink: { fontFamily: fontFor('600'), color: COLORS.clay },
});
