const LABELS: Record<string, string> = {
  pass: "pass",
  fail: "fail",
  undetermined: "n/a",
  PASS: "pass",
  FAIL: "fail",
};

export function VerdictBadge({ v }: { v: string }) {
  const cls = v === "pass" ? "b-pass" : v === "fail" ? "b-fail" : "b-und";
  return <span className={`badge ${cls}`}>{LABELS[v] ?? v}</span>;
}
