import Link from "next/link";

import { Icon } from "../components/Icon";

/**
 * 404. It is a page like any other, so it looks like one: the same
 * masthead, the same left edge, and three ways back to the record.
 */
export default function NotFound() {
  return (
    <div className="stack">
      <header className="page-head">
        <p className="eyebrow">404 · no record at this path</p>
        <h1 className="page-title">
          Nothing was emitted here.
          <br />
          <span className="dim">Pick an edge of the record.</span>
        </h1>
        <p className="page-dek">
          The path you asked for is not in the export. The site is a static bundle: every page it
          has was written by the build, so a missing one is a missing page rather than a failed
          fetch.
        </p>
        <div className="hero-actions page-head-actions">
          <Link className="btn btn-solid" href="/runs/">
            <Icon name="runs" size={15} /> the runs
          </Link>
          <Link className="btn" href="/blog/">
            <Icon name="book" size={15} /> twelve notes
          </Link>
          <Link className="btn btn-ghost" href="/">
            the landing page <Icon name="arrow" size={13} />
          </Link>
        </div>
      </header>

      <div className="terminal">
        <div className="terminal-bar">
          <span className="terminal-dot" />
          <span className="terminal-dot" />
          <span className="terminal-dot" />
          <span className="terminal-title mono">sh — tieout</span>
        </div>
        <pre className="terminal-body">
{`$ tieout verify runs/demo
  chain  : 22 records, intact
  VERDICT: PASS (re-derivable by a stranger)

$ ls web/out
  404  404.html  _next  blog  compare  families  format
  harness  index.html  index.txt  matrix  method  runs`}
        </pre>
      </div>
    </div>
  );
}
