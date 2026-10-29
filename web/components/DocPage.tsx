import Link from "next/link";
import { Markdown } from "./Markdown";
import { readDoc, type DocKey } from "../lib/docs";

const TITLES: Record<
  DocKey,
  { title: string; sub: string; cross: { label: string; href: string }[]; crumb: string }
> = {
  method: {
    title: "Method note",
    crumb: "method",
    sub: "the gap, the pillars as doctrine, how to read a bundle, reproducibility stated precisely",
    cross: [
      { label: "bundle format v1", href: "/format/" },
      { label: "failure-mode matrix", href: "/matrix/" },
      { label: "harness spec", href: "/harness/" },
    ],
  },
  format: {
    title: "Bundle format, v1",
    crumb: "format",
    sub: "the record schema, the chain, the gap codes, the verify procedure",
    cross: [
      { label: "method note", href: "/method/" },
      { label: "harness spec", href: "/harness/" },
    ],
  },
  matrix: {
    title: "Failure-mode matrix",
    crumb: "matrix",
    sub: "four failure modes of decision-time evidence, five columns, two test classes",
    cross: [
      { label: "harness spec", href: "/harness/" },
      { label: "method note", href: "/method/" },
    ],
  },
  harness: {
    title: "Harness spec",
    crumb: "harness",
    sub: "the T0-T6 phases as implemented, tests A-D, the binding field map, the standing named gaps",
    cross: [
      { label: "failure-mode matrix", href: "/matrix/" },
      { label: "bundle format v1", href: "/format/" },
    ],
  },
};

export function DocPage({ docKey }: { docKey: DocKey }) {
  const source = readDoc(docKey);
  const meta = TITLES[docKey];
  return (
    <section>
      <p>
        <Link className="back" href="/">
          ← home
        </Link>
      </p>
      <div className="run-head">
        <h1>{meta.title}</h1>
      </div>
      <p className="sub">{meta.sub}</p>
      <div className="cross-links">
        {meta.cross.map((c) => (
          <Link key={c.href} className="btn" href={c.href}>
            {c.label}
          </Link>
        ))}
      </div>
      <div className="card">
        {source ? (
          <Markdown source={source} />
        ) : (
          <p className="bad-text">documents not found at build time (../docs)</p>
        )}
      </div>
    </section>
  );
}
