'use client';

import { useState } from 'react';
import { ActionForm, Field, Submit } from '@/components/form';
import { finishSignup } from './actions';

const ROLES = [
  ['contractor', 'Contractor', 'I need trucks for my jobs'],
  ['owner', 'Truck owner', 'I own trucks and want work for them'],
  ['driver', 'Driver', 'I drive and want to pick up jobs'],
  ['broker', 'Broker', 'I dispatch trucks for others'],
] as const;

export function RoleForm() {
  const [role, setRole] = useState<string>('');
  const company = role && role !== 'driver';
  return (
    <ActionForm action={finishSignup} className="space-y-6">
      <fieldset>
        <legend className="mb-3 text-sm font-semibold">How do you use Trucks2U?</legend>
        <div className="grid gap-2">
          {ROLES.map(([k, label, sub]) => (
            <label key={k} className={`flex cursor-pointer items-center gap-3 rounded-2xl p-4 ${role === k ? 'bg-black text-white' : 'bg-tile'}`}>
              <input type="radio" name="role" value={k} className="sr-only" onChange={() => setRole(k)} required />
              <span className="flex-1"><b className="block text-base">{label}</b><span className={`text-sm ${role === k ? 'text-gray-300' : 'text-gray-600'}`}>{sub}</span></span>
              <span aria-hidden="true" className={`grid size-6 place-items-center rounded-full border-2 ${role === k ? 'border-white' : 'border-gray-400'}`}>{role === k ? '✓' : ''}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Your name" name="name" autoComplete="name" required />
      <Field label="Mobile number" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(510) 555-0142" required hint="For job texts once texting is turned on." />
      {company && <Field label="Company name" name="company" autoComplete="organization" required />}
      <Submit>Finish sign-up</Submit>
    </ActionForm>
  );
}
