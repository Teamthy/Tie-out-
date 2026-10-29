"use client";

import type { ReactNode } from "react";

/**
 * Minimal markdown renderer for the project's own docs: headings,
 * paragraphs, bullet/numbered lists, tables, fenced code, inline code,
 * bold, links. Deliberately small: the docs are written for this
 * renderer and the CLI.
 */

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const [full, code, bold, linkText, linkHref] = m;
    const key = `${keyBase}-${i++}`;
    if (code) out.push(<code key={key} className="md-code">{code.slice(1, -1)}</code>);
    else if (bold) out.push(<strong key={key}>{bold.slice(2, -2)}</strong>);
    else if (linkText && linkHref)
      out.push(
        <a key={key} href={linkHref} target="_blank" rel="noreferrer">
          {linkText}
        </a>
      );
    else out.push(full);
    last = m.index + full.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

interface Table {
  header: string[];
  rows: string[][];
}

type Block =
  | { kind: "h1" | "h2" | "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "code"; text: string }
  | { kind: "table"; table: Table };

function parse(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ kind: "code", text: buf.join("\n") });
      continue;
    }
    if (line.startsWith("|")) {
      const tbl: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i]
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) tbl.push(cells);
        i++;
      }
      if (tbl.length)
        blocks.push({
          kind: "table",
          table: { header: tbl[0], rows: tbl.slice(1) },
        });
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      blocks.push({ kind: `h${h[1].length}` as "h1" | "h2" | "h3", text: h[2] });
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }
    const buf = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("|") &&
      !lines[i].startsWith("```") &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ kind: "p", text: buf.join(" ") });
  }
  return blocks;
}

export function Markdown({ source }: { source: string }) {
  const blocks = parse(source);
  return (
    <article className="doc">
      {blocks.map((b, i) => {
        const key = `b${i}`;
        switch (b.kind) {
          case "h1":
            return (
              <h1 key={key} className="doc-h1">
                {inline(b.text, key)}
              </h1>
            );
          case "h2":
            return (
              <h2 key={key} className="doc-h2">
                {inline(b.text, key)}
              </h2>
            );
          case "h3":
            return (
              <h3 key={key} className="doc-h3">
                {inline(b.text, key)}
              </h3>
            );
          case "code":
            return (
              <pre key={key} className="code">
                {b.text}
              </pre>
            );
          case "table":
            return (
              <div key={key} className="doc-table-wrap">
                <table className="doc-table">
                  <thead>
                    <tr>
                      {b.table.header.map((c, j) => (
                        <th key={j}>{inline(c, `${key}-h${j}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.table.rows.map((r, j) => (
                      <tr key={j}>
                        {r.map((c, k) => (
                          <td key={k}>{inline(c, `${key}-r${j}c${k}`)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "ul":
            return (
              <ul key={key} className="doc-ul">
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it, `${key}-${j}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="doc-ol">
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it, `${key}-${j}`)}</li>
                ))}
              </ol>
            );
          default:
            return (
              <p key={key} className="doc-p">
                {inline(b.text, key)}
              </p>
            );
        }
      })}
    </article>
  );
}
