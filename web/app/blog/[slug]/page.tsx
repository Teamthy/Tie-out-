import type { Metadata } from "next";
import Link from "next/link";

import { Markdown, outline } from "../../../components/Markdown";
import { Byline } from "../../../components/Byline";
import { Icon } from "../../../components/Icon";
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
  const toc = outline(body);
  const ordered = [...POSTS].sort((a, b) => a.order - b.order);
  const idx = ordered.findIndex((p) => p.slug === post.slug);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;

  return (
    <div className="stack">
      <nav className="crumbs mono small" aria-label="breadcrumb">
        <Link href="/blog/">notes</Link>
        <span aria-hidden="true">/</span>
        <span>{post.discipline}</span>
        <span aria-hidden="true">/</span>
        <span className="dim">
          {String(post.order).padStart(2, "0")} of {String(POSTS.length).padStart(2, "0")}
        </span>
      </nav>

      <header className="article-head">
        <p className="eyebrow">{post.discipline}</p>
        <h1 className="article-title">{post.title}</h1>
        <p className="article-dek">{post.dek}</p>
        <Byline date={formatDate(post.date)} minutes={post.minutes} discipline={post.discipline} />
      </header>

      <div className="article-layout">
        <article className="article-body">
          <Markdown source={body} />

          <aside className="verified">
            <div className="verified-head">
              <Icon name="check" size={16} />
              <h2 className="section-title">the receipts</h2>
              <span className="section-note">{post.sources.length} sources</span>
            </div>
            <p className="verified-intro">
              The line above the panel is the article&apos;s own claim. These are the artifacts
              behind it — every one of them is in this repository, at the commit that published
              the piece.
            </p>
            <ul className="verified-list">
              {post.sources.map((s) => (
                <li key={s} className="mono small">
                  {s}
                </li>
              ))}
            </ul>
            <div className="verified-foot">
              <code className="verified-cmd">uv run tieout verify runs/demo</code>
              <Link className="inline-link" href="/runs/">
                browse the bundles
              </Link>
            </div>
          </aside>

          <aside className="author-card">
            <span className="author-avatar" aria-hidden="true">TO</span>
            <div>
              <p className="author-name">{AUTHOR}</p>
              <p className="author-line">
                Builds tieout as the public artifact of an independent AI security research
                practice: evidence-grade agent evaluation, red team runs, and records a stranger
                can re-derive.
              </p>
              <div className="author-actions">
                <LinkedInButton label="linkedin" />
                <Link className="btn btn-ghost" href="/blog/">
                  more notes
                </Link>
              </div>
            </div>
          </aside>
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
            <p className="mono small dim">
              {formatDate(post.date)} · {post.minutes} min read
            </p>
            <Link className="toc-top mono small" href="#main">
              back to top <Icon name="arrow" size={12} />
            </Link>
          </div>
        </aside>
      </div>

      <nav className="article-nav" aria-label="articles">
        {prev ? (
          <Link className="article-nav-link" href={`/blog/${prev.slug}/`}>
            <span className="mono small dim">← {String(prev.order).padStart(2, "0")}</span>
            <span className="article-nav-title">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link className="article-nav-link right" href={`/blog/${next.slug}/`}>
            <span className="mono small dim">{String(next.order).padStart(2, "0")} →</span>
            <span className="article-nav-title">{next.title}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
