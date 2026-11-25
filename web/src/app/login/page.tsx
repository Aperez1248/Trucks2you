import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { ActionForm, Field, Submit } from '@/components/form';
import { getSession } from '@/lib/session';
import { signIn } from './actions';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next, error } = await searchParams;
  if (await getSession()) redirect('/');
  return (
    <AuthShell title="Sign in" sub="Dump trucks on demand.">
      {error === 'link' && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800">That link didn’t work or has expired. Sign in, or sign up again.</p>}
      <ActionForm action={signIn}>
        <input type="hidden" name="next" value={typeof next === 'string' ? next : ''} />
        <Field label="Email" name="email" type="email" autoComplete="email" required autoFocus />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        <Submit>Sign in</Submit>
      </ActionForm>
      <p className="mt-8 text-center text-sm text-gray-600">New to Trucks2U? <Link href="/signup" className="font-bold text-black underline">Create an account</Link></p>
    </AuthShell>
  );
}
