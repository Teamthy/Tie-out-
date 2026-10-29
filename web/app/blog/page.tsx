import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "../../components/Icon";
import { DISCIPLINES, POSTS, formatDate, postsByDiscipline } from "../../lib/posts";

export const metadata: Metadata = {
  title: "notes",
  description:
    "Twelve articles on AI red teaming, security, research engineering, evaluation and software engineering, each verified against committed artifacts.",
};

export default function BlogIndex() {
  const ordered = [...POSTS].sort((a, b) => a.order - b.order);
  const featured = ordered[0];
  const rest = ordered.slice(1);

  return (
    <div className="stack">
      <header className="page-head">
        <p className="eyebrow">notes from the harness</p>
        <h1 className="page-title">
          Twelve pieces, five disciplines,
          <br />
          <span className="dim">every number traceable.</span>
        </h1>
        <p className="page-dek">
          Nothing here is written from memory. A number in these articles is a value read out
          of a committed bundle, a result printed by a committed test or <code>tieout
          selftest</code>, or a cited public artifact — and each piece ends with the list it was
          verified against.
        </p>
        <dl className="stat-row stat-row-inline">
          <div className="stat-cell">
            <dt>pieces</dt>
            <dd>{POSTS.length}</dd>
          </div>
          <div className="stat-cell">
            <dt>disciplines</dt>
            <dd>{DISCIPLINES.length}</dd>
          </div>
          <div className="stat-cell">
            <dt>sources cited</dt>
            <dd>{POSTS.reduce((n, p) => n + p.sources.length, 0)}</dd>
          </div>
        </dl>
      </header>

      <section className="section">
        <header className="section-head">
          <span className="section-num">00</span>
          <h2 className="section-title">start here</h2>
          <span className="section-note">the piece the others assume</span>
        </header>
        <Link href={`/blog/${featured.slug}/`} className="feature">
          <div className="feature-main">
            <div className="card-top">
              <span className="tag">{featured.discipline}</span>
              <span className="card-index mono">
                {String(featured.order).padStart(2, "0")} / {String(POSTS.length).padStart(2, "0")}
              </span>
            </div>
            <h3 className="feature-title">{featured.title}</h3>
            <p className="feature-dek">{featured.dek}</p>
            <span className="card-foot mono">
              {formatDate(featured.date)} · {featured.minutes} min · {featured.sources.length} sources
              <Icon name="arrow" size={15} />
            </span>
          </div>
          <div className="feature-side" aria-hidden="true">
            <span className="feature-quote">
              the report is a claim.
              <br />
              the bundle is a record.
            </span>
          </div>
        </Link>
      </section>

      {DISCIPLINES.map((discipline) => {
        const posts = postsByDiscipline(discipline).filter((p) => p.slug !== featured.slug);
        if (posts.length === 0) return null;
        return (
          <section className="section" key={discipline} id={discipline.replace(/\s+/g, "-")}>
            <header className="section-head">
              <h2 className="section-title">{discipline}</h2>
              <span className="section-note">
                {posts.length} {posts.length === 1 ? "piece" : "pieces"}
              </span>
            </header>
            <div className="grid grid-2">
              {posts.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}/`} className="card card-note">
                  <div className="card-top">
                    <span className="card-index mono">{String(p.order).padStart(2, "0")}</span>
                    <span className="mono small dim">{p.minutes} min</span>
                  </div>
                  <h3 className="card-title">{p.title}</h3>
                  <p className="card-line">{p.dek}</p>
                  <span className="card-foot mono">
                    {formatDate(p.date)} · {p.sources.length} sources
                    <Icon name="arrow" size={14} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="section">
        <div className="note-rule">
          <div>
            <h2 className="section-title">the rule</h2>
            <p className="prose-p">
              A claim is one of three things: a value read out of a committed bundle or
              manifest, a result printed by a committed test or <code>tieout selftest</code>, or
              a cited public artifact. Anything that could not be traced that way is not written
              as a finding. The mechanical half is enforced at build time by
              <code>scripts/check_export.py</code>, which fails the build if an article is
              missing its sources.
            </p>
          </div>
          <div className="note-rule-actions">
            <Link className="btn" href="/runs/">
              <Icon name="runs" size={15} /> browse the bundles
            </Link>
            <Link className="btn btn-ghost" href="/format/">
              the record format
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
