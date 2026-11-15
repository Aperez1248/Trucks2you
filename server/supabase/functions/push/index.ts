// Trucks2U push server: a Supabase Edge Function that sends one phone notification.
// The app POSTs { sub, title, body, url, tag } and this sends it to that phone with the private key.
// The private key lives only in Supabase secrets (VAPID_PRIVATE_KEY), never in the app or on GitHub.
import webpush from "npm:web-push@3.6.7";

const ALLOWED = ["https://aperez1248.github.io", "http://localhost:8080"];
webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")!, Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ALLOWED.includes(origin) ? origin : ALLOWED[0],
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Vary": "Origin",
});
const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n);

Deno.serve(async req => {
  const origin = req.headers.get("origin"), h = cors(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (req.method !== "POST" || !origin || !ALLOWED.includes(origin)) return new Response("Not allowed", { status: 403, headers: h });
  let d: Record<string, unknown>;
  try { d = await req.json(); } catch { return new Response("Bad request", { status: 400, headers: h }); }
  const sub = d.sub as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined;
  if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) return new Response("Missing subscription", { status: 400, headers: h });
  const msg = JSON.stringify({ title: clip(d.title, 80), body: clip(d.body, 240), url: clip(d.url, 200), tag: clip(d.tag, 60) });
  // Optional short wait (up to 30 seconds) so a test can arrive after you lock your phone
  const wait = Math.min(30, Math.max(0, Number(d.delay) || 0));
  if (wait) await new Promise(r => setTimeout(r, wait * 1000));
  try {
    await webpush.sendNotification(sub as webpush.PushSubscription, msg, { TTL: 3600 });
    return new Response("Sent", { status: 200, headers: h });
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode ?? 500;
    return new Response(code === 404 || code === 410 ? "Subscription expired" : "Push failed", { status: code === 404 || code === 410 ? 410 : 502, headers: h });
  }
});
