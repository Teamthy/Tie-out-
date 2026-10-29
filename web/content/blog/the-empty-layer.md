The tooling landscape for agent security is crowded in three layers and empty in the fourth. The full argument lives in `docs/method-note.md`; this is the short version, with the artefacts to back it.

## Three crowded layers

**Attacks are commoditized.** garak, PyRIT, promptfoo, DeepTeam, Giskard, AgentDojo. Running an attack suite against an agent is a solved logistics problem: install, point at an endpoint, read the report.

**Scoring is commoditized.** OpenAI Evals, DeepEval, Inspect AI, LangSmith, Braintrust, Phoenix. Turning a run into a number is solved plumbing, and mostly solved by people who were already building observability.

**Taxonomy is standardized.** The OWASP Top 10 for Agentic Applications, MITRE ATLAS, the NIST AI RMF. Naming the threat is no longer the hard part.

Those three layers are real infrastructure. The exception is the fourth.

**Evidence is empty.** Nobody in the landscape emits an artifact that survives contact with a stranger.

## The self-grade

The reason the fourth layer is empty is structural rather than accidental. Every tool in the crowded layers uses a judge that lives inside the tool. The evaluator and the evaluated share an operator, the same credentials, the same process, often the same model family.

A green eval from such a tool is a self-grade: the exam was set, administered, marked, and archived by the same party that took it. That is not an accusation of dishonesty. It is an observation about the shape of the output — nothing in it can distinguish "the agent held" from "the judge thought the agent held", because the judge's own failures are not in the artifact.

The research the method note cites names the failure modes precisely. No judge is uniformly reliable (RAND, 2026). Verdicts flip under reformatting and verbosity. Judge upgrades are not interchangeable. And where raw outputs were not shipped, the numbers cannot be re-audited — which means the argument about them is settled by whoever owns the tool, because only they can look under the hood.

## What the missing layer looks like

Not a bigger judge. Not a second opinion from another model at the same vendor. A record with three properties:

1. **Every verdict is bound to the raw that produced it**, with the policy version and judge identity in the same event.
2. **The record is chained and hashed** so a stranger can detect tampering without trusting the tool that wrote it.
3. **The judge's own error rates are measured in the same run**, on inputs the judge did not generate.

This repository's committed bundles are the artifact for that spec, and they are the reason the site links to run pages instead of screenshots. A screenshot is a claim; a bundle is a record.

The difference is mechanical and unglamorous: a JSONL file, a hash chain, sixty lines of exact statistics, and a verifier that refuses to call anything a pass it cannot re-derive.

## The honest scoreboard

The method note does not claim the landscape is indifferent to evidence. It claims the artifact is absent. The distinction matters, because it makes the position falsifiable and it names what would change it.

What would count as the fourth layer being filled, by someone else: a mainstream eval tool shipping the raw response behind every score, a chain over those records that a stranger can walk, the judge's calibration numbers including its error rate on anchors it did not write, and a re-derivation command that runs offline. Any three of those is a report. All four is a record.

Until then, the choice is between a number you can read and a number you can check. Most of the industry has settled on the first, and the settling is so complete that the second is rarely missed.

## The crosswalk, including the rows that are not done

Naming the threat is the solved layer, so this repository's mapping to the OWASP Agentic list is deliberately modest. `tieout/mappings/asi.py` records six rows, and the status column is the honest part:

| ASI | title as recorded | family | status |
|---|---|---|---|
| ASI01 | Agent goal hijack | F1 (T1, T3) | mapped |
| ASI02 | tool misuse (planned family F3) | F3 (planned) | planned |
| ASI03 | identity (planned family F4) | F4 (planned) | planned |
| ASI06 | memory (planned family F5) | F2 (P, proposed), F5 (planned) | mapped |
| ASI09 | human trust (planned family F6) | F6 (planned) | planned |
| ASI10 | Rogue agents | — | recorded |

Three rows planned, two mapped, one recorded without a family, and an explicit note that the F1 sub-check mapping is *proposed* pending confirmation against the full 2026 list. That is the same discipline the bundles apply to verdicts: anything that could not be verified is recorded, not dropped.

The module docstring says it in one line: "where the spec does not record a title, the row says so."

## What this is not

Not another probe library. garak and promptfoo own attack generation; F-families consume their patterns and turn the results into records.

Not an LLM observability dashboard. This site renders tieout's own bundles, runs their verify, and diffs two runs. It does not want your traces.

Not a judge model. The harness measures judges; it does not ship one. The judge here is a set of pure functions, and it is audited on every run precisely because it is not smarter than that.

Not a compliance platform. It emits the evidence; platforms map it to their frameworks and decide what to do with it.

## The claim, stated so it can fail

Agent security has spent three years getting very good at generating attacks and very good at scoring them, and comparatively little time building artifacts that survive being handed to someone who does not trust you. The gap is not technical sophistication. It is a missing format, a missing verifier, and a habit of shipping numbers without the raw behind them.

The bet here is that the fourth layer is the one that compounds: the layer where a stranger, years later, with no key and no network, can still say whether the run happened the way it was reported.

## What each crowded layer actually hands you

It is worth being concrete about where each layer stops, because "evidence is missing" is easy to say and hard to check.

**An attack run** hands you a set of prompts, a set of model responses, and a per-probe verdict. If the tool is good, it also hands you a score. What it rarely hands you is a record that binds a verdict to a response with a policy version, in a form someone else can re-check after the tool is upgraded.

**A scoring platform** hands you an experiment, a dataset, a set of scores, and a UI for comparing them across runs. What it does not hand you is the judge's calibration: the platform's scoring function is the thing being trusted, and its error rate on inputs with known answers is not part of the artifact.

**A taxonomy** hands you a shared vocabulary — ASI01, ASI02, and so on — and a mapping exercise. It cannot hand you a record, because a taxonomy has no run in it.

Each layer is genuinely useful and each stops one step short of the artifact an auditor needs. The step is not research; it is bookkeeping done with unusual care.

## What the fourth layer costs

An evidence layer is not free, and pretending otherwise is how projects end up with a hash chain and no users.

It costs **effort at write time**: pre-assigned ids, a canonical serialization, controls written by hand, an audit computed on every run. None of that is hard; all of it has to be decided before the first bundle is written, because retrofitting pre-assignment onto a bundle without ids means the missing items can never be named.

It costs **honesty at read time**: the pass rate comes with an interval, the interval is wide, the judge flips on paraphrase, and the deployment is three services short of a compliance platform. A record that says all that is less flattering than a dashboard that says 94% green, and it is more useful.

It costs **bytes**: a 22 KB JSONL file per run, checked into git, forever. That is the cheapest of the three.

The reason to pay is that the fourth layer is the one that compounds. Attacks get commoditized, scores get commoditized, and taxonomies get standardized — but an artifact that a stranger can re-derive in five years is worth more than any of them, because it is the only one that can still answer a question after everyone who ran it has moved on.

---

**Verified against:** `docs/method-note.md`, where the gap paragraph and the six pillars are stated as doctrine; `README.md`, where the same six pillars appear as code; `docs/harness-spec.md`, which named `G-ASI-MAPPING`, `G-WAL` and `G-ISSUANCE` as standing gaps; and the `gaps` line of `tieout verify` on `runs/demo` and `runs/demo-f2`, which returns `no named gaps` for both — the two statements the argument depends on.
