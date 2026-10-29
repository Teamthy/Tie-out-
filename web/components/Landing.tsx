import Link from "next/link";

import { Icon, type IconName } from "./Icon";
import { LinkedInButton } from "./LinkedIn";
import { POSTS, formatDate } from "../lib/posts";
import { headline, runCards, specimen } from "../lib/summary";

const PILLARS: { id: string; name: string; line: string; icon: IconName }[] = [
  { id: "01", name: "verdict event", icon: "check", line: "one record per check: action, policy version, decision, effect reference — ids pre-assigned before the attempt" },
  { id: "02", name: "provenance", icon: "layers", line: "harness, model, dataset hash, environment, decoding, seed, and the pinned packages, with a hash over them" },
  { id: "03", name: "negative controls", icon: "shield", line: "every suite carries items it did not generate; the judge cannot write its own grade; FP and FN per run" },
  { id: "04", name: "named gaps", icon: "hash", line: "anything that could not be verified is recorded with its scope and reason, never dropped silently" },
  { id: "05", name: "re-derivation", icon: "terminal", line: "verify re-walks the chain, re-hashes the manifest, re-runs the detectors on stored raw: no model, no key, no network" },
  { id: "06", name: "judge audit", icon: "method", line: "the judge's own numbers every run: anchor agreement, perturbation flips, disagreement rate, self-preference" },
];

/** 08a91783b262acbf…bac2b — long values, visually truncated only. */
function shorten(value: string, keep = 36): string {
  if (value.length <= keep) return value;
  return `${value.slice(0, keep)}…`;
}

const LAYERS = [
  { name: "attacks", state: "commoditized", line: "garak, PyRIT, promptfoo, DeepTeam, Giskard, AgentDojo" },
  { name: "scoring", state: "commoditized", line: "OpenAI Evals, DeepEval, Inspect AI, LangSmith, Braintrust, Phoenix" },
  { name: "taxonomy", state: "standardized", line: "OWASP Top 10 for Agentic Applications, MITRE ATLAS, NIST AI RMF" },
  { name: "evidence", state: "empty", line: "the artifact a stranger can re-derive without trusting the tool" },
];

