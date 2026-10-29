import type { Bundle, RunSummary, VerifyResult } from "./types";

async function get<T>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json() as Promise<T>;
}

export function getRuns(): Promise<RunSummary[]> {
  return get<RunSummary[]>("/api/runs");
}

export function getBundle(id: string): Promise<Bundle> {
  return get<Bundle>(`/api/runs/${encodeURIComponent(id)}`);
}

export function getDiff(a: string, b: string): Promise<import("./types").DiffResult> {
  const qs = `a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`;
  return get<import("./types").DiffResult>(`/api/diff?${qs}`);
}

export function verifyRun(id: string): Promise<VerifyResult> {
  return fetch(`/api/runs/${encodeURIComponent(id)}/verify`, { method: "POST" }).then(
    async (r) => {
      if (!r.ok) throw new Error(`verify -> ${r.status}`);
      return r.json() as Promise<VerifyResult>;
    }
  );
}

import type { AsiData, DocKey, FamilyDetail } from "./types";

export function getDocs(): Promise<Record<DocKey, string>> {
  return get<Record<DocKey, string>>("/api/docs");
}

export function getFamiliesDetail(): Promise<FamilyDetail[]> {
  return get<FamilyDetail[]>("/api/families");
}

export function getAsi(): Promise<AsiData> {
  return get<AsiData>("/api/asi");
}
