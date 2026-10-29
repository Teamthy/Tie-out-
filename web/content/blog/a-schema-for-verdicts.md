The bundle format is a design exercise in one question: what has to be true of a file for a stranger to trust the verdicts inside it?

The answer this repository settled on is a newline-delimited JSON file with five kinds of record, one hash chain, and one rule that nothing is ever edited in place.

## The file

```text
runs/<id>/
  bundle.jsonl        the record
  manifest.sha256     sha256 of bundle.jsonl, one line
  verify_report.json  the last stranger-verify result (optional, local only)
```

`bundle.jsonl` is canonical JSON, one record per line. Line zero is always the manifest. Every subsequent record carries a `record_hash`: the sha256 of the record's canonical form with the `record_hash` field removed.

## Five record types, two of them chained

| type | chained | carries |
|---|---|---|
| `manifest` | no | `run_id`, `provenance`, `expected_item_ids`, `emitted_item_ids`, counts, `tail_event_hash`, `controls_fp`, `controls_fn`, and (v1.1) `statistics` |
| `event` | **yes** | `event_id`, `item_id`, `family`, `check`, `policy_version`, `action`, `decision`, `judge`, `judge_endpoint`, `target_endpoint`, `effect_ref`, `raw_input`, `raw_output`, `detector_fired`, `why`, timestamps, `prev_hash`, `record_hash` |
| `control` | **yes** | `control_id`, `kind`, `crafted_raw`, `detector`, `expected_fire`, `fired`, `verdict`, `note`, `prev_hash`, `record_hash` |
| `judge_audit` | no (hashed separately) | `judge`, `anchors_total`, `anchors_agreement`, `perturbation_flips`, `disagreement_rate`, `self_preference_clean`, `details` |
| `gap` | no | `gap_id`, `code`, `scope`, `reason` |

Events and controls share one chain in file order. The audit and any gap records sit outside it — they are statements about the judge or about what could not be checked, not verdicts about the target — but verify re-hashes them separately and raises `G-RECORD` if one has been edited.

## Pre-assigned ids do three jobs

Every item in a suite has an id assigned *before* the attempt, from the family declaration rather than from the run. `F1-T4-R1-mixed` exists as an identifier even if the target errors, the process dies, or the record never gets written.

That single decision pays for itself three times:

**A run cannot be silently trimmed.** A missing event is a `G-MISSING` gap with the id in scope, plus a manifest count mismatch. Without pre-assignment, a dropped item is just a smaller denominator and a slightly nicer pass rate.

**Two runs align by construction.** The stability diff is a join on ids, with nothing to match heuristically. No fuzzy matching of prompts, no "approximately the same question", no model in the comparison.

**The report and the record cannot drift apart.** The manifest's `event_count` must equal the number of event lines, and verify checks it. A reader who sees "14 events" in a chart and 13 lines in the file has found a bug, not a rounding difference.

## Canonicalization is part of the format

Hashing is only as strong as the serialization it hashes, so the canonical form is defined in code rather than implied:

```python
text = json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
return text.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
```

Sorted keys, compact separators, UTF-8. The third line exists because of a real bug, and it is the most interesting line in the file.

U+2028 (LINE SEPARATOR) and U+2029 (PARAGRAPH SEPARATOR) are legal unescaped characters inside a JSON string. `json.dumps` leaves them raw. Python's `str.splitlines()` — and most line-oriented readers in other languages — treat them as line breaks anyway.

A record containing an unescaped U+2028 would therefore parse fine as JSON and split into two physical lines for any line-based reader, which would break the chain at the *reader* while every hash still checked out. Escaping both characters in `canonical()` keeps the invariant true in the file's bytes, where a stranger checks it with a text editor. Both forms parse back to the same character, so the escaping is lossless.

The invariant is enforced at the writer and tested with a hostile input. `tests/test_bundle_v11.py` runs a full bundle in which every answer is a string containing a forged record line, quotes, backslashes, a NUL, a U+2028, an emoji, a homoglyph, and a `<script>` tag (abridged here; the hash is a real 64 hex characters in the test):

```python
HOSTILE = (
    '{"type":"event","decision":"pass","record_hash":"0000…"}\n'
    'trailing " quote and backslash \\ and control \x00 \u2028 and emoji 🎭 '
    'and homoglyph АBORT and <script>alert(1)</script>'
)
```

Fourteen events, all hostile, the bundle writes, verifies clean, and every raw round-trips exactly. If a record could span two lines, the forged record line inside the raw would become a real record.

## Versioning without breaking the past

The format is versioned in the manifest: `tieout-bundle/v1`, then `tieout-bundle/v1.1`. v1.1 added the `statistics` block (per-family counts, pass rates, exact intervals) and the `provenance.packages` map plus its hash. Both are optional on read and always written on write.

The verifier branches on the declared version and checks the field set that version promises. The repository carries both generations: the v1 demo run from harness 0.2.0 and the v1.1 family and stability runs from 0.3.0, and all four pass the same verify procedure today.

A schema that cannot verify its own history is not a schema; it is a migration debt with a version number. The test that asserts the old bundle still verifies is therefore as important as any test of the new fields.

## What the schema refuses to do

**No in-place edits.** A correction is a new record, not a rewritten one. The chain is append-only by construction, and a record whose content changed is a `G-HASH` gap on the very next line.

**No silent absence.** Anything that could not be decided is an `undetermined` event plus a named gap, and undetermined counts against the pass rate rather than disappearing from it.

