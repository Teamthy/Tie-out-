import type { Metadata } from "next";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

import { Icon } from "../components/Icon";
import { LinkedInButton, AUTHOR } from "../components/LinkedIn";
import { Nav } from "../components/Nav";

export const metadata: Metadata = {
  title: "tieout — evidence, not reports",
  description:
    "An open harness for agent evaluation and red team runs. Every verdict is a bound, chained, re-derivable event: verify the bundle without trusting the tool, the judge, or the team that ran it.",
};

const PILLARS = [
  ["verdict", "one event per decision"],
  ["provenance", "what produced it"],
  ["controls", "the judge, measured"],
  ["gaps", "what could not be checked"],
  ["re-derive", "verify, no model"],
  ["audit", "the judge's own numbers"],
];

const INDEX = [
  { href: "/runs/", label: "runs" },
  { href: "/compare/", label: "compare" },
  { href: "/blog/", label: "notes" },
  { href: "/method/", label: "method" },
  { href: "/format/", label: "format" },
  { href: "/matrix/", label: "matrix" },
  { href: "/families/", label: "families" },
  { href: "/harness/", label: "harness" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          skip to content
        </a>
        <Nav />
        <main id="main" className="shell main">
          {children}
        </main>

        <footer className="footer">
          <div className="shell footer-inner">
            <div className="footer-brand">
              <span className="wordmark-text">
                tieout<span className="wordmark-dot">.</span>
              </span>
              <p className="footer-blurb">
                An open harness for agent evaluation and red team runs. The report is a
                claim; the bundle is a record.
              </p>
              <span className="footer-version">0.3.0 · keyless core · monochrome by choice</span>
            </div>

            <nav className="footer-col" aria-label="index">
              <h2 className="footer-head">index</h2>
              <ul className="footer-list">
                {INDEX.map((l) => (
                  <li key={l.href}>
                    <a href={l.href}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="footer-col">
              <h2 className="footer-head">the six pillars</h2>
              <ul className="footer-list">
                {PILLARS.map(([name, line]) => (
                  <li key={name}>
                    <span className="footer-pillar">{name}</span>
                    <span className="footer-pillar-line">{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer-col">
              <h2 className="footer-head">author</h2>
              <p className="footer-author">{AUTHOR}</p>
              <p className="footer-note">
                Independent AI security research practice. Built in Lagos.
              </p>
              <LinkedInButton label="linkedin" />
            </div>
          </div>

          <div className="shell footer-base">
            <span className="mono">
              <Icon name="hash" size={12} /> every number here traces to a committed file
            </span>
            <span className="mono">re-derivable by a stranger · no key, no network</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
