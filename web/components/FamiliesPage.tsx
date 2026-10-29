"use client";

import { useEffect, useState } from "react";
import { getAsi, getFamiliesDetail } from "../lib/api";
import type { AsiData, FamilyDetail } from "../lib/types";

export function FamiliesPage() {
  const [families, setFamilies] = useState<FamilyDetail[] | null>(null);
  const [asi, setAsi] = useState<AsiData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getFamiliesDetail(), getAsi()])
      .then(([f, a]) => {
        setFamilies(f);
        setAsi(a);
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="empty">could not load families: {error}</div>;
  if (!families || !asi) return <div className="empty">loading families…</div>;

  return (
    <section>
      <p>
        <a className="back" href="#/">
          ← home
        </a>
      </p>
      <div className="run-head">
        <h1>Check families</h1>
      </div>
      <p className="sub">
        a family is content: items + policy version + verdict emitter + negative controls. F1 and
        F2 are live; F3-F6 are planned against the OWASP Agentic crosswalk.
      </p>

      {families.map((f) => (
        <div key={f.family_id} className="card">
          <h2>
            {f.family_id} · {f.name} <span className="pill">policy {f.policy_label}</span>
          </h2>
          <p className="sub mono">
            {f.items} items · {f.controls} negative controls · {f.policy_version.slice(0, 28)}…
          </p>
          {f.family_id === "F1" && (
            <p className="sub">
              the legacy line of the public five-tests repo (d95a57e), ported unchanged into the
              evidence model: same inputs, same detectors, now emitting chained verdict events.
            </p>
          )}
          {f.family_id === "F2" && (
            <p className="sub">
              the failure-mode matrix,{" "}
              <a href="#/matrix">docs/failure-mode-matrix.md</a>, made executable: rows E (evidence
              at decision time), P (persistence), R (recovery), V (independent verification) as
              checks. each check carries one scenario where the sample fixture makes the designed
              break and one where it makes the documented hold; for a live agent the same prompts
              are sent and the verdict is the measurement, not the label.
            </p>
          )}
          <table>
            <thead>
              <tr>
                <th>item id</th>
                <th>check</th>
                <th>action</th>
              </tr>
            </thead>
            <tbody>
              {f.items_detail.map((i) => (
                <tr key={i.id}>
                  <td className="mono small">{i.id}</td>
                  <td className="mono small">{i.check}</td>
                  <td className="small">{i.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="card">
        <h2>
          OWASP Agentic crosswalk <span className="pill">ASI01-ASI10</span>
        </h2>
        <p className="sub">record-derived; the F1 sub-check mapping is marked proposed, per the project's own P4 doctrine</p>
        <table>
          <thead>
            <tr>
              <th>asi</th>
              <th>title</th>
              <th>families</th>
              <th>status</th>
            </tr>
          </thead>
          <tbody>
            {asi.crosswalk.map((r) => (
              <tr key={r.asi}>
                <td className="mono">{r.asi}</td>
                <td className="small">{r.title}</td>
                <td className="small">{r.families.join(", ") || "—"}</td>
                <td className="small">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="raw-label">F1 sub-check mapping (proposed)</div>
        <table>
          <thead>
            <tr>
              <th>check</th>
              <th>name</th>
              <th>proposed asi</th>
              <th>status</th>
            </tr>
          </thead>
          <tbody>
            {asi.f1_proposed.map((r) => (
              <tr key={r.check}>
                <td className="mono">{r.check}</td>
                <td className="small">{r.name}</td>
                <td className="small">{r.proposed_asi}</td>
                <td className="small">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="raw-label">F2 sub-check mapping (proposed)</div>
        <table>
          <thead>
            <tr>
              <th>check</th>
              <th>name</th>
              <th>proposed asi</th>
              <th>status</th>
            </tr>
          </thead>
          <tbody>
            {asi.f2_proposed.map((r) => (
              <tr key={r.check}>
                <td className="mono">{r.check}</td>
                <td className="small">{r.name}</td>
                <td className="small">{r.proposed_asi}</td>
                <td className="small">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
