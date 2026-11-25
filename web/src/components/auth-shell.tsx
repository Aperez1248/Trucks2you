import type { ReactNode } from 'react';
import { Logo } from './logo';

export function AuthShell({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-6">
      <Logo />
      <h1 className="mt-10 text-3xl font-extrabold tracking-tight">{title}</h1>
      {sub && <p className="mt-2 text-gray-600">{sub}</p>}
      <div className="mt-8">{children}</div>
    </main>
  );
}
