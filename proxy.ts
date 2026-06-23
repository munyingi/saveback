import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 renamed the "middleware" convention to "proxy". Runs on every
// matched request to keep the Supabase auth session fresh.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets, the PWA files, and images,
     * so the service worker and manifest are served without auth overhead.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|.*\\.(?:png|svg|ico|jpg|jpeg|gif|webp)$).*)",
  ],
};
