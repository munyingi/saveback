// Server-side session + access gate. The brief requires BOTH a verified phone
// and a verified email before app access, and rejects banned users on every
// request (is_banned() gate). This is the single source of truth for the gate.
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type SessionState = {
  user: User | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  banned: boolean;
  /** Signed in, phone + email verified, and not banned. */
  fullyVerified: boolean;
};

export async function getSessionState(): Promise<SessionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      phoneVerified: false,
      emailVerified: false,
      banned: false,
      fullyVerified: false,
    };
  }

  const phoneVerified = Boolean(user.phone_confirmed_at);
  const emailVerified = Boolean(user.email_confirmed_at);

  // is_banned() checks the bans table for auth.uid(). A lingering session for a
  // banned account is treated as not-verified so it cannot reach the app.
  const { data: bannedData } = await supabase.rpc("is_banned");
  const banned = Boolean(bannedData);

  return {
    user,
    phoneVerified,
    emailVerified,
    banned,
    fullyVerified: phoneVerified && emailVerified && !banned,
  };
}
