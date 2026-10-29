# tieout bundle format, v1 (v1.1 addendum)

A run produces one directory:

```
runs/<id>/
  bundle.jsonl       the record
  manifest.sha256    sha256 of bundle.jsonl, one line
  verify_report.json the last stranger-verify result (written by verify, optional)
```

## Records

`bundle.jsonl` is newline-delimited JSON, one record per line, canonical
(sorted keys, compact separators, UTF-8). Line 0 is always the manifest.
Every record except the manifest carries a `record_hash`: the sha256 of
the record's canonical form with the `record_hash` field removed.

Record types:

| type        | chain  | fields (core) |
|-------------|--------|----------------|
| `manifest`  | no     | `run_id`, `provenance`, `expected_item_ids`, `emitted_item_ids`, `event_count`, `control_count`, `tail_event_hash`, `controls_fp`, `controls_fn` |
| `event`     | yes    | `event_id`, `item_id`, `family`, `check`, `policy_version`, `action`, `decision`, `judge`, `judge_endpoint`, `target_endpoint`, `effect_ref`, `raw_input`, `raw_output`, `detector_fired`, `why`, `started_at`, `finished_at`, `prev_hash`, `record_hash` |
| `control`   | yes    | `control_id`, `family`, `check`, `kind` (`known-hold` / `known-broken`), `crafted_raw`, `detector`, `expected_fire`, `fired`, `verdict`, `note`, `prev_hash`, `record_hash` |
| `judge_audit` | no  | `judge`, `anchors_total`, `anchors_agreement`, `perturbation_flips`, `disagreement_rate`, `self_preference_clean`, `details` |
| `gap`       | no     | `gap_id`, `code`, `scope`, `reason` |

## The chain (P1 / P5)

Events and controls form one hash chain in file order. Record 1 has
`prev_hash = 000...0` (64 zeros); every later record carries the previous
record's `record_hash`. `record_hash` covers every field of the record
including `prev_hash` and `raw_output`, so:

- reordering two lines breaks two links
- editing any character of any field breaks that record's hash
- deleting a line breaks the next link, the manifest tail, and the file
  hash, and leaves a pre-assigned id without a record (a named gap)

`manifest.tail_event_hash` must equal the last chained record's
`record_hash`; `manifest.sha256` must equal the sha256 of the file bytes.

## Pre-assigned ids (P4)

The manifest's `expected_item_ids` are assigned before the run, by the
check family, not by the runner. Absence is therefore nameable: a missing
verdict is a `G-MISSING` gap with the id in the scope, never silence.

## Gap codes

| code                 | raised when |
|----------------------|-------------|
| `G-MISSING`          | an expected id has no record, or a count / tail / file element is absent |
| `G-HASH`             | a chain link, record hash, tail hash, or file hash does not recompute |
| `G-VERDICT-MISMATCH` | a verdict re-derived from the stored raw differs from the stored one |
| `G-CONTROL`          | a negative control no longer re-derives as stored |
| `G-RECORD`           | a trailing record (judge audit / gap) fails its hash |
| `G-TARGET`           | the agent errored on an item (the event is `undetermined`) |
| `G-PROVENANCE`       | provenance or check identity is incomplete |

## Verdict semantics

`decision` is the item's outcome for the target: `fail` = the detector
fired (the target broke the check), `pass` = the detector was silent
(held), `undetermined` = no decision was possible, and the gap says why.
The bundle's overall verdict is the verify verdict, not a grade of the
target: `PASS` means the bundle re-derives for a stranger.

## Re-derivation (P5)

`tieout verify <run-dir>`:

1. re-walks the chain (prev links + record hashes)
2. cross-checks the manifest (counts, tail, file hash vs `manifest.sha256`)
3. checks every pre-assigned id is present
4. re-runs the family's detectors on the stored `raw_output` and
   `crafted_raw`, comparing with the stored decisions
5. re-hashes the trailing records

No model, no key, no network. The bundle either passes a stranger's
verify or it does not exist, as far as this project is concerned.

## Stability

Verdicts, item ids, and policy versions are stable across runs for a
deterministic agent. Timestamps and therefore record hashes differ per
run: a bundle is a record of when it was made, and the hash chain is the
integrity claim, not a reproducibility claim. Cross-run stability is
measured, not assumed: `tieout diff RUN_A RUN_B` aligns two bundles by
pre-assigned id and reports verdict drift versus transcript drift
separately (see the harness spec, section "stability diff").

## v1.1 addendum (additive, 0.3.0)

v1.1 adds two fields and changes nothing that v1.0 readers or writers
do. The format marker moves to `tieout-bundle/v1.1`; a bundle written
before 0.3.0 stays `tieout-bundle/v1` and must continue to verify.
This is a documented invariant, and the test suite checks it against the
committed 0.2.0 demo bundle on every commit.

1. `manifest.statistics` (list, one entry per family in the run):

   ```json
   {
     "family": "F1",
     "n": 14, "pass": 13, "fail": 1, "undetermined": 0,
     "pass_rate": 0.928571,
     "ci95": [0.661316, 0.998193],
     "checks": [{"check": "T1", "n": 3, "pass": 3, "fail": 0, "undetermined": 0}]
   }
   ```

   `ci95` is the exact Clopper-Pearson 95% interval for the pass rate
   (undetermined counts against the pass rate: a verdict the harness
   could not decide is not a hold). The interval is computed by
   inverting the binomial CDF (bisection on `math.comb`), with no
   external dependencies and no normal approximation: at n = 14 the
   approximation is not honest.

2. `provenance.packages` (map of name to version) and
   `provenance.packages_hash` (sha256 of the canonical sorted list):
   the pinned versions of the packages in force at run time. The
   watched set is declared in `provenance.py`, not inferred: the record
   claims the environment it was run in, and a stranger can diff the
   claim against their own.

Reader rule: both fields are optional. A verifier that meets a v1.0
bundle (fields absent) verifies it; a writer always emits v1.1.

## Canonical serialization invariant

One record is one physical line, always. The canonical form is sorted
keys, compact separators, UTF-8; additionally U+2028 (LINE SEPARATOR)
and U+2029 (PARAGRAPH SEPARATOR) are escaped. Both characters are legal
unescaped inside a JSON string, and `json.dumps` leaves them raw, but
line-based readers (Python's `str.splitlines` among them) treat them as
line breaks, which would split one record across two physical lines and
break the whole chain at the reader. Escaping them in `canonical()`
keeps the invariant true in the file bytes, where a stranger checks it
with a text editor. Both forms parse back to the same character.
