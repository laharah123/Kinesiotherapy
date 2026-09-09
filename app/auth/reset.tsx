import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { authErrorMessage } from '@/lib/auth/errors';
import { Button } from '@/components/ui/Button';
import { COLORS, FONTS, RADII, fontFor } from '@/lib/tokens';

/** Reads access/refresh tokens from a deep link's query or hash fragment. */
function tokensFromUrl(url: string | null): { access?: string; refresh?: string } {
  if (!url) return {};
  const out: { access?: string; refresh?: string } = {};
  const parts = url.split(/[?#]/).slice(1);
  for (const part of parts) {
    const params = new URLSearchParams(part);
    out.access  = out.access  ?? params.get('access_token')  ?? undefined;
    out.refresh = out.refresh ?? params.get('refresh_token') ?? undefined;
  }
  return out;
}

/**
 * Password reset landing screen. Opened cold from the email link
 * (kinesiotherapy://auth/reset#access_token=...). Applies the recovery
 * session, then lets the user choose a new password.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ access_token?: string; refresh_token?: string }>();
  const url = Linking.useURL();

  const [ready, setReady]       = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [done, setDone]         = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function applySession() {
      const fromUrl = tokensFromUrl(url);
      const access  = params.access_token  ?? fromUrl.access;
      const refresh = params.refresh_token ?? fromUrl.refresh;
      if (access && refresh) {
        try {
          await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
        } catch (e) {
          if (!cancelled) setError(authErrorMessage(e, 'This reset link is no longer valid.'));
        }
      }
      if (!cancelled) setReady(true);
    }
    applySession();
    return () => { cancelled = true; };
  }, [url, params.access_token, params.refresh_token]);

  async function handleSave() {
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true); setError(null);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
    } catch (e) {
      setError(authErrorMessage(e, 'Could not update your password.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.wordmark}>Kinesiotherapy</Text>
        <Text style={styles.headline}>{done ? 'Password updated.' : 'Choose a new password.'}</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {done ? (
          <Button label="Continue" full onPress={() => router.replace('/')}/>
        ) : (
          <>
            <View style={styles.fields}>
              <View style={styles.fieldRow}>
                <TextInput
                  style={styles.input}
                  placeholder="New password (8+ characters)"
                  placeholderTextColor={COLORS.ink4}
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="new-password"
                  value={password}
                  onChangeText={setPassword}
                  editable={ready}
                />
              </View>
              <View style={styles.fieldRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Repeat new password"
                  placeholderTextColor={COLORS.ink4}
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="new-password"
                  value={confirm}
                  onChangeText={setConfirm}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                  editable={ready}
                />
              </View>
            </View>
            <Button label="Save password" full loading={loading || !ready} onPress={handleSave}/>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.bg },
  container: { flexGrow: 1, padding: 28, paddingTop: 72, justifyContent: 'center' },
  wordmark: { fontFamily: FONTS.serif, fontSize: 22, color: COLORS.clay, marginBottom: 8 },
  headline: { fontFamily: FONTS.serif, fontSize: 32, color: COLORS.ink, marginBottom: 28 },
  errorText: {
    fontFamily: FONTS.sans, fontSize: 13, color: COLORS.clay,
    marginBottom: 12, backgroundColor: COLORS.claySoft,
    padding: 10, borderRadius: RADII.r1,
  },
  fields: { gap: 12, marginBottom: 20 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r2, paddingHorizontal: 14, paddingVertical: 12,
  },
  input: {
    flex: 1, fontFamily: fontFor('400'), fontSize: 15, color: COLORS.ink,
    backgroundColor: 'transparent',
  },
});
