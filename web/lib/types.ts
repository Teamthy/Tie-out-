export interface CheckStats {
  check: string;
  n: number;
  pass: number;
  fail: number;
  undetermined: number;
}

export interface FamilyStats {
  family: string;
  n: number;
  pass: number;
  fail: number;
  undetermined: number;
  pass_rate: number;
  ci95: [number, number];
  checks: CheckStats[];
}

export interface RunSummary {
  id: string;
  run_id: string;
  agent: string;
  suite: string;
  started_at: string;
  bundle_format: string;
  seed: number;
  events: number;
  controls: number;
  verdicts: Record<string, number>;
  controls_fp: number;
  controls_fn: number;
  gaps: number;
  statistics: FamilyStats[];
}

export interface VerdictEvent {
  type: string;
  event_id: string;
  item_id: string;
  family: string;
  check: string;
  policy_version: string;
  action: string;
  decision: "pass" | "fail" | "undetermined";
  judge: string;
  judge_endpoint: string;
  target_endpoint: string;
  effect_ref: string;
  raw_input: string;
  raw_output: string;
  detector_fired: boolean | null;
  why: string;
  started_at: string;
  finished_at: string;
  prev_hash: string;
  record_hash: string;
}

export interface ControlEvent {
  type: string;
  control_id: string;
  family: string;
  check: string;
  kind: "known-hold" | "known-broken";
  crafted_raw: string;
  detector: string;
  expected_fire: boolean;
  fired: boolean | null;
  verdict: "pass" | "fail";
  note: string;
  prev_hash: string;
  record_hash: string;
}

export interface NamedGap {
  type: string;
  gap_id: string;
  code: string;
  scope: string;
  reason: string;
}

export interface Provenance {
  harness_version: string;
  harness_git: string;
  suite: string;
  family_policy_versions: Record<string, string>;
  agent: string;
  model: string | null;
  model_version: string | null;
  dataset_hash: string;
  env: Record<string, string>;
  decoding: Record<string, unknown>;
  seed: number;
  started_at: string;
  finished_at: string;
  packages?: Record<string, string> | null;
  packages_hash?: string | null;
}

export interface JudgeAudit {
  type: string;
  judge: string;
  anchors_total: number;
  anchors_agreement: number;
  perturbation_samples: number;
  perturbation_flips: Record<string, number>;
  disagreement_rate: number;
  self_preference_clean: boolean;
  details: Record<string, unknown>[];
}

export interface Manifest {
  type: string;
  bundle_format: string;
  run_id: string;
  provenance: Provenance;
  expected_item_ids: string[];
  emitted_item_ids: string[];
  event_count: number;
  control_count: number;
  tail_event_hash: string;
  controls_fp: number;
  controls_fn: number;
  statistics?: FamilyStats[] | null;
}

export interface Bundle {
  id: string;
  manifest: Manifest;
  events: VerdictEvent[];
  controls: ControlEvent[];
  judge_audit: JudgeAudit | null;
  gaps: NamedGap[];
}

export interface VerifyResult {
  lines: string[];
  gaps: NamedGap[];
  verdict: "PASS" | "FAIL";
  ok: boolean;
}

export interface DiffRow {
  item_id: string;
  family: string;
  check: string;
  action: string;
  decision_a: string;
  decision_b: string;
  flipped: boolean;
  transcript_drift: boolean;
}

export interface DiffRate {
  pass: number;
  n: number;
  pass_rate: number;
  ci95: [number, number];
}

export interface DiffResult {
  run_a: string;
  run_b: string;
  agent_a: string;
  agent_b: string;
  families: string[];
  aligned: number;
  only_in_a: string[];
  only_in_b: string[];
  verdict_flips: number;
  transcript_drift: number;
  stability: number;
  rate_a: DiffRate;
  rate_b: DiffRate;
  rows: DiffRow[];
}

export interface FamilyDetail {
  family_id: string;
  name: string;
  policy_label: string;
  policy_version: string;
  items: number;
  controls: number;
  item_ids: string[];
  items_detail: { id: string; check: string; action: string }[];
}

export interface AsiCrosswalkRow {
  asi: string;
  title: string;
  families: string[];
  status: string;
}

export interface AsiF1Row {
  check: string;
  name: string;
  proposed_asi: string;
  status: string;
}

export interface AsiData {
  crosswalk: AsiCrosswalkRow[];
  f1_proposed: AsiF1Row[];
  f2_proposed: AsiF1Row[];
}

export type DocKey = "method" | "format" | "matrix" | "harness";
