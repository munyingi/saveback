import { redirect } from "next/navigation";
import { getSessionState } from "@/lib/session";
import { PhoneShell } from "@/components/PhoneShell";
import { AuthScreen } from "@/components/auth/AuthScreen";

export const metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  banned: "This account has been banned.",
  verify: "That email link was invalid or expired. Try resending.",
  auth_callback: "That sign-in link was invalid or expired.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Already fully verified? Skip auth.
  const state = await getSessionState();
  if (state.fullyVerified) redirect("/onboarding");

  return (
    <PhoneShell>
      <AuthScreen initialError={error ? (ERRORS[error] ?? "") : ""} />
    </PhoneShell>
  );
}
