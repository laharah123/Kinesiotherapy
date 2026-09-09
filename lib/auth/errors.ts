/** Turns a Supabase auth error into something a person can act on. */
export function authErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const raw = (err as { message?: string } | null)?.message?.trim() ?? '';
  if (!raw) return fallback;

  const key = raw.toLowerCase();

  if (key.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (key.includes('email not confirmed'))       return 'Please confirm your email first, then sign in.';
  if (key.includes('user already registered') || key.includes('already been registered')) {
    return 'That email already has an account. Try signing in instead.';
  }
  if (key.includes('password should be at least')) return 'Password must be at least 8 characters.';
  if (key.includes('unable to validate email') || key.includes('invalid email')) {
    return 'That email address does not look right.';
  }
  if (key.includes('email rate limit') || key.includes('too many requests') || key.includes('rate limit')) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (key.includes('network') || key.includes('fetch failed') || key.includes('failed to fetch')) {
    return 'No connection. Check your network and try again.';
  }
  if (key.includes('signups not allowed') || key.includes('signup is disabled')) {
    return 'New sign ups are closed right now.';
  }

  return raw;
}
