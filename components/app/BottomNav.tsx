"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Users, Heart, User } from "lucide-react";

const TABS = [
  { href: "/discover", Icon: Search, label: "Discover" },
  { href: "/requests", Icon: Users, label: "Requests" },
  { href: "/matches", Icon: Heart, label: "Matches" },
  { href: "/you", Icon: User, label: "You" },
] as const;

export function BottomNav({ requestsCount = 0 }: { requestsCount?: number }) {
  const pathname = usePathname();

  return (
    <div className="nav">
      {TABS.map(({ href, Icon, label }) => {
        const on = pathname === href || pathname.startsWith(href + "/");
        const badge = href === "/requests" ? requestsCount : 0;
        return (
          <Link key={href} href={href} className={"navb" + (on ? " on" : "")}>
            {badge > 0 && <span className="badge">{badge}</span>}
            <Icon />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
