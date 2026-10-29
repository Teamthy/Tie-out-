import fs from "node:fs";
import path from "node:path";

/**
 * Article bodies are markdown files under web/content/blog/. They are
 * read at build time only: the export ships the rendered HTML, so a
 * post is exactly as available as the rest of the static site.
 */
export function readPost(slug: string): string {
  const candidates = [
    path.join(process.cwd(), "content", "blog", `${slug}.md`),
    path.join(process.cwd(), "web", "content", "blog", `${slug}.md`),
  ];
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found) throw new Error(`missing article body for ${slug}`);
  return fs.readFileSync(found, "utf-8").trim();
}
