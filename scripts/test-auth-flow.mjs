// Integration smoke test for the auth chain the app relies on, against the
// LOCAL Supabase stack: phone test-OTP -> session -> add email -> confirm via
// the Mailpit inbox -> both verified. Creates a throwaway user; clean it up
// afterwards with:  node scripts/db.mjs sql "delete from auth.users where phone='254700000000'"

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  if (line.trim().startsWith("#")) continue;
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2];
}

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const MAILPIT = "http://127.0.0.1:54324";
const PHONE = "+254700000000";
const EMAIL = `tester${Date.now()}@example.com`;

const supabase = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let failed = false;
const log = (ok, msg) => {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) failed = true;
};

// 1) request phone OTP
let r = await supabase.auth.signInWithOtp({
  phone: PHONE,
  options: { shouldCreateUser: true },
});
log(!r.error, `signInWithOtp(phone) ${r.error?.message ?? ""}`);

// 2) verify the fixed test OTP -> session + confirmed phone
r = await supabase.auth.verifyOtp({ phone: PHONE, token: "123456", type: "sms" });
log(!r.error && !!r.data.session, `verifyOtp("123456") -> session ${r.error?.message ?? ""}`);
log(!!r.data.user?.phone_confirmed_at, "phone_confirmed_at is set");

// 3) attach an email -> sends a confirmation email
r = await supabase.auth.updateUser({ email: EMAIL });
log(!r.error, `updateUser(email) ${r.error?.message ?? ""}`);

// 4) pull the confirmation link out of the local inbox
await new Promise((res) => setTimeout(res, 1500));
const list = await fetch(`${MAILPIT}/api/v1/messages`).then((x) => x.json());
const msg = list.messages?.[0];
log(!!msg, `email delivered to Mailpit (count: ${list.messages_count ?? 0})`);

let link = null;
if (msg) {
  const full = await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`).then((x) => x.json());
  const body = `${full.HTML ?? ""} ${full.Text ?? ""}`;
  const urls = [...body.matchAll(/https?:\/\/[^\s"'<>]+/g)].map((m) => m[0]);
  link = urls.find((u) => /verify|token_hash|token=|confirm/i.test(u)) ?? null;
}
log(!!link, "confirmation link found in email");

// 5) click it (confirm the email server-side)
if (link) {
  const resp = await fetch(link.replace(/&amp;/g, "&"), { redirect: "manual" });
  log(resp.status >= 200 && resp.status < 400, `visited confirm link -> HTTP ${resp.status}`);
}

// 6) email now confirmed?
r = await supabase.auth.getUser();
log(!!r.data.user?.email_confirmed_at, "email_confirmed_at is set — BOTH verified");

console.log(
  failed
    ? "\n✗ auth chain FAILED (see ✗ above)"
    : "\n✓ full auth chain works: phone OTP + email confirmation via Mailpit",
);
process.exit(failed ? 1 : 0);
