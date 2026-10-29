import fs from "node:fs";
import path from "node:path";

import { listRunIds, runsRoot } from "./runs";
import type { FamilyStats } from "./types";

export interface RunCard {
  id: string;
  run_id: string;
  suite: string;
  format: string;
  events: number;
  controls: number;
  pass: number;
  fail: number;
  rate: number | null;
  ci: [number, number] | null;
}

function firstLine(dir: string): Record<string, any> | null {
  const file = path.join(dir, "bundle.jsonl");
  if (!fs.existsSync(file)) return null;
  const line = fs.readFileSync(file, "utf8").split("\n", 1)[0];
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

/**
 * Manifests, read at build time. The landing page and the notes index
 * quote the committed bundles directly, so the numbers on the page are
 * the numbers in the files, not a fetch that can 404.
 */
export function runCards(): RunCard[] {
  const root = runsRoot();
  return listRunIds()
    .map((id) => {
      const manifest = firstLine(path.join(root, ...id.split("/")));
      if (!manifest) return null;
      const stats: FamilyStats[] = manifest.statistics ?? [];
      const s = stats[0];
      const events: number = manifest.event_count ?? 0;
      const pass = s ? s.pass : 0;
      const fail = s ? s.fail : 0;
      return {
        id,
        run_id: manifest.run_id,
        suite: (manifest.provenance?.suite ?? "?").toUpperCase(),
        format: manifest.bundle_format,
        events,
        controls: manifest.control_count ?? 0,
        pass,
        fail,
        rate: s ? s.pass_rate : null,
        ci: s ? (s.ci95 as [number, number]) : null,
      };
    })
    .filter((r): r is RunCard => r !== null);
}

export function headline(): { events: number; controls: number; records: number } {
  const cards = runCards();
  const f1 = cards.find((c) => c.id === "demo");
  return {
    events: f1?.events ?? 0,
    controls: f1?.controls ?? 0,
    records: (f1?.events ?? 0) + (f1?.controls ?? 0),
  };
}

export interface Specimen {
  id: string;
  format: string;
  run_id: string;
  events: number;
  controls: number;
  judge: string;
  policy: string;
  tail: string;
}

function secondLine(dir: string): Record<string, any> | null {
  const file = path.join(dir, "bundle.jsonl");
  if (!fs.existsSync(file)) return null;
  const line = fs.readFileSync(file, "utf8").split("\n")[1];
  if (!line) return null;
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

/**
 * A few fields from the head of runs/demo, for the hero panel. This is
 * the argument of the whole site in one object: the numbers a reader
 * sees first are read out of the committed file at build time.
 */
export function specimen(): Specimen | null {
  const dir = path.join(runsRoot(), "demo");
  const manifest = firstLine(dir);
  const event = secondLine(dir);
  if (!manifest || !event) return null;
  return {
    id: "runs/demo/bundle.jsonl",
    format: manifest.bundle_format,
    run_id: manifest.run_id,
    events: manifest.event_count,
    controls: manifest.control_count,
    judge: event.judge,
    policy: event.policy_version,
    tail: manifest.tail_event_hash,
  };
}

export interface RunRow {
  id: string;
  agent: string;
  started: string;
  format: string;
  suite: string;
  events: number;
  controls: number;
  fp: number;
  fn: number;
  pass: number;
  fail: number;
  undetermined: number;
  rate: number | null;
  ci: [number, number] | null;
}

/** The whole bundle, read at build time. Small files; four of them. */
function readBundle(dir: string): Record<string, any>[] {
  const file = path.join(dir, "bundle.jsonl");
  if (!fs.existsSync(file)) return [];
  const out: Record<string, any>[] = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      // a bundle with an unparsable line is a build problem, not a page
      // problem: verify is the thing that reports it, so skip here.
    }
  }
  return out;
}

/**
 * One row per committed run, counted from the events themselves rather
 * than from a stored summary, so a v1.0 bundle (no `statistics` block)
 * still gets honest counts. The rate and interval are only shown when
 * the bundle stores them: a rate recomputed in the browser would be a
 * second implementation of the statistic, and this site does not have
 * one.
 */
export function runRows(): RunRow[] {
  const root = runsRoot();
  return listRunIds().map((id) => {
    const dir = path.join(root, ...id.split("/"));
    const records = readBundle(dir);
    const manifest = records.find((r) => r.type === "manifest") ?? {};
    const events = records.filter((r) => r.type === "event");
    const controls = records.filter((r) => r.type === "control");
    const stats: FamilyStats[] = manifest.statistics ?? [];
    const s = stats[0];
    const pass = events.filter((e) => e.decision === "pass").length;
    const fail = events.filter((e) => e.decision === "fail").length;
    const undetermined = events.filter((e) => e.decision === "undetermined").length;
    const first = events[0] ?? {};
    return {
      id,
      agent: (first.target_endpoint ?? manifest.provenance?.target ?? "?").replace(/\s*\(.*\)$/, ""),
      started: (first.started_at ?? manifest.provenance?.started_at ?? "").replace("T", " ").replace("Z", ""),
      format: manifest.bundle_format ?? "?",
      suite: (manifest.provenance?.suite ?? first.family ?? "?").toUpperCase(),
      events: events.length,
      controls: controls.length,
      fp: manifest.controls_fp ?? 0,
      fn: manifest.controls_fn ?? 0,
      pass,
      fail,
      undetermined,
      rate: s ? s.pass_rate : null,
      ci: s ? (s.ci95 as [number, number]) : null,
    };
  });
}
