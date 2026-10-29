"use client";

import { useEffect, useState } from "react";
import { getRuns } from "../lib/api";
import type { RunSummary } from "../lib/types";
import { VerdictBadge } from "./Badge";
import { runPath } from "../lib/links";

export function RunList() {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRuns().then(setRuns).catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="empty">could not load runs: {error}</div>;
  if (!runs) return <div className="empty">loading runs…</div>;
  if (runs.length === 0)
    return (
      <div className="empty">
        no runs yet
        <pre className="code">
          {`tieout demo        # keyless, deterministic sample agent
tieout verify runs/demo`}
        </pre>
      </div>
    );

  return (
    <section>
      <div className="run-head">
        <h1>Runs</h1>
      </div>
      <p className="sub">
        each row is an evidence bundle: the verdicts, the controls, the named gaps, the judge's
        own numbers
      </p>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>run</th>
              <th>agent</th>
              <th>started (utc)</th>
              <th>verdicts</th>
              <th>controls</th>
              <th>gaps</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td className="mono">
                  <a href={runPath(r.id)}>{r.id}</a>
                </td>
                <td className="mono small">{r.agent}</td>
                <td className="mono small">{r.started_at}</td>
                <td>
                  <span className="verdict-group">
                    {r.verdicts.pass != null && <VerdictBadge v="pass" />}
                    {r.verdicts.fail != null && <VerdictBadge v="fail" />}
                    {r.verdicts.undetermined != null && <VerdictBadge v="undetermined" />}
                  </span>
                </td>
                <td className="mono small">
                  {r.controls} / fp {r.controls_fp} / fn {r.controls_fn}
                </td>
                <td>
                  {r.gaps === 0 ? (
                    <span className="ok-dot" title="no named gaps" />
                  ) : (
                    <span className="gap-pill">{r.gaps}</span>
                  )}
                </td>
                <td>
                  <a className="btn" href={runPath(r.id)}>
                    open
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
