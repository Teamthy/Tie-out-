# tieout

**The report is a claim. The bundle is a record a stranger can re-derive
without trusting the tool, the judge, or the team that ran it.**

tieout is an open harness for agent evaluation and red team runs that
emits **evidence**, not reports. Every verdict is one bound, chained,
re-derivable event: the action, the check version, the decision, and the
effect reference, in one record, with the raw inputs and outputs stored
in the chain. The harness's own reliability is measured and recorded in
every run.

## The gap, in one paragraph

The 2026 tooling landscape is crowded in three layers and empty in the
fourth. Attacks are commoditized (garak, PyRIT, promptfoo, DeepTeam,
Giskard, AgentDojo). Evals are commoditized at the scoring level
(OpenAI Evals, DeepEval, Inspect AI, plus the commercial platforms).
Taxonomy is standardized (OWASP Top 10 for Agentic Applications, MITRE
ATLAS, NIST AI RMF). **Evidence is empty**: every tool uses a judge that
lives inside the tool, the evaluator and the evaluated share an
operator, and a green eval from such a tool is a self-grade. The 2026
research says what the tools' own artifacts can't show: no judge is
uniformly reliable, verdicts flip on reformatting and verbosity, and
where raw outputs were not shipped, the numbers cannot be re-audited.
Nobody in the landscape emits an artifact that survives contact with a
stranger. That is this project.

This repository is the public artifact of an independent AI security
research practice, built to be verified, not trusted, and reviewed
cold: if a claim here cannot be re-derived from a cold clone, it does
not belong here.

## Six pillars, all in code

| pillar | doctrine |
|--------|----------|
| P1 verdict event | one record per check result; four-part binding (action, policy version, decision, effect reference); ids pre-assigned before the attempt |
| P2 provenance | exact harness, model, dataset hash, environment, decoding, seed, and the resolved endpoint of every judge call |
| P3 negative controls | every suite carries known-hold / known-broken items it does not generate; the check cannot write its own grade; FP/FN per run |
| P4 named gaps | anything unverifiable is recorded with reason and scope, never dropped silently; a named gap is more honest than a green bundle |
| P5 re-derivation | `verify` re-walks the hash chain, re-hashes the manifest, re-runs the detectors on stored raw: no model, no key, no network |
| P6 judge audit | the judge's own numbers every run: anchor agreement, perturbation flips, disagreement rate, self-preference probe |

## Quickstart

```bash
pip install -e .          # python 3.10+
tieout selftest           # the 8-point harness selftest
tieout demo               # keyless run: F1 against the deterministic sample agent
tieout verify runs/demo   # stranger verify, one command
tieout diff runs/demo-stability/a runs/demo-stability/b   # stability across two runs
```

Expected demo output, end to end:

```
the metric
  T1     0 of 3
  T2     0 of 3
  T3     0 of 2
  T4     1 of 6
verdicts: 13 pass / 1 fail / 0 undetermined
controls: 8, 0 FP / 0 FN
named gaps: none
```

```
tieout verify: runs/demo
  format : tieout-bundle/v1
  chain  : 22 records, intact
  file   : sha256 match
  items  : 14/14 pre-assigned ids present
  re-derive: 14/14 verdicts re-derived from stored raw
  controls: 8 re-derived, 0 FP / 0 FN
  gaps   : none
  VERDICT: PASS (re-derivable by a stranger)
```

The sample agent holds every English check and breaks exactly one: the
mixed Pidgin/Yoruba unverified-refund refusal (F1-T4-R1-mixed). That is
documented in the fixture, not discovered in the run, and it is what
gives a keyless run a real, non-degenerate metric.

## Proving stability

A run is a point; stability is a relation between runs. The harness
measures it instead of assuming it:

```
tieout diff runs/demo-stability/a runs/demo-stability/b
  aligned    : 14 items (by pre-assigned id)
  verdicts   : 0 flipped, 14 stable  ->  stability 1.000
  transcripts: 10 drifted without a verdict flip
  rate a     : 13/14 pass (0.9286), 95% CI 0.6613..0.9982
  rate b     : 13/14 pass (0.9286), 95% CI 0.6613..0.9982
```

The two committed runs are the same F1 suite against the sample agent
with different surface-drift seeds: the words moved (10 transcripts
drifted), the verdicts did not (0 flips). That is the paraphrase
phenomenon the P6 judge audit measures at the item level, shown at the
run level. Run the same diff against two live-model runs and the table
tells you exactly which items are unstable. The interval is the exact
Clopper-Pearson one (bisection on the binomial CDF, no approximation,
no dependencies), computed before the bundle is closed and stored in
the manifest.

## How it is built

Data flow, one direction:

```
family declaration (items, controls, detectors, policy hash)
  -> runner assigns every id before the first agent call
  -> agent.respond(input_spec) -> raw output
  -> detector(raw) -> verdict, sealed into a chained record at write time
  -> bundle.jsonl + manifest.sha256
```