export function Landing() {
  const cards = runCards();
  const head = headline();
  const spec = specimen();
  const recent = [...POSTS].sort((a, b) => b.order - a.order).slice(0, 3);

  return (
    <div className="stack">
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">an open harness for agent evaluation &amp; red team runs</p>
            <h1 className="hero-title">
              The report is a claim.
              <br />
              <span className="hero-title-dim">The bundle is a record.</span>
            </h1>
            <p className="hero-sub">
              Every verdict is a bound, chained, re-derivable event. A stranger can verify the
              bundle without trusting the tool, the judge, or the team that ran it — no key, no
              network, no model.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-solid" href="/runs/">
                <Icon name="runs" size={15} /> open the runs
              </Link>
              <Link className="btn" href="/method/">
                read the method
              </Link>
              <Link className="btn" href="/blog/">
                <Icon name="book" size={15} /> twelve notes
              </Link>
              <LinkedInButton label="linkedin" />
            </div>
          </div>

          {spec ? (
            <aside className="specimen" aria-label="the head of a committed bundle">
              <div className="specimen-head">
                <Icon name="hash" size={13} />
                <span className="mono small">bundle head</span>
                <span className="specimen-file mono">{spec.id}</span>
              </div>
              <dl className="specimen-rows">
                <div>
                  <dt>format</dt>
                  <dd className="mono">{spec.format}</dd>
                </div>
                <div>
                  <dt>run id</dt>
                  <dd className="mono">{spec.run_id}</dd>
                </div>
                <div>
                  <dt>records</dt>
                  <dd className="mono">
                    {spec.events} events · {spec.controls} controls
                  </dd>
                </div>
                <div>
                  <dt>judge</dt>
                  <dd className="mono">{shorten(spec.judge, 30)}</dd>
                </div>
                <div>
                  <dt>policy</dt>
                  <dd className="mono">{shorten(spec.policy, 30)}</dd>
                </div>
                <div>
                  <dt>tail hash</dt>
                  <dd className="mono">{shorten(spec.tail, 24)}</dd>
                </div>
              </dl>
              <p className="specimen-note">
                read from lines 1 and 2 of the committed file at build time; hashes shortened
                for display, full values in the bundle.
              </p>
            </aside>
          ) : null}
        </div>

        <dl className="stat-row">
          <div className="stat-cell">
            <dt>runs committed</dt>
            <dd>{cards.length}</dd>
          </div>
          <div className="stat-cell">
            <dt>chained records, F1</dt>
            <dd>{head.records}</dd>
          </div>
          <div className="stat-cell">
            <dt>false positives / negatives</dt>
            <dd>0 / 0</dd>
          </div>
          <div className="stat-cell">
            <dt>verdict flips, stability pair</dt>
            <dd>0</dd>
          </div>
        </dl>
      </section>

      <section className="section" id="gap">
        <header className="section-head">
          <span className="section-num">01</span>
          <h2 className="section-title">the gap</h2>
          <span className="section-note">why this exists</span>
        </header>
        <div className="split">
          <div className="prose">
            <p className="lead">
              The 2026 tooling landscape is crowded in three layers and empty in the fourth.
            </p>
            <p>
              Attacks are commoditized. Scoring is commoditized. Taxonomy is standardized. <strong>Evidence is empty</strong>: every tool uses a judge that lives
              inside the tool, the evaluator and the evaluated share an operator, and a green eval
              from such a tool is a self-grade.
            </p>
            <p>
              tieout is built for that fourth layer: an artifact that survives being handed to
              someone who does not trust you.{" "}
              <Link className="inline-link" href="/method/">
                read the full method <Icon name="arrow" size={13} />
              </Link>
            </p>
          </div>
          <ul className="layer-list">
            {LAYERS.map((l) => (
              <li key={l.name} className={`layer layer-${l.state === "empty" ? "empty" : "full"}`}>
                <div className="layer-top">
                  <span className="layer-name">{l.name}</span>
                  <span className="layer-state">{l.state}</span>
                </div>
                <span className="layer-line">{l.line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" id="pillars">
        <header className="section-head">
          <span className="section-num">02</span>
          <h2 className="section-title">six pillars</h2>
          <span className="section-note">all in code, all in the record</span>
        </header>
        <div className="grid grid-3">
          {PILLARS.map((p) => (
            <article key={p.id} className="card card-pillar">
              <div className="card-top">
                <span className="pillar-icon">
                  <Icon name={p.icon} size={16} />
                </span>
                <span className="card-index">{p.id}</span>
              </div>
              <h3 className="card-title">{p.name}</h3>
              <p className="card-line">{p.line}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="record">
        <header className="section-head">
          <span className="section-num">03</span>
          <h2 className="section-title">the record</h2>
          <span className="section-note">four bundles, committed</span>
        </header>
        <div className="grid grid-2">
          {cards.map((r) => (
            <Link key={r.id} href={`/run/${r.id}/`} className="card card-run">
              <div className="card-top">
                <span className="tag">{r.suite}</span>
                <span className="card-index mono">{r.format.replace("tieout-bundle/", "")}</span>
              </div>
              <h3 className="card-title mono">{r.id}</h3>
              <div className="card-metrics">
                <span className="metric">
                  <span className="metric-num">{r.events}</span>
                  <span className="metric-label">events</span>
                </span>
                <span className="metric">
                  <span className="metric-num">{r.controls}</span>
                  <span className="metric-label">controls</span>
                </span>
                <span className="metric">
                  <span className="metric-num">{r.rate === null ? "—" : r.rate.toFixed(3)}</span>
                  <span className="metric-label">pass rate</span>
                </span>
              </div>
              <span className="card-foot mono">
                {r.rate === null
                  ? "v1.0 record · no stored interval"
                  : `ci95 ${r.ci?.[0].toFixed(3)} – ${r.ci?.[1].toFixed(3)}`}
                <Icon name="arrow" size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section" id="verify">
        <header className="section-head">
          <span className="section-num">04</span>
          <h2 className="section-title">verify it yourself</h2>
          <span className="section-note">one command, stranger-safe</span>
        </header>
        <div className="terminal">
          <div className="terminal-bar">
            <span className="terminal-dot" />
            <span className="terminal-dot" />
            <span className="terminal-dot" />
            <span className="terminal-title mono">sh — tieout</span>
          </div>
          <pre className="terminal-body">
{`$ pip install -e .
$ tieout demo                                    # keyless, deterministic sample agent
$ tieout verify runs/demo                        # re-derive everything: no model, no key, no network
$ tieout diff runs/demo-stability/a runs/demo-stability/b`}
          </pre>
          <div className="terminal-out">
            <span className="mono ok-text">VERDICT: PASS (re-derivable by a stranger)</span>
            <span className="mono dim">·</span>
            <span className="mono">stability 1.000</span>
            <span className="mono dim">·</span>
            <span className="mono">0 verdict flips, 10 transcripts drifted</span>
          </div>
        </div>
      </section>

      <section className="section" id="notes">
        <header className="section-head">
          <span className="section-num">05</span>
          <h2 className="section-title">notes</h2>
          <span className="section-note">twelve pieces, five disciplines</span>
        </header>
        <div className="grid grid-3">
          {recent.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}/`} className="card card-note">
              <div className="card-top">
                <span className="tag">{p.discipline}</span>
                <span className="card-index mono">{String(p.order).padStart(2, "0")}</span>
              </div>
              <h3 className="card-title">{p.title}</h3>
              <p className="card-line">{p.dek}</p>
              <span className="card-foot mono">
                {formatDate(p.date)} · {p.minutes} min
                <Icon name="arrow" size={14} />
              </span>
            </Link>
          ))}
        </div>
        <div className="section-more">
          <Link className="btn" href="/blog/">
            all twelve notes <Icon name="arrow" size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
