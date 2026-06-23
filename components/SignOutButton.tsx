"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut();
    router.replace("/signin");
    router.refresh();
  }

  return (
    <button className="signout" onClick={signOut} disabled={busy}>
      <LogOut /> {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
