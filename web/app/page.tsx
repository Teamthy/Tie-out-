"use client";

import { useEffect, useState } from "react";
import { Landing } from "../components/Landing";
import { Compare } from "../components/Compare";
import { RunList } from "../components/RunList";
import { RunDetail } from "../components/RunDetail";
import { DocsPage } from "../components/DocsPage";
import { FamiliesPage } from "../components/FamiliesPage";
import type { DocKey } from "../lib/types";

function useHashRoute(): string {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return hash;
}

const NAV: { label: string; href: string; match: RegExp }[] = [
  { label: "runs", href: "#/runs", match: /^#\/run/ },
  { label: "compare", href: "#/compare", match: /^#\/compare/ },
  { label: "method", href: "#/method", match: /^#\/method/ },
  { label: "format", href: "#/format", match: /^#\/format/ },
  { label: "matrix", href: "#/matrix", match: /^#\/matrix/ },
  { label: "families", href: "#/families", match: /^#\/families/ },
];

const DOC_KEYS: Record<string, DocKey> = {
  "#/method": "method",
  "#/format": "format",
  "#/matrix": "matrix",
  "#/harness": "harness",
};

export default function Home() {
  const hash = useHashRoute();
  const runMatch = hash.match(/^#\/run\/(.+)$/);
  const route = runMatch ? "#/run" : hash || "#/";

  let view: React.ReactNode;
  if (runMatch) view = <RunDetail id={decodeURIComponent(runMatch[1])} />;
  else if (route.startsWith("#/runs")) view = <RunList />;
  else if (route.startsWith("#/compare")) view = <Compare />;
  else if (DOC_KEYS[route]) view = <DocsPage docKey={DOC_KEYS[route]} />;
  else if (route.startsWith("#/families")) view = <FamiliesPage />;
  else view = <Landing />;

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/">
          tieout
        </a>
        <nav className="nav">
          {NAV.map((n) => (
            <a
              key={n.href}
              className={n.match.test(hash) ? "nav-link nav-active" : "nav-link"}
              href={n.href}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <span className="tagline">the report is a claim. the bundle is a record.</span>
      </header>
      <main>{view}</main>
      <footer className="footer">
        p1 verdict event · p2 provenance · p3 negative controls · p4 named gaps · p5 re-derivation ·
        p6 judge audit
      </footer>
    </div>
  );
}
