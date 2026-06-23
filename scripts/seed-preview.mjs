// TEMPORARY preview seed for visual checks against the LOCAL stack only.
// Creates a fully-verified main user (phone +254700000000, the test-OTP number)
// plus a few feed profiles so Discover has content. ALWAYS tear down after:
//
//   node scripts/seed-preview.mjs up      # create
//   node scripts/seed-preview.mjs down    # delete everything @seed.test
//
// All seeded accounts use the @seed.test email domain so `down` can find and
// remove every one of them. No seed data is meant to persist.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  if (l.trim().startsWith("#")) continue;
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2];
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = env.SUPABASE_SECRET_KEY;
const admin = createClient(URL, SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PEOPLE = [
  { phone: "+254700000000", name: "Wanjiru Kamau", category: "Business", blurb: "Save for save. I run a small online shop in Nairobi." },
  { phone: "+254700000001", name: "Brian Otieno", category: "Creator", blurb: "Content creator. Let's grow our status views together." },
  { phone: "+254700000002", name: "Aisha Hassan", category: "Business", blurb: "Boutique owner. Happy to save back the same day." },
  { phone: "+254700000003", name: "Daniel Mwangi", category: "Tech", blurb: "Building in public. Save me and I save you back." },
  { phone: "+254700000004", name: "Faith Njeri", category: "Creator", blurb: "Lifestyle and fashion. Always reciprocate saves." },
];

async function up() {
  for (const p of PEOPLE) {
    const email = p.phone.replace("+", "") + "@seed.test";
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: "testpass123!",
      phone: p.phone,
      email_confirm: true,
      phone_confirm: true,
    });
    if (error) {
      console.log(`skip ${p.phone}: ${error.message}`);
      continue;
    }
    const id = data.user.id;
    const handle = p.name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12) + id.slice(0, 4);
    await admin.from("profiles").insert({
      id,
      handle,
      name: p.name,
      country: "Kenya",
      category: p.category,
      blurb: p.blurb,
      last_active_at: new Date().toISOString(),
    });
    await admin.from("contacts").insert({ user_id: id, phone: p.phone, verified: true });
    console.log(`+ ${p.name} (${p.phone})`);
  }
  console.log("\nSeed ready. Sign in at /signin with +254700000000, code 123456.");
}

async function down() {
  let removed = 0;
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    const users = data?.users ?? [];
    if (users.length === 0) break;
    for (const u of users) {
      if (u.email?.endsWith("@seed.test")) {
        await admin.auth.admin.deleteUser(u.id).catch(() => {});
        removed++;
      }
    }
    if (users.length < 100) break;
  }
  console.log(`removed ${removed} seed user(s)`);
}

const cmd = process.argv[2];
if (cmd === "up") await up();
else if (cmd === "down") await down();
else console.error("usage: node scripts/seed-preview.mjs up|down");
process.exit(0);
