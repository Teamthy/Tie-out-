"use client";

import { useEffect, useState } from "react";
import { getDiff, getRuns } from "../lib/api";
import type { DiffResult, RunSummary } from "../lib/types";
import { VerdictBadge } from "./Badge";

function pct(x: number): string {
  return (100 * x).toFixed(1) + "%";
}

function ci(x: [number, number]): string {
  return `[${pct(x[0])}, ${pct(x[1])}]`;
}

/** The first two runs that cover the same suite, in list order. */
function sameSuitePair(runs: RunSummary[]): [RunSummary, RunSummary] | null {
  for (let i = 0; i < runs.length; i += 1) {
    for (let j = i + 1; j < runs.length; j += 1) {
      if (runs[i].suite === runs[j].suite) return [runs[i], runs[j]];
    }
  }
  return null;
}

export function Compare() {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getRuns()
      .then((r) => {
        setRuns(r);
        if (r.length >= 2) {
          // default to a pair the diff can align: two runs of the same
          // suite. two different families are a 400, not a diff.
          const pair = sameSuitePair(r);
          setA(pair ? pair[0].id : r[0].id);
          setB(pair ? pair[1].id : r[1].id);
        } else if (r.length === 1) {
          setA(r[0].id);
        }
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!a || !b || a === b) {
      setDiff(null);
      return;
    }
    setBusy(true);
    setError(null);
    getDiff(a, b)
      .then(setDiff)
      .catch((e) => {
        setDiff(null);
        setError(String(e));
      })
      .finally(() => setBusy(false));
  }, [a, b]);

  if (error && !runs) return <div className="empty">could not load runs: {error}</div>;
  if (!runs) return <div className="empty">loading runs…</div>;
  if (runs.length < 2)
    return <div className="empty">compare needs at least two runs under the runs directory</div>;

  const flipped = diff ? diff.rows.filter((r) => r.flipped) : [];

  return (
    <section>
      <p>
        <a className="back" href="/">
          ← home
        </a>
      </p>
      <div className="run-head">
        <h1>Cross-run stability</h1>
      </div>
      <p className="sub">
        the same suite run twice is a claim about stability. the diff aligns the two bundles by
        pre-assigned id and separates two things: <strong>verdict drift</strong> (the decision
        changed) and <strong>transcript drift</strong> (the words changed, the verdict did not).
        a healthy deterministic harness shows drift without flips; a live model shows both, and
        the table says where.
      </p>

      <div className="card">
        <div className="compare-pick">
          <label className="pick">
            <span className="pick-label">run a</span>
            <select value={a} onChange={(e) => setA(e.target.value)}>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} · {r.suite} · seed {r.seed} · {r.events} events
                </option>
              ))}
            </select>
          </label>
          <span className="compare-vs">vs</span>
          <label className="pick">
            <span className="pick-label">run b</span>
            <select value={b} onChange={(e) => setB(e.target.value)}>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} · {r.suite} · seed {r.seed} · {r.events} events
                </option>
              ))}
            </select>
          </label>
        </div>

        {a === b && a !== "" && <p className="sub">pick two different runs</p>}
        {busy && <p className="sub">computing diff…</p>}
        {error && a !== b && <p className="bad-text">{error}</p>}

        {diff && (
          <>
            <div className="stat-strip">
              <div className="stat">
                <span className="stat-num mono">
                  {(100 * diff.stability).toFixed(1)}%
                </span>
                <span className="stat-label">verdict stability</span>
              </div>
              <div className="stat">
                <span className="stat-num mono">{diff.aligned}</span>
                <span className="stat-label">items aligned by id</span>
              </div>
              <div className={diff.verdict_flips ? "stat bad" : "stat"}>
                <span className="stat-num mono">{diff.verdict_flips}</span>
                <span className="stat-label">verdict flips</span>
              </div>
              <div className="stat">
                <span className="stat-num mono">{diff.transcript_drift}</span>
                <span className="stat-label">transcripts drifted</span>
              </div>
            </div>
            <div className="rate-row mono small">
              <span>
                a: {diff.rate_a.pass}/{diff.rate_a.n} pass = {pct(diff.rate_a.pass_rate)} (95% CI{" "}
                {ci(diff.rate_a.ci95)})
              </span>
              <span>
                b: {diff.rate_b.pass}/{diff.rate_b.n} pass = {pct(diff.rate_b.pass_rate)} (95% CI{" "}
                {ci(diff.rate_b.ci95)})
              </span>
              <span className="sub">Clopper-Pearson, exact; computed from the stored verdicts</span>
            </div>
            {(diff.only_in_a.length > 0 || diff.only_in_b.length > 0) && (
              <p className="sub mono">
                alignment: {diff.only_in_a.length} only in a ({diff.only_in_a.join(", ")}),{" "}
                {diff.only_in_b.length} only in b ({diff.only_in_b.join(", ")})
              </p>
            )}
          </>
        )}
      </div>

      {diff && (
        <div className="card">
          <h2>
            aligned items <span className="pill">{diff.aligned}</span>{" "}
            {flipped.length > 0 && (
              <span className="bad-text" style={{ fontSize: 11 }}>
                {flipped.length} flipped
              </span>
            )}
          </h2>
          <p className="sub">
            inverted cells are verdict flips. the raw of both runs sits in the two bundles; diff
            reads the record, verify guards the record
          </p>
          <table>
            <thead>
              <tr>
                <th>item id</th>
                <th>check</th>
                <th>a</th>
                <th>b</th>
                <th>status</th>
              </tr>
            </thead>
            <tbody>
              {diff.rows.map((r) => (
                <tr key={r.item_id} className={r.flipped ? "row-flipped" : undefined}>
                  <td className="mono small">{r.item_id}</td>
                  <td className="mono small">{r.check}</td>
                  <td>
                    <VerdictBadge v={r.decision_a as "pass" | "fail" | "undetermined"} />
                  </td>
                  <td>
                    <VerdictBadge v={r.decision_b as "pass" | "fail" | "undetermined"} />
                  </td>
                  <td className="small">
                    {r.flipped
                      ? "FLIPPED"
                      : r.transcript_drift
                        ? "stable · words drifted"
                        : "stable"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="sub mono" style={{ marginBottom: 0 }}>
            read the raw outputs in both bundles before you trust the stability.
          </p>
        </div>
      )}
    </section>
  );
}
