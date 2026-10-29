import type { ReactNode } from "react";
import Link from "next/link";

/**
 * The masthead every inner page shares: an optional crumb rail, an
 * eyebrow, a title, a dek, an optional row of facts, and an optional
 * action row. Keeping it in one component is what makes /runs, /method
 * and /families line up on the same left edge.
 */
export function PageHead({
  crumb,
  eyebrow,
  title,
  dek,
  facts,
  actions,
}: {
  crumb?: { label: string; href: string };
  eyebrow?: string;
  title: ReactNode;
  dek?: ReactNode;
  facts?: { label: string; value: ReactNode }[];
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      {crumb ? (
        <nav className="crumbs mono small" aria-label="breadcrumb">
          <Link href={crumb.href}>{crumb.label}</Link>
          <span aria-hidden="true">/</span>
          <span className="dim">here</span>
        </nav>
      ) : null}
      <div className="page-head-grid">
        <div className="page-head-copy">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="page-title">{title}</h1>
          {dek ? <p className="page-dek">{dek}</p> : null}
        </div>
        {facts && facts.length ? (
          <dl className="fact-list">
            {facts.map((f) => (
              <div className="fact" key={f.label}>
                <dt>{f.label}</dt>
                <dd className="mono">{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
      {actions ? <div className="hero-actions page-head-actions">{actions}</div> : null}
    </header>
  );
}
