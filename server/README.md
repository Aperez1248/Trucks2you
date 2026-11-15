# Trucks2U push server

Sends phone notifications so they arrive even when Trucks2U is closed. One small Supabase Edge Function (`supabase/functions/push`).

The app already works without it: alerts show on the phone while the app is open. This adds the "app closed" part.

## Set it up (about 15 minutes)

1. In Supabase, create a new project named **Trucks2U** (keep it separate from JobVault).
2. **Edge Functions → Deploy a new function → Via editor.** Name it `push`, paste `supabase/functions/push/index.ts`, deploy.
   In the function's settings, turn **off** "Verify JWT" (the app calls it without a login; the function only accepts calls from the Trucks2U site).
3. **Edge Functions → Secrets**: add the three values from `Trucks2U private keys/push-keys.txt` on your Desktop:
   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (a `mailto:` address for your business).
4. Copy the function's URL (`https://<project>.supabase.co/functions/v1/push`) into `PUSH.url` in `app/index.html` and push it live.
5. On your phone: open Trucks2U from the Home Screen → My info → Phone notifications → **Turn on**, then **Send a test notification** and close the app.

The private key never goes in the app or on GitHub. If it ever leaks, make a new key pair and update both the secret and `PUSH.key`.
