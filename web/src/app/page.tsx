import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { getSession } from '@/lib/session';
import { signOut } from './login/actions';
import { RoleForm } from './welcome/role-form';

const ROLE_NAME = { contractor: 'Contractor', owner: 'Truck owner', driver: 'Driver', broker: 'Broker', admin: 'Trucks2U admin' } as const;

export default async function Home() {
  const session = await getSession();
  if (!session) redirect('/login');
  const out = (
    <form action={signOut} className="mt-10"><button className="text-sm font-semibold text-gray-600 underline">Sign out ({session.email})</button></form>
  );
  if (!session.profile) {
    return <AuthShell title="Welcome to Trucks2U" sub="A few details and you're set.">
      <RoleForm />{out}
    </AuthShell>;
  }
  const p = session.profile, first = p.full_name.split(' ')[0];
  const where = session.company ? ` with ${session.company.name}` : '';
  if (p.status !== 'approved') {
    return <AuthShell title={`Thanks, ${first}`} sub={`You're signed up as a ${ROLE_NAME[p.role].toLowerCase()}${where}.`}>
      <div className="rounded-2xl bg-act-bg p-4 text-act-ink">
        <b className="block">We’re checking your account</b>
        <span className="text-sm">Trucks2U reviews every new account, usually within 1 business day. We’ll let you know when you can {p.role === 'contractor' ? 'request trucks' : 'take jobs'}.</span>
      </div>{out}
    </AuthShell>;
  }
  return <AuthShell title={`Hi ${first}`} sub={`${ROLE_NAME[p.role]}${where}. Your account is approved.`}>
    <div className="rounded-2xl bg-tile p-4 text-sm">The {ROLE_NAME[p.role].toLowerCase()} screens are being built next.</div>{out}
  </AuthShell>;
}
