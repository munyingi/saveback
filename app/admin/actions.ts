"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { banUser, unbanUser } from "@/lib/moderation";

// Every admin write re-verifies the CALLER is an admin (their own RLS-bound
// session), then performs the write with the service role. The service-role key
// stays server-side.
async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!data?.is_admin) throw new Error("Not authorized");
  return user.id;
}

export async function adminBan(userId: string, reason?: string) {
  const adminId = await requireAdmin();
  await banUser(userId, reason ?? "Banned from admin dashboard", adminId);
  revalidatePath("/admin");
}

export async function adminUnban(userId: string) {
  await requireAdmin();
  await unbanUser(userId);
  revalidatePath("/admin");
}

/** Promote a number: free/admin boost through the single activate_boost() path. */
export async function adminPromote(userId: string, minutes = 60) {
  const adminId = await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.rpc("activate_boost", {
    p_user: userId,
    p_minutes: minutes,
    p_source: "admin",
    p_admin: adminId,
  });
  if (error) throw error;
  revalidatePath("/admin");
  revalidatePath("/discover");
}

export async function adminResolveReport(reportId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("reports").update({ status: "reviewed" }).eq("id", reportId);
  revalidatePath("/admin");
}
