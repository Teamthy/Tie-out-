"use client";

import { useEffect, useMemo, useState } from "react";
import { getBundle, verifyRun } from "../lib/api";
import type {
  Bundle,
  ControlEvent,
  JudgeAudit,
  NamedGap,
  Provenance,
  VerdictEvent,
  VerifyResult,
} from "../lib/types";
import { VerdictBadge } from "./Badge";

function short(h: string | null | undefined, n = 12): string {
  if (!h) return "—";
  return h.length > n ? h.slice(0, n) + "…" : h;
}

function tryPretty(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

function VerifyPanel({ id }: { id: string }) {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runVerify() {
    setBusy(true);
    setError(null);
    try {
      setResult(await verifyRun(id));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>
        stranger verify <span className="pill">p5</span>
      </h2>
      <p className="sub">
        re-walks the hash chain, re-hashes the manifest, re-derives every verdict from the stored raw.
        no model, no key, no network.
      </p>
      <div className="verify-row">
        <button className="btn primary" onClick={runVerify} disabled={busy}>
          {busy ? "verifying…" : "run verify"}
        </button>
        {result && (
          <span className={result.ok ? "ok-text big" : "bad-text big"}>
            {result.verdict}
            {result.ok ? " — re-derivable by a stranger" : ""}
          </span>
        )}
      </div>
      {error && (
        <p className="bad-text" style={{ fontSize: 13 }}>
          {error}
        </p>
      )}
      {result && <pre className="code verify-out">{result.lines.join("\n")}</pre>}
    </div>
  );
}

function MetricTable({
  metrics,
  counts,
  stats,
}: {
  metrics: { check: string; total: number; fired: number; undetermined: number }[];
  counts: { pass: number; fail: number; undetermined: number };
  stats?: import("../lib/types").FamilyStats[] | null;
}) {
  const s = stats?.[0];
  return (
    <div className="card">
      <h2>
        the metric <span className="pill">t5</span>
      </h2>
      <p className="sub">specific failure, sample size, rate. fired comes from heuristic detectors; the raw is in the chain</p>
      <table>
        <thead>
          <tr>
            <th>check</th>
            <th>sample</th>
            <th>fired</th>
            <th>rate</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.check}>
              <td className="mono">{m.check}</td>
              <td className="mono">{m.total}</td>
              <td className="mono">{m.fired}</td>
              <td className="mono">
                {m.fired} of {m.total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="sub mono">
        total: {counts.pass} pass / {counts.fail} fail / {counts.undetermined} undetermined
      </p>
      {s ? (
        <p className="sub mono" style={{ marginBottom: 0 }}>
          pass rate {pct(s.pass_rate)} (n={s.n}) · 95% CI [
          {pct(s.ci95[0])}, {pct(s.ci95[1])}] · Clopper-Pearson, exact, stored in the manifest
        </p>
      ) : (
        <p className="sub mono" style={{ marginBottom: 0 }}>
          interval: n/a (this bundle predates format v1.1; the verifier accepts both)
        </p>
      )}
    </div>
  );
}

function VerdictTimeline({ events }: { events: VerdictEvent[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="card">
      <h2>
        verdict events <span className="pill">p1</span>
      </h2>
      <p className="sub">one record per check: action, policy version, decision, effect reference, in one event, chained</p>
      <ol className="chain">
        {events.map((e, i) => (
          <li key={e.event_id}>
            <button
              className={open === e.item_id ? "chain-row chain-open" : "chain-row"}
              onClick={() => setOpen(open === e.item_id ? null : e.item_id)}
            >
              <span className="idx mono">{String(i + 1).padStart(2, "0")}</span>
              <span className="mono item-id">{e.item_id}</span>
              <VerdictBadge v={e.decision} />
              <span className="why">{e.why}</span>
              <span className="hash mono" title={e.record_hash}>
                {short(e.record_hash)}
              </span>
            </button>
            {open === e.item_id && (
              <div className="chain-detail">
                <dl className="kv">
                  <dt>action</dt>
                  <dd>{e.action}</dd>
                  <dt>judge</dt>
                  <dd className="mono small">{e.judge}</dd>
                  <dt>judge endpoint</dt>
                  <dd className="mono small">{e.judge_endpoint}</dd>
                  <dt>target endpoint</dt>
                  <dd className="mono small">{e.target_endpoint}</dd>
                  <dt>effect ref</dt>
                  <dd className="mono small">{e.effect_ref}</dd>
                  <dt>times</dt>
                  <dd className="mono small">
                    {e.started_at} → {e.finished_at}
                  </dd>
                  <dt>prev hash</dt>
                  <dd className="mono small">{short(e.prev_hash, 24)}</dd>
                </dl>
                <div className="raw">
                  <div className="raw-label">input</div>
                  <pre className="code">{tryPretty(e.raw_input)}</pre>
                  <div className="raw-label">raw output</div>
                  <pre className="code">{e.raw_output}</pre>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ControlsCard({ controls, fp, fn }: { controls: ControlEvent[]; fp: number; fn: number }) {
  return (
    <div className="card">
      <h2>
        negative controls <span className="pill">p3</span>{" "}
        <span className={fp + fn === 0 ? "ok-text" : "bad-text"} style={{ fontSize: 11 }}>
          {fp} fp / {fn} fn
        </span>
      </h2>
      <p className="sub">
        the check cannot write its own grade: these crafted items are graded by the same detectors, and the
        harness's false-positive / false-negative rate for this run is in the manifest
      </p>
      <table>
        <thead>
          <tr>
            <th>control</th>
            <th>check</th>
            <th>kind</th>
            <th>expected</th>
            <th>fired</th>
            <th>verdict</th>
          </tr>
        </thead>
        <tbody>
          {controls.map((c) => (
            <tr key={c.control_id} title={c.note}>
              <td className="mono small">{c.control_id}</td>
              <td className="mono">{c.check}</td>
              <td>{c.kind}</td>
              <td className="mono">{String(c.expected_fire)}</td>
              <td className="mono">{String(c.fired)}</td>
              <td>
                <VerdictBadge v={c.verdict} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GapsCard({ gaps }: { gaps: NamedGap[] }) {
  return (
    <div className="card">
      <h2>
        named gaps <span className="pill">p4</span>
      </h2>
      <p className="sub">anything that could not be verified is recorded with reason and scope, never dropped silently</p>
      {gaps.length === 0 ? (
        <p className="sub" style={{ marginBottom: 0 }}>
          no named gaps in this bundle
        </p>
      ) : (
        <ul className="gap-list">
          {gaps.map((g) => (
            <li key={g.gap_id}>
              <span className="gap-code mono">[{g.code}]</span> <span className="mono small">{g.scope}</span>:{" "}
              {g.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function pct(x: number): string {
  return (100 * x).toFixed(1) + "%";
}

function JudgeAuditCard({ audit }: { audit: JudgeAudit }) {
  return (
    <div className="card">
      <h2>
        judge audit <span className="pill">p6</span>{" "}
        <span className={audit.self_preference_clean ? "ok-text" : "bad-text"} style={{ fontSize: 11 }}>
          self-preference {audit.self_preference_clean ? "clean" : "dirty"}
        </span>
      </h2>
      <p className="sub">who checks the checker: the judge's own numbers, measured offline on crafted, versioned anchors</p>
      <dl className="kv">
        <dt>judge</dt>
        <dd className="mono small">{audit.judge}</dd>
        <dt>anchors</dt>
        <dd className="mono">{audit.anchors_total}</dd>
        <dt>anchor agreement</dt>
        <dd className="mono">{pct(audit.anchors_agreement)}</dd>
        <dt>perturbation flips</dt>
        <dd className="mono">{Object.entries(audit.perturbation_flips).map(([k, v]) => `${k}=${v}`).join("  ")}</dd>
        <dt>disagreement (primary vs naive)</dt>
        <dd className="mono">{pct(audit.disagreement_rate)}</dd>
      </dl>
      {audit.details.length > 0 && (
        <div>
          <div className="raw-label">audit details</div>
          <pre className="code">{JSON.stringify(audit.details, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function ProvenanceCard({ p, policyVersion }: { p: Provenance; policyVersion?: string }) {
  return (
    <div className="card">
      <h2>
        provenance <span className="pill">p2</span>
      </h2>
      <dl className="kv">
        <dt>harness</dt>
        <dd className="mono">
          {p.harness_version}
          {p.harness_git ? ` (${short(p.harness_git, 10)})` : ""}
        </dd>
        <dt>policy</dt>
        <dd className="mono">{short(policyVersion, 28)}</dd>
        <dt>agent</dt>
        <dd className="mono">{p.agent}</dd>
        <dt>model</dt>
        <dd className="mono">{p.model ?? "none (deterministic agent)"}</dd>
        <dt>dataset</dt>
        <dd className="mono">{short(p.dataset_hash, 28)}</dd>
        <dt>decoding</dt>
        <dd className="mono">{JSON.stringify(p.decoding)}</dd>
        <dt>seed</dt>
        <dd className="mono">{p.seed}</dd>
        <dt>env</dt>
        <dd className="mono small">
          {p.env.platform} · python {p.env.python}
        </dd>
        {p.packages && (
          <>
            <dt>packages</dt>
            <dd className="mono small">
              {Object.entries(p.packages)
                .map(([name, version]) => `${name}@${version}`)
                .join("  ")}
            </dd>
            <dt>packages hash</dt>
            <dd className="mono small" title={p.packages_hash ?? undefined}>
              {short(p.packages_hash, 34)}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}

export function RunDetail({ id }: { id: string }) {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBundle(null);
    setError(null);
    getBundle(id).then(setBundle).catch((e) => setError(String(e)));
  }, [id]);

  const metrics = useMemo(() => {
    if (!bundle) return [];
    const groups = new Map<string, VerdictEvent[]>();
    for (const e of bundle.events) {
      const key = e.check.split("-")[0];
      groups.set(key, [...(groups.get(key) ?? []), e]);
    }
    return [...groups.entries()].map(([check, evs]) => ({
      check,
      total: evs.length,
      fired: evs.filter((e) => e.detector_fired === true).length,
      undetermined: evs.filter((e) => e.decision === "undetermined").length,
    }));
  }, [bundle]);

  if (error) return <div className="empty">could not load run: {error}</div>;
  if (!bundle) return <div className="empty">loading bundle…</div>;

  const p = bundle.manifest.provenance;
  const counts = { pass: 0, fail: 0, undetermined: 0 };
  for (const e of bundle.events) counts[e.decision] += 1;

  return (
    <section>
      <p>
        <a className="back" href="#/">
          ← all runs
        </a>
      </p>
      <div className="run-head">
        <h1 className="mono">{bundle.id}</h1>
        <span className="verdict-group">
          <VerdictBadge v="pass" />
          <VerdictBadge v="fail" />
          <VerdictBadge v="undetermined" />
        </span>
      </div>
      <p className="sub mono">
        {p.agent} · suite {p.suite} · {p.started_at} → {p.finished_at} · {bundle.events.length} events,{" "}
        {bundle.controls.length} controls · {bundle.manifest.bundle_format} ·{" "}
        <a href="#/compare">compare with another run →</a>
      </p>

      <VerifyPanel id={id} />
      <MetricTable metrics={metrics} counts={counts} stats={bundle.manifest.statistics} />
      <VerdictTimeline events={bundle.events} />
      <ControlsCard controls={bundle.controls} fp={bundle.manifest.controls_fp} fn={bundle.manifest.controls_fn} />
      <GapsCard gaps={bundle.gaps} />
      {bundle.judge_audit && <JudgeAuditCard audit={bundle.judge_audit} />}
      <ProvenanceCard p={p} policyVersion={p.family_policy_versions[bundle.events[0]?.family ?? ""]} />
    </section>
  );
}
