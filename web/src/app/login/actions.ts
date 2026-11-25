'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { done, fail, str, type ActionState } from '@/lib/action';

export async function signIn(_: ActionState, form: FormData): Promise<ActionState> {
  const email = str(form, 'email').toLowerCase();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return fail('Enter your email and password.');
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === 'email_not_confirmed') return fail('Check your email first: tap the link we sent to confirm it.');
    return fail("That email and password don't match. Try again.");
  }
  const next = str(form, 'next');
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
}

export async function signUp(_: ActionState, form: FormData): Promise<ActionState> {
  const email = str(form, 'email').toLowerCase();
  const password = String(form.get('password') ?? '');
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Enter a real email address.');
  if (password.length < 8) return fail('Use at least 8 characters for your password.');
  const origin = (await headers()).get('origin') ?? '';
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/auth/callback` } });
  if (error) {
    if (error.code === 'user_already_exists') return fail('There is already an account with that email. Sign in instead.');
    if (error.code === 'over_email_send_rate_limit') return fail('Too many sign-ups right now. Try again in a few minutes.');
    return fail("We couldn't create your account. Try again.");
  }
  if (data.session) redirect('/');   // email confirmation turned off: straight in
  return done(`Almost done. We sent a link to ${email}. Tap it to confirm your email, then you'll pick how you use Trucks2U.`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/login');
}
