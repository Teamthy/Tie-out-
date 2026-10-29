import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "../../components/Icon";
import { PageHead } from "../../components/PageHead";
import { runRows, specimen } from "../../lib/summary";

export const metadata: Metadata = {
  title: "runs",
  description: "Every committed evidence bundle: verdicts, controls, named gaps, judge audit.",
};

function pct(x: number): string {
  return `${(100 * x).toFixed(1)}%`;
}

export default function RunsPage() {
  const rows = runRows();
  const spec = specimen();
  const totalEvents = rows.reduce((n, r) => n + r.events, 0);
  const totalControls = rows.reduce((n, r) => n + r.controls, 0);
  const totalFp = rows.reduce((n, r) => n + r.fp, 0);
  const totalFn = rows.reduce((n, r) => n + r.fn, 0);

  return (
    <div className="stack">
      <PageHead
        crumb={{ label: "index", href: "/" }}
        eyebrow="the evidence"
        title="Runs, as committed."
        dek={
          <>
            Each row is a bundle in this repository, read at build time — not a query against a
            service. The verdicts, the controls, the rates and the intervals below are counted
            from the files themselves.
          </>
        }
        facts={[
          { label: "runs", value: rows.length },
          { label: "verdict events", value: totalEvents },
          { label: "negative controls", value: totalControls },
          { label: "controls fp / fn", value: `${totalFp} / ${totalFn}` },
        ]}
        actions={
          <>
            <Link className="btn btn-solid" href="/compare/">
              <Icon name="compare" size={15} /> compare two runs
            </Link>
            <Link className="btn" href="/format/">
              <Icon name="format" size={15} /> the record format
            </Link>
            {spec ? (
              <a className="btn btn-ghost" href="#table">
                <Icon name="hash" size={15} /> {spec.run_id}
              </a>
            ) : null}
          </>
        }
      />

      <section className="section" id="table">
        <header className="section-head">
          <span className="section-num">01</span>
          <h2 className="section-title">the table</h2>
          <span className="section-note">counted from the events, not a summary</span>
        </header>

        <div className="table-wrap">
          <table className="table-runs">
            <thead>
              <tr>
                <th>run</th>
                <th>agent</th>
                <th>started (utc)</th>
                <th>verdicts</th>
                <th>controls</th>
                <th>rate</th>
                <th aria-label="open" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link className="inline-link" href={`/run/${r.id}/`}>
                      {r.id}
                    </Link>
                    <span className="cell-sub mono">{r.format.replace("tieout-bundle/", "v")}</span>
                  </td>
                  <td className="mono small">{r.agent}</td>
                  <td className="mono small">{r.started}</td>
                  <td>
                    <span className="tally">
                      <span className="tally-n pass">{r.pass}</span>
                      <span className="tally-sep">/</span>
                      <span className="tally-n fail">{r.fail}</span>
                      {r.undetermined ? (
                        <>
                          <span className="tally-sep">/</span>
                          <span className="tally-n und">{r.undetermined}</span>
                        </>
                      ) : null}
                    </span>
                    <span className="cell-sub mono">pass / fail</span>
                  </td>
                  <td className="mono small">
                    {r.controls} · fp {r.fp} · fn {r.fn}
                  </td>
                  <td className="mono small">
                    {r.rate === null ? (
                      <span className="dim">no stored interval</span>
                    ) : (
                      <>
                        {pct(r.rate)}
                        <span className="cell-sub">
                          ci95 {pct(r.ci![0])}–{pct(r.ci![1])}
                        </span>
                      </>
                    )}
                  </td>
                  <td>
                    <Link className="btn" href={`/run/${r.id}/`} aria-label={`open ${r.id}`}>
                      open <Icon name="arrow" size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="table-note mono small">
          a v1.0 bundle stores no interval, so none is shown: the site never recomputes a
          statistic in the browser. open a run to re-derive it through the API.
        </p>
      </section>

      <section className="section">
        <div className="note-rule">
          <div>
            <h2 className="section-title">what a run is</h2>
            <p className="prose-p">
              A run is a suite, an agent, and a bundle. The bundle holds one manifest line, one
              chained event per check, the negative-control records, and — from v1.1 — the
              provenance block, the family statistics and the judge audit. Nothing in it is
              recomputed by this page.
            </p>
          </div>
          <div className="note-rule-actions">
            <Link className="btn" href="/method/">
              <Icon name="method" size={15} /> the method
            </Link>
            <Link className="btn btn-ghost" href="/harness/">
              <Icon name="harness" size={15} /> the harness spec
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
