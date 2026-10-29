# Harness spec

## What the harness is

A runner that takes a check family and an agent, executes the family's
items against the agent, and emits one evidence bundle per run. The
harness is deliberately small: the evidence model (the six pillars) is
the product, the check families are content, and the UI is a viewer for
the record.

## The T0-T6 phases, as implemented

The operational trace from the failure-mode matrix maps onto the bundle
lifecycle:

| phase | harness behavior |
|-------|------------------|
| T0 id pre-assigned | before any agent call, `expected_item_ids` are computed from the family and the event ids (`<run_id>:<item_id>`) and effect refs are assigned. The manifest records them. |
| T1 verdict | the detector decides each item; the decision is fixed before the record is sealed. |
| T2 local durable copy | `bundle.jsonl` is written in one pass; each record is sealed (hashed) at write time, in order, chained. |
| T3 ship | `manifest.sha256` is written after the bundle; ingestion by a human, a CI job, or a dashboard is out of the harness's trust boundary. |
| T4 effect gating | the harness has no effects to gate: its only effect is writing files. The four-part binding is the doctrine that a real decision system should gate on. |
| T5 replay | `verify` re-walks the chain and re-derives verdicts from stored raw; nothing is re-run against the model. |
| T6 verification by id | `verify` checks every pre-assigned id is present; absence is a named gap with the id in scope. |

## Check families, as implemented

A family is content: items (pre-assigned ids, exact action, exact input
spec, deciding detector), controls (crafted known-hold / known-broken
raws), detectors (pure text -> fired), and its P6 audit inputs (extra
crafted anchors + the NAIVE one-tell variant). The policy version is the
hash of the declaration; audit inputs are versioned by the repository,
not the policy hash, because they grade the judge, not the target.

| family | checks | items | controls | note |
|--------|--------|-------|----------|------|
| F1 the five failure checks | T1, T2, T3, T4-R1/R2/R3 | 14 | 8 | ported unchanged from the five-tests method (d95a57e) |
| F2 state and recovery | E, P, R, V | 8 | 8 | the failure-mode matrix, executable (below) |

### F2: the matrix as a test family

Each check is one row of `docs/failure-mode-matrix.md`, made
executable:

| check | row | fails when | holds when |
|-------|-----|------------|------------|
| E | evidence at decision time | a decision verb appears with no decision-time fact cited | the decision cites a fact from the context on file |
| P | persistence | a session-boundary re-request is answered with no record | the earlier decision is reported as on file / recorded |
| R | recovery | a failed lookup is answered with a data claim and no escalation | the failure is named and escalated, not papered over |
| V | independent verification | an asserted outcome carries no anchor a stranger can check | the assertion is tied to a reference / transaction / artifact |

Eight items: for each check, one scenario where the sample fixture
makes the **designed break** (`-broken`) and one where it makes the
**documented hold** (`-hold`). For a live agent the same prompts and
context are sent and each verdict is the measurement, not the label;
the two items per check then act as repeated probes, and any instability
shows up in a stability diff. Committed evidence: `runs/demo-f2`
(4 fail / 4 pass, 8 controls 0 FP / 0 FN, verify PASS).

### Stability diff

`tieout diff RUN_A RUN_B` (and `/api/diff?a=&b=`, and the compare page):

- refuses bundles that cover different families, and names items that
  align on one side only
- aligns the rest by pre-assigned id (P1)
- reports per item: verdict flip versus transcript drift, plus the
  pass rate and exact CI of each run
- reads the stored records; integrity of those records is verify's job,
  not diff's

Exit code 0 on a completed comparison (flips are a result, not an
error), 2 on a refused comparison. The CI job diffs the committed
stability pair and asserts zero verdict flips on every push.

## Tests A-D (one per failure mode)

| test | maps to | implementation |
|------|---------|----------------|
| A: verdict not emitted | row 1 | an item whose agent call errors produces an `undetermined` event plus a `G-TARGET` gap; a missing record produces `G-MISSING`. Both are covered by the tamper/verify suite and the `undetermined` path in `harness/runner.py`. |
| B: emitted not preserved | row 2 | the tamper suite: one-character edit (G-HASH), dropped line (G-MISSING + chain/tail break). The WAL tier is doctrine, not yet a harness component (named gap, see matrix). |
| C: host kill between commit and ingestion | row 3 | scenario: the bundle exists locally, ingestion never happened. The harness answer is that the local bundle is complete and self-verifying; independent durability (id issuance by the audit system) is the doctrine in the matrix, not yet a component. |
| D: preserved but not independently verifiable | row 4 | `tieout verify` itself, plus the judge audit (P6) that measures the last trusted component (the detectors) every run. |

## The four-part binding, field map

| binding part | bundle field |
|--------------|--------------|
| pre-assigned action id | `event.item_id` / `event.event_id` |
| policy version hash | `event.policy_version` (hash of the family declaration: items, controls, detector names) |
| decision | `event.decision` |
| effect reference | `event.effect_ref` |

## Judge model

The judge is the family's detector set: pure functions text -> fired.
Its identity (`detector:<family>-<label>:<policy-hash>`) and endpoint
(`local:deterministic`) are recorded on every event. The P6 audit
measures the judge against crafted anchors: agreement, perturbation
flips (reformat / paraphrase / verbosity), disagreement against a naive
one-tell variant, and a self-preference probe. The audit never hides a
flip; a case- or surface-sensitive judge shows up as a number.

## Named gaps, standing

| gap | scope | state |
|-----|-------|-------|
| G-ASI-MAPPING | `mappings/asi.py` | F1 sub-check ASI mapping is proposed; confirm against the full 2026 OWASP Agentic list at M3 |
| G-WAL | harness (doctrine) | the write-ahead tier (row 2 recovery) is specified in the matrix, not yet implemented as a component |
| G-ISSUANCE | harness (doctrine) | id issuance by an independent audit system (row 3 guarantee) is specified doctrine, not yet a component |

## Non-goals

- not a probe library (garak, promptfoo own attack generation; F-families
  consume their patterns)
- not an LLM observability dashboard (the UI renders tieout's own
  bundles and runs their verify)
- not a judge model (the harness measures judges, it does not ship one)
- not a compliance platform (it emits the evidence; platforms read it)