The invariants, in the order a reviewer should check them:

1. **ids are pre-assigned** before any agent call: absence is nameable (P4)
2. **every record hashes itself and its predecessor**: one tampered character is a G-HASH (P1/P5)
3. **the detector is a pure function of stored raw**: a stranger re-derives every verdict with no model, no key, no network (P5)
4. **the judge is audited on crafted anchors every run**, including a probe that injects the judge's own marker string (P6)
5. **the format is additive and backward compatible**: the committed 0.2.0 v1.0 bundle verifies under 0.3.0 code, on every commit
6. **one record is one physical line, always**: the canonicalizer escapes the JSON-legal line separators that would otherwise split a record in the file bytes

## Live runs

Any OpenAI-compatible endpoint, same contract as the five-tests method:

```bash
pip install -e ".[live]"
export MODEL=gpt-4o-mini            # or any model id
export OPENAI_BASE_URL=https://api.openai.com/v1   # or Ollama/Groq/your bot
export OPENAI_API_KEY=...           # any string for local servers
# optional: export MY_SYSTEM_PROMPT_FILE=system_prompt.txt
# (or pass --system-prompt-file)
tieout run --agent live --suite F1 --out runs/my-run
tieout verify runs/my-run
```

Detectors are heuristics on purpose: the tool narrows, the human
decides. Every raw response is in the bundle; read each `fail` with
your own eyes before you trust the metric.

## The UI

```bash
cd web && npm install && npm run build && cd ..
tieout serve --port 8000 --runs-dir runs
```

One command serves the API and the built UI. The UI (Next.js, static
export, black and white on purpose) is a viewer for tieout's own
evidence bundles, not an LLM observability dashboard. Every page is
prerendered at build time; the only request-time work on the site is
the verify button.

| route | page |
|-------|------|
| `/` | landing: the gap, the six pillars, capabilities, verify-it-yourself, the artifact |
| `/runs` | the run list: verdicts, controls, gaps per bundle |
| `/run/<id>` | the full bundle: verdict timeline with the hash chain, the metric with its exact CI, controls, gaps, judge audit, provenance with the environment packages, and a stranger verify you can trigger from the page (nested ids work: `/run/demo-stability/a`) |
| `/compare` | cross-run stability: pick two runs, aligned table, verdict flips inverted, transcript drift counted, rates with exact CIs |
| `/blog` | twelve articles across red teaming, security, research engineering, evaluation and software engineering, each ending with the artifacts it was verified against |
| `/blog/<slug>` | one article: byline, body, "verified against" sources, prev/next |
| `/method` | the method note |
| `/format` | the bundle format v1.1 spec |
| `/matrix` | the failure-mode matrix |
| `/harness` | the harness spec |
| `/families` | check families + the OWASP Agentic crosswalk |

The docs are single-sourced: `/method`, `/format`, `/matrix` and
`/harness` render `docs/*.md` at build time, the same files the CLI
ships and `/api/docs` serves. The blog is markdown in
`web/content/blog/` with metadata in `web/lib/posts.ts`; adding a piece
is a file plus an entry, and `python scripts/check_export.py web/out`
holds the mechanical contract (25+ pages, twelve articles, at least
three verified-against sources each, the author link on every page).

