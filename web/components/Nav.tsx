"use client";

import { usePathname } from "next/navigation";

export const NAV: { label: string; href: string; match: string[] }[] = [
  { label: "runs", href: "/runs/", match: ["/runs", "/run"] },
  { label: "compare", href: "/compare/", match: ["/compare"] },
  { label: "blog", href: "/blog/", match: ["/blog"] },
  { label: "method", href: "/method/", match: ["/method"] },
  { label: "format", href: "/format/", match: ["/format"] },
  { label: "matrix", href: "/matrix/", match: ["/matrix"] },
  { label: "families", href: "/families/", match: ["/families"] },
];

export function Nav() {
  const pathname = usePathname() ?? "/";
  return (
    <nav className="nav">
      {NAV.map((n) => {
        const active = n.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
        return (
          <a
            key={n.href}
            className={active ? "nav-link nav-active" : "nav-link"}
            href={n.href}
            aria-current={active ? "page" : undefined}
          >
            {n.label}
          </a>
        );
      })}
    </nav>
  );
}
