import 'server-only';
import { cache } from 'react';
import { createClient } from './supabase/server';

export type Role = 'contractor' | 'owner' | 'driver' | 'broker' | 'admin';
export type Status = 'new' | 'review' | 'approved' | 'suspended';

export interface Profile {
  user_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: Role;
  company_id: string | null;
  status: Status;
}
export interface Company { id: string; kind: Role; name: string; status: Status }

export interface Session { userId: string; email: string; profile: Profile | null; company: Company | null }

/** The signed-in person, their profile and company. Null when signed out. Cached per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: row } = await supabase.from('profiles').select('*, company:companies(id, kind, name, status)').eq('user_id', claims.sub).maybeSingle();
  const { company, ...profile } = (row ?? {}) as Profile & { company: Company | null };
  return { userId: claims.sub, email: String(claims.email ?? ''), profile: row ? profile : null, company: company ?? null };
});