Built by Timothy Olusanya ([LinkedIn](https://www.linkedin.com/in/olusanya-timothy)):
the author link sits in the hero, the footer of every page, and every
article byline.

## Deploy

The repo deploys to Vercel as two [services](https://vercel.com/docs/services)
in one project, no build flags and no environment variables:

| service | root | what it is |
|---------|------|------------|
| `web` | `web/` | the UI, Next.js static export |
| `api` | `/` | the FastAPI app, entrypoint `main:app` |

`vercel.json` declares both and routes `/api/*` to `api`, everything
else to `web`. `main.py` is the ASGI entry: the same `create_app` that
`tieout serve` runs, reading the committed runs from the bundle. Set the
project framework to **Services** (the config is ignored otherwise) and
deploy from the repository root. The Python pin lives in
`.python-version` and must be a version the runtime offers (3.12, 3.13,
3.14); dependencies come from `pyproject.toml` + `uv.lock`, so the
deployed environment is the locked one.

Serverless notes, both handled in code: the filesystem is read-only, so
the verify endpoint's `verify_report.json` write is best-effort and the
report is the response; and run ids are paths, so nested evidence
(`demo-stability/a`) is served as-is.

## Check families

- **F1, the five failure checks** (policy v1): ported unchanged from the
  public five-tests method (ai-redteam-five-tests, d95a57e), the legacy
  line. The inputs and detectors are the same; the outputs are now P1
  verdict events with P3 negative controls. The five checks: prompt
  not a wall (T1), retrieval is untrusted input (T2), tools trusted
  unread (T3), one language (T4, English plus mixed Pidgin/Yoruba), and
  the metric (T5: specific failure, sample size, rate).
- **F2, state and recovery** (policy v1): the failure-mode matrix
  made executable. Four checks, one per matrix row: E evidence at
  decision time, P persistence across a session boundary, R recovery
  from a failed lookup, V independent verification of an asserted
  outcome. Eight items (one designed break and one documented hold per
  check on the sample fixture; repeated probes for a live agent), eight
  negative controls, its own judge audit with a one-tell NAIVE variant.
  Committed evidence: `runs/demo-f2` (4 fail / 4 pass, 0 FP / 0 FN,
  verify PASS).
- **F3-F6, planned**: goal hijack (ASI01), tool misuse (ASI02),
  identity (ASI03), memory (ASI06), human trust (ASI09). The OWASP
  crosswalk is in `mappings/asi.py`; the F1 and F2 sub-check mappings
  are marked proposed, per the project's own P4 doctrine (E, R and V
  have no direct row in the recorded 2026 list; that is a named gap,
  not a silent drop).

## The failure-mode benchmark

`docs/failure-mode-matrix.md` is the research core of the project: four
failure modes of decision-time evidence (verdict not emitted; emitted
but not preserved; host dies between local commit and independent
ingestion; preserved but not independently verifiable) across five
columns, with two test classes, P (persistence/recovery) and V
(cryptographic verification, key-free). Test 4 is this harness: `verify`
plus the tamper suite, key-free by construction. The four rows are also
executable against an agent as family F2, so the matrix is not a note:
it is a family with items, controls, and a judge audit.

## Documentation

- [bundle format v1.1](docs/bundle-format-v1.md): the record schema, the
  chain, the gap codes, the verify procedure, the v1.1 addendum
  (statistics + environment packages, backward compatibility rule, the
  one-record-one-line canonicalization invariant)
- [harness spec](docs/harness-spec.md): the T0-T6 phases as implemented,
  the check families (F1, F2), the stability diff, tests A-D, the
  binding field map, the standing named gaps
- [method note](docs/method-note.md): the gap, the pillars as doctrine,
  how to read a bundle, reproducibility and stability stated precisely,
  the statistical rigor (exact Clopper-Pearson)

## Layout

```
tieout/            the package
  harness/         check families; F1 = the five checks, F2 = the matrix; agents
  bundle/          writer + verify (P5)
  calibration/     judge audit (P6)
  mappings/        ASI crosswalk
  stats.py         exact Clopper-Pearson intervals, no dependencies
  diff.py          cross-run stability diff (align by pre-assigned id)
  server.py        FastAPI: bundle browser + verify + diff
web/               the UI (Next.js, static export, black and white)
  app/             one directory per route; /run/[...id] is a catch-all (ids are paths)
  content/blog/    the twelve articles, markdown, read at build time
  lib/posts.ts     the article registry: title, dek, discipline, date, sources
docs/              format spec, harness spec, method note, matrix
runs/              reproducible runs (demo, demo-f2, demo-stability are committed)
tests/             pytest: verify/tamper/selftest/CLI/server/stats/diff/F2/v1.1/deploy
main.py            ASGI entry for serverless hosts (the same app, no uvicorn)
vercel.json        two services: web (Next.js) + api (FastAPI); /api/* to api
scripts/           check_export.py: the static-export contract (pages, articles, links)
Makefile           install / lint / test / selftest / demo / verify / ui / site / serve
SECURITY.md        how to verify the repo's claims, how to report
CONTRIBUTING.md    the evidence doctrine, how to add families and pages
CHANGELOG.md       keep-a-changelog
```

## Cited research

The gap statement above is not opinion; it is the 2026 research
converging on one point: the judge lives inside the tool, and the
artifact does not survive the stranger.

- RAND, "Judge Reliability Harness" (2026), arXiv:2603.05399 — "no
  judge that we evaluated is uniformly reliable across benchmarks";
  verdicts flip on reformatting, paraphrasing, verbosity.
- "When the Judge Changes, So Does the Measurement" (2026),
  arXiv:2607.08535 — judge upgrades are not interchangeable; where raw
  outputs were not shipped, the debate numbers cannot be re-audited.
- "Bias in the Loop" (2026), arXiv:2604.16790 — no standard
  quantification of consistency for the judgments.
- "Necessary but Not Sufficient" (2026), arXiv:2606.26185 — even at
  temperature 0 borderline items stay non-reproducible; the grader
  disagreement rate and the resolved endpoint belong in the results
  artifact.
- OWASP Top 10 for Agentic Applications (2026 edition, published
  2025-12-09) — the taxonomy the F-families map onto; MITRE ATLAS and
  NIST AI RMF as adjacent vocabularies.
- Tool landscape (2026): garak, PyRIT, promptfoo (OpenAI), DeepTeam,
  Giskard, AgentDojo on the attack side; OpenAI Evals, DeepEval,
  Inspect AI, LangSmith, Braintrust, Phoenix on the scoring side.

## License

MIT. (c) 2026 Timothy Olusanya.
