import { notFound } from "next/navigation";
import { isCallerAdmin } from "@/lib/admin";

export const metadata = { title: "Admin" };

// Gate the whole area on profiles.is_admin. Non-admins get a 404 so the admin
// surface isn't even discoverable.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isCallerAdmin())) notFound();
  return <>{children}</>;
}
