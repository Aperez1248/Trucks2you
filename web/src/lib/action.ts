/** What a form's server action returns to the page. */
export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
  /** Shown once, e.g. a temporary password */
  secret?: string;
  /** the id of what was just made (e.g. a logged call, so its photos can be added) */
  id?: string;
  /** Changes on every submit so a form can tell a fresh result from an old one */
  at?: number;
}

export const done = (message: string, extra: Partial<ActionState> = {}): ActionState => ({ ok: true, message, at: Date.now(), ...extra });
export const fail = (error: string): ActionState => ({ ok: false, error, at: Date.now() });

export const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
