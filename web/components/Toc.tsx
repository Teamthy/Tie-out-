"use client";

import { useEffect, useState } from "react";

import { Icon } from "./Icon";

/**
 * The article outline, with a scroll position. The page still ships as
 * static HTML: without JavaScript every link works; with it, the entry
 * you are reading is marked and the hairline at the top fills as you go.
 */
export function Toc({
  items,
  meta,
}: {
  items: { id: string; text: string }[];
  meta: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);

    if (headings.length) {
      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          if (visible[0]) setActive(visible[0].target.id);
        },
        { rootMargin: "-88px 0px -60% 0px", threshold: 0 }
      );
      headings.forEach((h) => observer.observe(h));
      return () => observer.disconnect();
    }
  }, [items]);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <>
      <div
        className="read-progress"
        aria-hidden="true"
        style={{ transform: `scaleX(${progress.toFixed(3)})` }}
      />
      <aside className="toc" aria-label="on this page">
        <p className="toc-head mono">on this page</p>
        <ol className="toc-list">
          {items.map((h) => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                className={h.id === active ? "toc-active" : undefined}
                aria-current={h.id === active ? "true" : undefined}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ol>
        <div className="toc-foot">
          <p className="mono small dim">{meta}</p>
          <a className="toc-top mono small" href="#main">
            back to top <Icon name="arrow" size={12} />
          </a>
        </div>
      </aside>
    </>
  );
}
