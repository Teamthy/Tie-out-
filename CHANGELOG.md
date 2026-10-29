# Changelog

All notable changes to this project are documented here. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-10-29

### Added

- **Stability diff** (`tieout diff RUN_A RUN_B`, `/api/diff`, the
  `#/compare` page): aligns two bundles by pre-assigned id and reports
  verdict drift versus transcript drift separately, with each run's
  pass rate and exact CI. Committed stability pair at
  `runs/demo-stability/{a,b}` (seeds 0 and 7) with the diff report
  committed as evidence: 14/14 verdicts stable, 10 transcripts drifted.
- **Exact confidence intervals** (`tieout/stats.py`): Clopper-Pearson
  95% intervals by bisection on the binomial CDF (math.comb only, no
  scipy, no normal approximation). Stored in the manifest before the
  bundle is closed; undetermined counts against the pass rate by
  doctrine.
- **Family F2, state and recovery**: the failure-mode matrix rows made
  executable. Checks E (evidence at decision time), P (persistence),
  R (recovery), V (independent verification); 8 items (designed break +
  documented hold per check on the sample fixture), 8 negative
  controls, its own judge audit with crafted extra anchors and a
  one-tell NAIVE variant. Committed evidence at `runs/demo-f2`
  (4 fail / 4 pass, 0 FP / 0 FN, verify PASS).
- **Environment-locked provenance**: pinned package versions and their
  hash in the manifest (v1.1 field).
- **Sample agent surface-drift seed** (`--seed`): deterministic
  cosmetic variation of the transcripts with the verdicts fixed, so a
  keyless run can demonstrate stability.
- Selftest point 8: two sample runs (seeds 0 and 7) must show zero
  verdict flips and visible transcript drift. The selftest is now
  8-point.
- Test suite: stats properties (including the documented 0/10
  reference interval), diff (alignment, flip detection, dropped items,
  family mismatch, missing bundle), F2 contract, v1.1 backward
  compatibility against the committed 0.2.0 bundle, hostile-input
  chain hardening. 40 tests.
- Docs: format v1.1 addendum (additive fields, backward compatibility
  rule, the one-record-one-line canonicalization invariant), method
  note (stability + statistical rigor), harness spec (families,
  stability diff), matrix (F2 operationalization), README
  (architecture invariants, proving stability, page table).
- CI: the committed demo-f2 and stability-pair runs verify, and the
  stability diff asserts zero verdict flips, on every push.

### Changed

- Bundle format v1.1 (additive; v1.0 bundles still verify, enforced by
  a test on every commit).
- `canonical()` escapes U+2028/U+2029: the one-record-one-line
  invariant now holds in the file bytes for every possible raw.
- Judge audit inputs (extra anchors, NAIVE variant) are declared by the
  family, not imported from a F1-specific module.
- Web: compare page + nav; run detail shows the exact CI, the
  environment packages, and the bundle format; landing capabilities
  section; families page renders F2 and its ASI mapping.

## [0.2.0] - 2026-10-29

### Added

- Full evidence model in code: P1 verdict events on a hash chain with
  pre-assigned ids and effect references; P2 provenance; P3 negative
  controls with per-run FP/FN; P4 named gaps (G-MISSING, G-HASH,
  G-VERDICT-MISMATCH, G-CONTROL, G-RECORD, G-TARGET, G-PROVENANCE);
  P5 stranger-safe re-derivation (`verify`); P6 judge audit (anchor
  agreement, perturbation flips, disagreement rate, self-preference
  probe).
- Family F1: the five failure checks ported unchanged from
  ai-redteam-five-tests (d95a57e); deterministic SampleOrderBot;
  LiveAdapter for any OpenAI-compatible endpoint.
- CLI: `run`, `demo`, `verify`, `gaps`, `judge-audit`, `selftest`,
  `serve`.
- Bundle format v1 with a written spec (`docs/bundle-format-v1.md`).
- Web UI: Next.js (static export, black and white) with landing, runs,
  run detail, method, format, matrix, harness, and families pages,
  plus in-page stranger verify.
- Docs: README (gap-first, cited research), harness spec, method note,
  failure-mode matrix, SECURITY.md, CONTRIBUTING.md, CHANGELOG.md.
- CI: backend (ruff, pytest, selftest) + frontend (npm ci, build).
- Makefile for the common commands.
- Committed reproducible demo run at `runs/demo`.

### Changed

- Frontend rebuilt on Next.js (previous static build superseded).
- Positioning consolidated around the evidence layer; repository is the
  public artifact of the practice.

## [0.1.0]

### Added

- M1: the five F1 checks emitting P1 verdict events with P2 provenance
  stubs; the 7-point selftest; the deterministic sample agent.
  (Rebuild of record; see the project spec in the private record.)
