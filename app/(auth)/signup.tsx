import { useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { PRIVACY_URL, TERMS_URL } from '@/lib/plans/links';

import { signUpWithEmail, signInWithOAuth } from '@/lib/supabase';
import { authErrorMessage } from '@/lib/auth/errors';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { COLORS, FONTS, RADII, fontFor } from '@/lib/tokens';

export default function SignupScreen() {
  const router      = useRouter();
  const emailRef    = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  async function handleSignUp() {
    if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError(null);
    try {
      const data = await signUpWithEmail(email.trim(), password, name.trim());
      if (!data.session) {
        // Email confirmation is on: there is no session yet, so stay put and
        // tell the user what happens next. The root auth listener navigates
        // once they confirm and sign in.
        setConfirmEmail(email.trim());
      }
      // With confirmation off a session arrives and the root layout routes.
    } catch (e: unknown) {
      setError(authErrorMessage(e, 'Sign up failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setError(null);
    try {
      await signInWithOAuth(provider);
    } catch (e: unknown) {
      setError(authErrorMessage(e, 'Sign up failed. Please try again.'));
    }
  }

  if (confirmEmail) {
    return (
      <View style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.wordmark}>Kinesiotherapy</Text>
          <Text style={styles.headline}>Check your email.</Text>
          <Text style={styles.sub}>
            We sent a confirmation link to {confirmEmail}. Open it to confirm your account, then
            sign in to start your programme.
          </Text>

          <Button label="Go to sign in" full onPress={() => router.replace('/(auth)/login')}/>

          <TouchableOpacity style={styles.switchRow} onPress={() => setConfirmEmail(null)}>
            <Text style={styles.switchText}>
              Wrong email? <Text style={styles.switchLink}>Go back</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
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
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={COLORS.ink4}
              autoCapitalize="words"
              textContentType="name"
              autoComplete="name"
              returnKeyType="next"
              value={name}
              onChangeText={setName}
              onSubmitEditing={() => emailRef.current?.focus()}
              submitBehavior="submit"
            />
          </View>

          <View style={styles.fieldRow}>
            <Icon name="mail" size={18} color={COLORS.ink3}/>
            <TextInput
              ref={emailRef}
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
              placeholder="Password (8+ characters)"
              placeholderTextColor={COLORS.ink4}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              autoComplete="new-password"
              returnKeyType="go"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleSignUp}
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

        <Text style={styles.legal}>
          By creating an account you agree to our{' '}
          <Text style={styles.legalLink} onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}>Privacy Policy</Text>.
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
  sub: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink3, marginBottom: 28, lineHeight: 21 },
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
  input: {
    flex: 1, fontFamily: FONTS.sans, fontSize: 15, color: COLORS.ink,
    backgroundColor: 'transparent',
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.borderSoft },
  dividerText: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3 },
  gap: { height: 10 },
  legal: {
    fontFamily: FONTS.sans, fontSize: 11, color: COLORS.ink4,
    textAlign: 'center', marginTop: 20, lineHeight: 16,
  },
  legalLink: { color: COLORS.ink3, textDecorationLine: 'underline' },
  switchRow: { alignItems: 'center', marginTop: 16 },
  switchText: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3 },
  switchLink: { fontFamily: fontFor('600'), color: COLORS.clay },
});
