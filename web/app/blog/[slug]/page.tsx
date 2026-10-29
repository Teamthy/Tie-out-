import type { Metadata } from "next";
import Link from "next/link";
import { Markdown } from "../../../components/Markdown";
import { Byline } from "../../../components/Byline";
import { LinkedInButton, AUTHOR } from "../../../components/LinkedIn";
import { POSTS, getPost, formatDate } from "../../../lib/posts";
import { readPost } from "../../../lib/post-content";

/**
 * One static page per article. The body is a markdown file read at
 * build time, so a post is a build artifact like every other page:
 * the only dynamic call anywhere on the site is the verify button on a
 * run page.
 */
export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug);
  if (!post) return { title: "notes" };
  return {
    title: post.title,
    description: post.dek,
    authors: [{ name: AUTHOR }],
    openGraph: {
      title: post.title,
      description: post.dek,
      type: "article",
      publishedTime: post.date,
    },
  };
}

export default function Article({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) {
    return (
      <section>
        <p className="sub">no such article.</p>
        <Link className="btn" href="/blog/">
          all articles
        </Link>
      </section>
    );
  }

  const body = readPost(post.slug);
  const ordered = [...POSTS].sort((a, b) => a.order - b.order);
  const idx = ordered.findIndex((p) => p.slug === post.slug);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;

  return (
    <section>
      <p>
        <Link className="back" href="/blog/">
          ← all articles
        </Link>
      </p>

      <article>
        <header className="article-head">
          <p className="article-kicker mono">
            <span className="pill">{post.discipline}</span>{" "}
            <span className="article-number">
              {String(post.order).padStart(2, "0")} / {String(POSTS.length).padStart(2, "0")}
            </span>
          </p>
          <h1 className="article-title">{post.title}</h1>
          <p className="article-dek">{post.dek}</p>
          <Byline date={formatDate(post.date)} minutes={post.minutes} discipline={post.discipline} />
        </header>

        <div className="card article-body">
          <Markdown source={body} />
        </div>

        <div className="card verified">
          <h2>
            verified against <span className="pill">{post.sources.length} sources</span>
          </h2>
          <ul className="verified-list">
            {post.sources.map((s) => (
              <li key={s} className="mono small">
                {s}
              </li>
            ))}
          </ul>
          <p className="sub" style={{ marginBottom: 0 }}>
            each entry is reproducible from this repository:{" "}
            <Link href="/runs/">browse the bundles</Link> or run the commands named in the
            article. questions, corrections and disagreements are welcome on{" "}
            <a href="https://www.linkedin.com/in/olusanya-timothy" target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            .
          </p>
        </div>
      </article>

      <div className="article-nav">
        {prev ? (
          <a className="article-nav-link" href={`/blog/${prev.slug}/`}>
            <span className="mono small">← {String(prev.order).padStart(2, "0")}</span>
            <span>{prev.title}</span>
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a className="article-nav-link right" href={`/blog/${next.slug}/`}>
            <span className="mono small">{String(next.order).padStart(2, "0")} →</span>
            <span>{next.title}</span>
          </a>
        ) : (
          <span />
        )}
      </div>

      <div className="card">
        <h2>
          the author <span className="pill">independent practice</span>
        </h2>
        <p className="doc-p">
          {AUTHOR} builds tieout as the public artifact of an independent AI security research
          practice: evidence-grade agent evaluation, red team runs, and records a stranger can
          re-derive.
        </p>
        <div className="hero-actions" style={{ marginTop: 12 }}>
          <LinkedInButton label="connect on linkedin" />
          <Link className="btn" href="/blog/">
            more articles
          </Link>
        </div>
      </div>
    </section>
  );
}
