import fs from "node:fs";
import path from "node:path";

/**
 * Build-time access to the committed evidence. Runs live at the repo
 * root (not under web/), because the same directory is what the
 * FastAPI service serves and what CI verifies; the export reads them
 * once, at build time, to enumerate the routes.
 *
 * Next is started with web/ as the working directory, so the repo root
 * is its parent. The second candidate keeps `next dev` working if the
 * directory is ever restructured.
 */
export function runsRoot(): string {
  const candidates = [
    path.join(process.cwd(), "..", "runs"),
    path.join(process.cwd(), "runs"),
  ];
  return candidates.find((c) => fs.existsSync(c)) ?? candidates[0];
}

function bundlesUnder(dir: string, root: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...bundlesUnder(full, root));
    else if (entry.name === "bundle.jsonl") {
      out.push(path.relative(root, dir).split(path.sep).join("/"));
    }
  }
  return out;
}

/** Run ids are paths relative to runs/, e.g. "demo" or "demo-stability/a". */
export function listRunIds(): string[] {
  const root = runsRoot();
  if (!fs.existsSync(root)) return [];
  return bundlesUnder(root, root).sort();
}
