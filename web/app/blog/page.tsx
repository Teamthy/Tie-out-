import type { Metadata } from "next";
import { POSTS, DISCIPLINES, postsByDiscipline } from "../../lib/posts";

export const metadata: Metadata = {
  title: "notes",
  description:
    "Twelve articles on AI red teaming, security, research engineering, evaluation and software engineering, each verified against committed artifacts.",
};

export default function BlogIndex() {
  return (
    <section>
      <div className="run-head">
        <h1>Notes and articles</h1>
      </div>
      <p className="sub">
        twelve pieces across five disciplines. every number traces to a committed bundle or
        manifest field, a committed test or selftest output, or a cited public artifact, and each
        article ends with the list it was verified against.
      </p>

      {DISCIPLINES.map((discipline) => {
        const posts = postsByDiscipline(discipline);
        if (posts.length === 0) return null;
        return (
          <div key={discipline} className="card">
            <h2>
              {discipline} <span className="pill">{posts.length} articles</span>
            </h2>
            <ul className="post-list">
              {posts.map((p) => (
                <li key={p.slug} className="post-row">
                  <span className="post-order mono">{String(p.order).padStart(2, "0")}</span>
                  <div>
                    <a className="post-title" href={`/blog/${p.slug}/`}>
                      {p.title}
                    </a>
                    <p className="post-dek">{p.dek}</p>
                    <p className="post-meta mono">
                      {p.date} · {p.minutes} min · {p.sources.length} sources
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <div className="card">
        <h2>
          the rule <span className="pill">what verified means here</span>
        </h2>
        <p className="doc-p" style={{ marginBottom: 0 }}>
          a claim in these articles is one of three things: a value read out of a committed bundle
          or manifest, a result printed by a committed test or
          <code className="md-code">tieout selftest</code>, or a cited public artifact. anything
          that could not be traced that way is not written as a finding.{" "}
          <a href="/runs/">The bundles are here</a> and each article names its sources at the end.
        </p>
      </div>

      <p className="sub mono" style={{ marginBottom: 0 }}>
        {POSTS.length} articles · newest last · start with{" "}
        <a href="/blog/verify-dont-trust/">verify, don&apos;t trust</a>
      </p>
    </section>
  );
}
