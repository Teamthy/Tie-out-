Most evaluation output is shaped for reading, not for checking. A JSON report with nested summaries is pleasant in a dashboard and useless in a dispute, because the summarisation has already destroyed the thing the dispute is about. The record format here makes the opposite trade: it is verbose, line-oriented, and boring, and the boring part is what makes it survive contact with a stranger.

This piece is a tour of the schema: what one record contains, what the manifest pins, which invariants the bytes obey, and how version 1.1 added fields without invalidating version 1.0.

## One line per decision

A bundle is `bundle.jsonl`: the manifest on line 1, then one line per verdict event, one line per negative control, then the judge audit and any named gaps. Line-delimited JSON is chosen for three reasons.

Append-only writing. A run can stream records as it executes rather than buffering a document in memory and hoping the process survives.

Readability without tooling. A stranger opens the file in a text editor and sees the record. No schema registry, no binary decoder, no version of the app required to render it.

Line-granular tamper evidence. Deleting a line breaks the chain and the counts at once, which is a named gap (`G-MISSING` next to `G-HASH`) rather than a silently shorter document.

## The verdict event, field by field

The event is the unit that carries the four-part binding the format is built around: the action, the policy version, the decision, and the effect reference. Everything else is context that makes the binding checkable.

| field | role |
|-------|------|
| `event_id` | the pre-assigned id of this attempt, assigned before the run |
| `item_id` | the item in the family declaration, also pre-assigned |
| `family`, `check` | which check family and which check group judged it |
| `action` | the human-readable action the item performs |
| `policy_version` | hash of the family declaration that defines the check |
| `decision` | pass, fail, or undetermined |
| `effect_ref` | reference binding the decision to the attempt |
| `detector_fired` | the detector's raw boolean, before the pass/fail mapping |
| `judge` | identity of the judge: detector name, version and truncated hash |
| `judge_endpoint` | where the judgement happened, resolved, not configured |
| `target_endpoint` | where the target was called, resolved, not configured |
| `raw_input`, `raw_output` | the verbatim material the decision was made from |
| `why` | one line of reasoning, for a human |
| `started_at`, `finished_at` | per-record timing |
| `prev_hash`, `record_hash` | the chain link and the record's own hash |

Two of those rows are worth a sentence each, because they are the ones an evaluation dashboard typically omits.

`raw_output` is stored verbatim so the verdict can be recomputed later. Without it, verify could only check that the file is intact, not that the decision follows from the material.

`judge_endpoint` is the resolved endpoint, not the configured one. This is the difference between "we set OPENAI_BASE_URL to the vendor" and "the call that produced this judgement went to this host". A configuration is an intention; a resolved endpoint is a fact.

## The manifest

The manifest is line 1 and it is what a reader should read first. It carries `run_id`, `bundle_format`, `event_count`, `control_count`, `expected_item_ids`, `emitted_item_ids`, `tail_event_hash`, `controls_fp`, `controls_fn`, the provenance block, and, for v1.1, the `statistics` array.

The two id lists are the mechanism behind "absence is nameable". `expected_item_ids` comes from the family declaration before the run; `emitted_item_ids` is what the run produced; verify compares them and emits a `G-MISSING` gap per missing id. A check that was skipped cannot vanish into an aggregate, because the aggregate is not the only thing stored.

## The invariants of the bytes

Four properties hold for every record, and they are what make the hash meaningful across writers.

1. Canonical hashing. `json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)`, then U+2028 and U+2029 escaped so a record stays one physical line.
2. The record's hash excludes the `record_hash` field only. Every other field, including `prev_hash`, is covered.
3. The first record links to `GENESIS`, sixty-four zeros, so the chain has a defined start that is not "whatever was there first".
4. The manifest pins the tail. A chain with a valid interior and a different last record is caught by `tail_event_hash`, not just by the walk.

## What the trailing records are, and are not

The judge audit and the named gaps are appended after the verdicts, each with its own `record_hash`, and verify recomputes those hashes (a mismatch is `G-RECORD`). But they are not part of the `prev_hash` chain: the chain covers events and controls.

That is a deliberate limitation, not an oversight, and it is documented in the format spec. An audit record is generated after the verdicts are complete, so chaining it would put a post-hoc artifact inside the decision chain. The trade is that an edited audit line is caught by its own hash but a wholesale rewrite of the tail of the file is caught by the file hash rather than by the link structure. Naming the trade is the point.

## Version 1.0 to 1.1: additive, on purpose

`runs/demo` is `tieout-bundle/v1`, written at 0.2.0. It has no `statistics` array, no `packages`, no `packages_hash`. `runs/demo-f2` is `tieout-bundle/v1.1`, written at 0.3.0, and has all three.

Both verify, unchanged, under the current verifier. The version bump added fields and did not repurpose any, so a reader written for v1.1 can read a v1.0 file by treating the new fields as absent, and verify is written exactly that way.

The rules that keep this true are worth stating as a policy, because they are the reason an evidence format can survive its own improvement:

- add fields, never repurpose one
- a new required field is a new format version, and old bundles are still valid under their own version
- a reader must accept every earlier version it claims to support, and say which contract it applied
- breaking changes get a new format name, not a new version number

## What the schema deliberately does not do

It does not store a signature. `manifest.sha256` is a one-line value that a deployment can sign, and each deployment decides its own key management. Baking a signature scheme into the format would tie every bundle to one identity provider.

It does not store a verdict for the bundle as a whole. The bundle is a record; `verify` issues the only verdict the format produces, and it is about re-derivability, not about whether the target is good.

It does not compress. A committed F1 bundle is small; the reason to keep it plain is that a stranger should be able to `head -1` it and read the manifest.

## Reproduce it

```
head -1 runs/demo-f2/bundle.jsonl | python -m json.tool | head -40
sed -n 2p runs/demo-f2/bundle.jsonl | python -m json.tool
```

The first line is the manifest with every pinned value; the second is a complete verdict event with its chain link. Between them they contain everything the format claims, which is why the spec can be read in fifteen minutes and checked in ten.
