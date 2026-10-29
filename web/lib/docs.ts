import fs from "node:fs";
import path from "node:path";

export const DOCS = {
  method: "method-note.md",
  format: "bundle-format-v1.md",
  matrix: "failure-mode-matrix.md",
  harness: "harness-spec.md",
} as const;

export type DocKey = keyof typeof DOCS;

/**
 * The specs are single-sourced: docs/*.md is what the CLI ships, what
 * the API serves at /api/docs, and what the static export renders at
 * build time. Read once per build, never at request time.
 */
export function readDoc(key: DocKey): string {
  const candidates = [
    path.join(process.cwd(), "..", "docs", DOCS[key]),
    path.join(process.cwd(), "docs", DOCS[key]),
  ];
  const found = candidates.find((c) => fs.existsSync(c));
  return found ? fs.readFileSync(found, "utf-8") : "";
}
