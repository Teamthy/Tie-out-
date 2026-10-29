"use client";

const PILLARS: { id: string; name: string; line: string }[] = [
  { id: "P1", name: "verdict event", line: "one record per check: action, policy version, decision, effect reference, in one event, ids pre-assigned before the attempt" },
  { id: "P2", name: "provenance", line: "exact harness, model, dataset hash, environment, decoding, seed, and the resolved endpoint of every judge call" },
  { id: "P3", name: "negative controls", line: "every suite carries items it does not generate; the check cannot write its own grade; FP and FN per run" },
  { id: "P4", name: "named gaps", line: "anything unverifiable is recorded with reason and scope, never dropped silently" },
  { id: "P5", name: "re-derivation", line: "verify re-walks the chain, re-hashes the manifest, re-runs the detectors on stored raw: no model, no key, no network" },
  { id: "P6", name: "judge audit", line: "the judge's own numbers every run: anchor agreement, perturbation flips, disagreement rate, self-preference probe" },
];

export function Landing() {
  return (
    <section>
      <div className="hero">
        <p className="hero-kicker">an open harness for agent evaluation and red team runs</p>
        <h1 className="hero-title">
          The report is a claim.
          <br />
          The bundle is a record.
        </h1>
        <p className="hero-sub">
          tieout emits evidence, not reports. Every verdict is a bound, chained, re-derivable
          event, and a stranger can verify the bundle without trusting the tool, the judge, or the
          team that ran it.
        </p>
        <div className="hero-actions">
          <a className="btn primary" href="#/runs">
            open runs
          </a>
          <a className="btn" href="#/method">
            read the method
          </a>
          <a className="btn" href="#/matrix">
            failure-mode matrix
          </a>
        </div>
      </div>

      <div className="card">
        <h2>
          01 · the gap <span className="pill">why this exists</span>
        </h2>
        <p className="doc-p">
          The 2026 tooling landscape is crowded in three layers and empty in the fourth. Attacks
          are commoditized. Evals are commoditized at the scoring level. Taxonomy is standardized.
          <strong> Evidence is empty</strong>: every tool uses a judge that lives inside the tool,
          the evaluator and the evaluated share an operator, and a green eval from such a tool is
          a self-grade. The research says what the artifacts cannot show: no judge is uniformly
          reliable, verdicts flip on reformatting and verbosity, and where raw outputs were not
          shipped, the numbers cannot be re-audited.
        </p>
        <p className="doc-p" style={{ marginBottom: 0 }}>
          tieout is built for the fourth layer. It is the public artifact of an independent AI
          security research practice, built to be verified, not trusted, and reviewed cold.{" "}
          <a href="#/method">Read the full method →</a>
        </p>
      </div>

      <div className="card">
        <h2>
          02 · six pillars <span className="pill">all in code</span>
        </h2>
        <div className="pillars">
          {PILLARS.map((p) => (
            <div key={p.id} className="pillar">
              <span className="pillar-id mono">{p.id}</span>
              <div>
                <div className="pillar-name">{p.name}</div>
                <div className="pillar-line">{p.line}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>
          03 · capabilities <span className="pill">v1.1 record</span>
        </h2>
        <ul className="cap-list">
          <li>
            <span className="cap-name">stability diff</span> run the same suite twice, align by
            pre-assigned id, report verdict drift and transcript drift separately:{" "}
            <code>tieout diff runs/demo-stability/a runs/demo-stability/b</code>
          </li>
          <li>
            <span className="cap-name">exact confidence intervals</span> the pass rate ships with a
            Clopper-Pearson 95% interval, exact, dependency-free, computed before the bundle is
            closed and stored in the manifest
          </li>
          <li>
            <span className="cap-name">environment-locked provenance</span> the pinned package
            versions are hashed into the manifest; the record claims the environment it ran in
          </li>
          <li>
            <span className="cap-name">the matrix, executable</span> family F2 (state and recovery)
            turns the failure-mode matrix rows into runnable checks with their own controls and
            judge audit
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>
          04 · verify it yourself <span className="pill">one command, stranger-safe</span>
        </h2>
        <pre className="code">
          {`pip install -e .
tieout demo                              # keyless: F1 against the deterministic sample agent
tieout verify runs/demo                  # re-derive everything: no model, no key, no network
tieout diff runs/demo-stability/a runs/demo-stability/b   # stability across two runs`}
        </pre>
        <p className="sub mono" style={{ marginBottom: 0 }}>
          expected: VERDICT: PASS (re-derivable by a stranger) · stability 1.000 (0 verdict flips,
          10 transcripts drifted)
        </p>
      </div>

      <div className="card">
        <h2>
          05 · the artifact <span className="pill">what a run produces</span>
        </h2>
        <table>
          <thead>
            <tr>
              <th>file</th>
              <th>what it is</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="mono">runs/&lt;id&gt;/bundle.jsonl</td>
              <td>the record: manifest, chained verdict events, negative controls, judge audit, named gaps</td>
            </tr>
            <tr>
              <td className="mono">runs/&lt;id&gt;/manifest.sha256</td>
              <td>file hash, one line; the chain tail is fixed in the manifest</td>
            </tr>
            <tr>
              <td className="mono">runs/&lt;id&gt;/verify_report.json</td>
              <td>the last stranger-verify result, written by verify</td>
            </tr>
          </tbody>
        </table>
        <p className="sub" style={{ marginBottom: 0 }}>
          format spec: <a href="#/format">bundle format v1.1</a> · harness spec:{" "}
          <a href="#/harness">harness spec</a> · <a href="#/compare">stability diff</a>
        </p>
      </div>
    </section>
  );
}
