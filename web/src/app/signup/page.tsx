import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { ActionForm, Field, Submit } from '@/components/form';
import { getSession } from '@/lib/session';
import { signUp } from '../login/actions';

export const metadata: Metadata = { title: 'Create an account' };

export default async function SignupPage() {
  if (await getSession()) redirect('/');
  return (
    <AuthShell title="Create an account" sub="For contractors, truck owners, drivers and brokers. It takes a minute.">
      <ActionForm action={signUp}>
        <Field label="Email" name="email" type="email" autoComplete="email" required autoFocus />
        <Field label="Password" name="password" type="password" autoComplete="new-password" minLength={8} required hint="At least 8 characters." />
        <Submit>Create account</Submit>
      </ActionForm>
      <p className="mt-8 text-center text-sm text-gray-600">Already have an account? <Link href="/login" className="font-bold text-black underline">Sign in</Link></p>
    </AuthShell>
  );
}
