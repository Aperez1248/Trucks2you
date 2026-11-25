'use client';

import { useActionState, type ReactNode, type InputHTMLAttributes } from 'react';
import { useFormStatus } from 'react-dom';
import type { ActionState } from '@/lib/action';

type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;

/** A form that runs a server action and shows its result underneath. */
export function ActionForm({ action, children, className = 'space-y-4' }: { action: Action; children: ReactNode; className?: string }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      {(state.error || state.message) && (
        <div role={state.error ? 'alert' : 'status'}
          className={`rounded-xl px-3 py-2.5 text-sm ${state.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          {state.error ?? state.message}
        </div>
      )}
    </form>
  );
}

export function Submit({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className={`min-h-12 w-full rounded-full bg-black px-5 text-base font-bold text-white disabled:opacity-60 ${className}`}>
      {pending ? 'One moment…' : children}
    </button>
  );
}

export function Field({ label, hint, ...props }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <input {...props} className="min-h-12 w-full rounded-xl bg-tile px-4 text-base outline-none ring-black focus:ring-2" />
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}
