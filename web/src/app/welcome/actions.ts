'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSession, type Role } from '@/lib/session';
import { fail, str, type ActionState } from '@/lib/action';

const ROLES: Role[] = ['contractor', 'owner', 'driver', 'broker'];
const digits = (s: string) => s.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');

/** Finishing sign-up: who you are, and your company if you run one. Trucks2U then checks the account. */
export async function finishSignup(_: ActionState, form: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.profile) redirect('/');
  const role = str(form, 'role') as Role;
  const name = str(form, 'name'), phone = digits(str(form, 'phone')), companyName = str(form, 'company');
  if (!ROLES.includes(role)) return fail('Pick how you use Trucks2U.');
  if (name.length < 2) return fail('Enter your name.');
  if (phone.length !== 10) return fail('Enter a 10-digit mobile number.');
  if (role !== 'driver' && companyName.length < 2) return fail('Enter your company name.');

  const supabase = await createClient();
  let companyId: string | null = null;
  if (role !== 'driver') {
    const { data, error } = await supabase.from('companies')
      .insert({ kind: role, name: companyName, phone: `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`, email: session.email })
      .select('id').single();
    if (error) return fail("We couldn't save your company. Try again.");
    companyId = data.id;
  }
  const { error } = await supabase.from('profiles').insert({
    user_id: session.userId, role, full_name: name, email: session.email, company_id: companyId,
    phone: `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`,
  });
  if (error) return fail("We couldn't finish your sign-up. Try again.");
  redirect('/');
}
