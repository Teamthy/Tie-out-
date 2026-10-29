import Link from "next/link";

import { Markdown, outline } from "./Markdown";
import { Icon } from "./Icon";
import { PageHead } from "./PageHead";
import { readDoc, type DocKey } from "../lib/docs";

const TITLES: Record<
  DocKey,
  {
    title: string;
    sub: string;
    kicker: string;
    cross: { label: string; href: string; icon: "book" | "format" | "matrix" | "harness" | "method" }[];
  }
> = {
  method: {
    title: "The method, and the gap it fills.",
    kicker: "method note",
    sub: "Four layers of the evaluation stack are crowded. The fourth — the artifact a stranger can re-derive without trusting the tool — is where this sits. What follows is the doctrine, how to read a bundle, and what reproducibility means here, stated precisely.",
    cross: [
      { label: "bundle format v1", href: "/format/", icon: "format" },
      { label: "failure-mode matrix", href: "/matrix/", icon: "matrix" },
      { label: "harness spec", href: "/harness/", icon: "harness" },
    ],
  },
  format: {
    title: "The bundle format, v1 and v1.1.",
    kicker: "specification",
    sub: "The record schema, the hash chain, the gap codes and the verify procedure: what a bundle is allowed to contain, and what a reader is entitled to assume about it.",
    cross: [
      { label: "method note", href: "/method/", icon: "method" },
      { label: "harness spec", href: "/harness/", icon: "harness" },
      { label: "the runs", href: "/runs/", icon: "book" },
    ],
  },
  matrix: {
    title: "Four failure modes of decision-time evidence.",
    kicker: "matrix",
    sub: "Five columns and two test classes per row: the research document, and the executable family that stands behind each cell of it.",
    cross: [
      { label: "harness spec", href: "/harness/", icon: "harness" },
      { label: "method note", href: "/method/", icon: "method" },
      { label: "families", href: "/families/", icon: "book" },
    ],
  },
  harness: {
    title: "The harness, as implemented.",
    kicker: "specification",
    sub: "The T0–T6 phases as they exist in code, tests A–D, the binding field map, and the standing named gaps — written down rather than left to be discovered.",
    cross: [
      { label: "failure-mode matrix", href: "/matrix/", icon: "matrix" },
      { label: "bundle format v1", href: "/format/", icon: "format" },
      { label: "the runs", href: "/runs/", icon: "book" },
    ],
  },
};

export function DocPage({ docKey }: { docKey: DocKey }) {
  const source = readDoc(docKey);
  const meta = TITLES[docKey];
  const toc = outline(source);

  return (
    <div className="stack">
      <PageHead
        crumb={{ label: "index", href: "/" }}
        eyebrow={meta.kicker}
        title={meta.title}
        dek={meta.sub}
        facts={[
          { label: "sections", value: toc.length },
          { label: "status", value: "v0.3.0" },
          { label: "verified by", value: "tieout verify" },
        ]}
        actions={
          <>
            {meta.cross.map((c) => (
              <Link key={c.href} className="btn" href={c.href}>
                <Icon name={c.icon} size={15} /> {c.label}
              </Link>
            ))}
          </>
        }
      />

      <div className="article-layout">
        <article className="article-body">
          <div className="card article-card">
            {source ? (
              <Markdown source={source} />
            ) : (
              <p className="bad-text">documents not found at build time (../docs)</p>
            )}
          </div>
        </article>

        <aside className="toc" aria-label="on this page">
          <p className="toc-head mono">on this page</p>
          <ol className="toc-list">
            {toc.map((h) => (
              <li key={h.id}>
                <a href={`#${h.id}`}>{h.text}</a>
              </li>
            ))}
          </ol>
          <div className="toc-foot">
            <p className="mono small dim">{docKey}.md</p>
            <Link className="toc-top mono small" href="#main">
              back to top <Icon name="arrow" size={12} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