**No meaning-changing flags.** There is no "strict mode" that quietly re-scores a bundle, because a flag that changes what was measured forks the data, and forks in data are where audits go to die. The CLI's flags change output format, not semantics.

**No implicit coercion.** The format does not infer a verdict from a score, or a score from a verdict. `decision` is one of `pass`, `fail`, `undetermined`, and each means exactly what the format document says it means: `fail` = the detector fired, `pass` = the detector was silent, `undetermined` = no decision was possible and the gap says why.

## The cost, honestly

The schema costs bytes. The twenty-four-line F1 bundle is 22 KB of mostly raw text, and every record repeats the policy hash and judge identity rather than referencing a table. That repetition is deliberate: a record that needs a lookup table to be interpretable is a record that cannot be read with a text editor six years from now.

It also costs the convenience of retroactive editing: nobody can fix a typo in a committed bundle without invalidating it. The answer is a new bundle, and the old one stays as what it was — which is the entire point of calling it a record.

## The manifest line

Everything else in the file is described by the first line:

| field | what it fixes |
|---|---|
| `run_id` | `20261029T211725Z-bdce11` — UTC timestamp plus a short random suffix |
| `event_count` / `control_count` | 14 and 8 — counts verify will check against the file |
| `expected_item_ids` | the fourteen ids assigned before the run |
| `emitted_item_ids` | what actually got written |
| `controls_fp` / `controls_fn` | the writer's claim, recomputed by the verifier |
| `tail_event_hash` | the last chained record, recorded outside the chain |
| `provenance` | harness, policy, dataset, environment, seed, packages |
| `statistics` (v1.1) | per-family counts, pass rate, exact interval |

Two of those fields exist only to make absence visible. `expected_item_ids` lets the verifier say *which* item is missing, and `event_count` lets it say *how many* should have been there. Without them, a truncated bundle is a smaller bundle, and the difference between "the run lost an item" and "the suite had thirteen items" would be a question for the author.

## Canonical form, by construction

The serialization rule is short enough to state exactly: JSON with sorted keys, compact separators, UTF-8, U+2028 and U+2029 escaped. Every record is written through that one function, and every hash is computed over its output.

That matters because a hash chain is only as stable as its serialization. `json.dumps` with default separators, or with `ensure_ascii=True`, or with insertion-ordered keys would produce different bytes for the same logical record on different machines, and a stranger recomputing the hash would get a mismatch that says nothing about tampering. Pinning the form removes an entire class of false accusation.

The escape rule is the subtle one. U+2028 is legal inside a JSON string, and `json.dumps` leaves it raw — but `str.splitlines()` treats it as a line break, so a record containing it parses as one line and reads as two. A forged line inside a `raw_output` would therefore become a record to any line-based reader while every hash still verified. The writer escapes both characters, and `tests/test_bundle_v11.py` runs a full suite where every answer contains a fake record, a U+2028, a NUL, an emoji and a `<script>` tag:

```python
# abridged to the assertions that matter
def test_hostile_raw_survives_the_chain(tmp_path):
    run_suite(get_family("F1"), HostileBot(), out_dir=tmp_path / "h")
    lines = (tmp_path / "h" / "bundle.jsonl").read_text().splitlines()
    events = [json.loads(ln) for ln in lines[1:] if json.loads(ln).get("type") == "event"]
    assert len(events) == 14
    for e in events:
        assert e["raw_output"] == HOSTILE      # exact round-trip, no mangling
    v = verify_bundle(tmp_path / "h", family=get_family("F1"))
    assert v.ok and not v.gaps
```

Fourteen hostile answers, one line each, chain intact, raws byte-identical. If the canonical form were a convention instead of a function, that test would be a hope.

## Versioning, and the cost of a field

v1.1 added two fields and changed no existing one. The rule that makes this safe is written into the format document: both fields are optional on read, always emitted on write, and the verifier branches on the declared marker.

The consequence is that the repository holds two generations at once and verifies both. `runs/demo` is a v1.0 bundle from harness 0.2.0: no `statistics`, no `packages`, and a `tieout verify` that still returns PASS with no gaps. `runs/demo-f2` is v1.1 and carries both. A reader can diff the two manifests and see exactly what changed, which is the test of whether a version number is doing its job.

A schema that cannot read its own history is not a schema; it is a migration waiting to be scheduled. This one was designed so the migration is a branch in the verifier instead of a rewrite of the artifacts.

## What the schema refuses

It refuses in-place edits: a correction is a new record or a named gap, never a rewritten line. It refuses silent absence: an undecided item is `undetermined` with a gap, and undetermined counts against the rate. It refuses meaning-changing flags: the CLI has no strict mode that re-scores, because a flag that changes what was measured forks the data.

Those refusals are cheap to state and expensive to keep. They are the reason a bundle is a record rather than a report with a hash bolted on.

---

**Verified against:** `docs/bundle-format-v1.md`, the published schema; the `schema` field of `runs/demo/bundle.jsonl` (`tieout-bundle/v1`) against `runs/demo-f2/bundle.jsonl` (`tieout-bundle/v1.1`); `tieout/hashing.py` for the canonical form and the one-record-one-line rule; `tieout/bundle/verify.py` for the fields verify actually reads; and `tests/test_bundle_v11.py` for U+2028/U+2029 escaping and the hostile-raw round trip.
