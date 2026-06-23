"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Users, Heart, User, Shield } from "lucide-react";
import { avatarColor } from "@/lib/constants";

const TABS = [
  { href: "/discover", Icon: Search, label: "Discover" },
  { href: "/requests", Icon: Users, label: "Requests" },
  { href: "/matches", Icon: Heart, label: "Matches" },
  { href: "/you", Icon: User, label: "You" },
] as const;

// Left navigation rail for the wide desktop layout (≥1024px). Hidden on
// phone/tablet, where the bottom tab bar is used instead.
export function DesktopRail({
  requestsCount = 0,
  isAdmin = false,
  name,
  country,
}: {
  requestsCount?: number;
  isAdmin?: boolean;
  name: string;
  country: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="deck-rail rail-left">
      <Link href="/discover" className="rail-brand">
        <b>
          Save<span>Back</span>
        </b>
        <small>save for save</small>
      </Link>

      <nav className="rail-nav">
        {TABS.map(({ href, Icon, label }) => {
          const on = pathname === href || pathname.startsWith(href + "/");
          const badge = href === "/requests" ? requestsCount : 0;
          return (
            <Link
              key={href}
              href={href}
              className={"rail-link" + (on ? " on" : "")}
            >
              <Icon />
              <span>{label}</span>
              {badge > 0 && <span className="rail-badge">{badge}</span>}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className={
              "rail-link" + (pathname.startsWith("/admin") ? " on" : "")
            }
          >
            <Shield />
            <span>Admin</span>
          </Link>
        )}
      </nav>

      <Link href="/you" className="rail-me">
        <span className="av" style={{ background: avatarColor(name) }}>
          {name[0]?.toUpperCase()}
        </span>
        <span className="rail-me-txt">
          <b>{name}</b>
          <small>{country}</small>
        </span>
      </Link>
    </aside>
  );
}
