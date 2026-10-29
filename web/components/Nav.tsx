"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon, type IconName } from "./Icon";
import { LINKEDIN_URL } from "./LinkedIn";

type NavItem = { href: string; label: string; blurb: string; icon: IconName };

const ITEMS: NavItem[] = [
  { href: "/runs/", label: "runs", blurb: "committed bundles, verdict by verdict", icon: "runs" },
  { href: "/compare/", label: "compare", blurb: "two runs, aligned by pre-assigned id", icon: "compare" },
  { href: "/blog/", label: "notes", blurb: "twelve pieces, each with its sources", icon: "book" },
  { href: "/method/", label: "method", blurb: "the gap, the six pillars, the rules", icon: "method" },
  { href: "/format/", label: "format", blurb: "the bundle schema, v1 and v1.1", icon: "format" },
  { href: "/matrix/", label: "matrix", blurb: "failure modes for decision-time evidence", icon: "matrix" },
  { href: "/families/", label: "families", blurb: "check families and the ASI crosswalk", icon: "families" },
  { href: "/harness/", label: "harness", blurb: "the phases as implemented, and the gaps", icon: "harness" },
];

function isActive(pathname: string, href: string): boolean {
  const base = href.replace(/\/$/, "");
  return pathname === base || pathname === href || pathname.startsWith(base + "/");
}

export function Nav() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);

  // a route change closes the sheet; escape closes it; the body does not
  // scroll behind it
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className={`masthead${open ? " is-open" : ""}`}>
      <div className="shell masthead-inner">
        <Link href="/" className="wordmark" aria-label="tieout, home">
          <span className="wordmark-mark" aria-hidden="true">to</span>
          <span className="wordmark-text">
            tieout<span className="wordmark-dot">.</span>
          </span>
          <span className="wordmark-tag">v0.3</span>
        </Link>

        <nav className="nav-desktop" aria-label="primary">
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${isActive(pathname, item.href) ? " nav-active" : ""}`}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
            >
              <Icon name={item.icon} size={15} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="masthead-actions">
          <a
            className="masthead-author"
            href={LINKEDIN_URL}
            target="_blank"
            rel="noreferrer noopener"
          >
            <Icon name="arrow-up-right" size={14} />
            <span className="masthead-author-label">author</span>
          </a>
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="nav-sheet"
            aria-label={open ? "close menu" : "open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? "close" : "menu"} size={18} />
            <span>{open ? "close" : "menu"}</span>
          </button>
        </div>
      </div>

      <div id="nav-sheet" className="nav-sheet" hidden={!open}>
        <div className="shell nav-sheet-inner">
          <p className="nav-sheet-label">index</p>
          <ul className="nav-sheet-list">
            {ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`nav-row${isActive(pathname, item.href) ? " nav-row-active" : ""}`}
                >
                  <span className="nav-row-icon">
                    <Icon name={item.icon} size={18} />
                  </span>
                  <span className="nav-row-text">
                    <span className="nav-row-label">{item.label}</span>
                    <span className="nav-row-blurb">{item.blurb}</span>
                  </span>
                  <Icon name="arrow" size={16} />
                </Link>
              </li>
            ))}
          </ul>
          <div className="nav-sheet-foot">
            <a href={LINKEDIN_URL} target="_blank" rel="noreferrer noopener" className="btn btn-ghost">
              timothy olusanya <Icon name="arrow-up-right" size={14} />
            </a>
            <span className="mono small dim">evidence, not reports</span>
          </div>
        </div>
      </div>
    </header>
  );
}
