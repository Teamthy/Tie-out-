Every claim in this repository reduces to one operation: a stranger opens a file and recomputes it. Not "reads and believes", not "runs the tool and gets the same summary". Recomputes. If that operation is not possible, the artifact is a screenshot with better formatting.

This piece is about the mechanics of that operation, because the mechanics are the argument. A hash chain is not impressive on its own; anyone can hash a string. What matters is which values are pinned, what is recomputed, what the failure looks like, and what the whole construction cannot prove.

## The chain

A bundle is line-delimited JSON. The first line is the manifest. The records that follow are the verdict events and the negative controls, in execution order, each one linked to the previous.

Every record carries two hash fields:

- `prev_hash`: the `record_hash` of the record before it. The first record's `prev_hash` is the genesis value, sixty-four zeros.
- `record_hash`: the sha256 of the record's canonical form, with its own `record_hash` field removed.

The manifest, which comes before any of them and is therefore outside the chain, pins the chain's end: `tail_event_hash` must equal the last record's hash, `event_count` and `control_count` must equal the counts actually present, and `expected_item_ids` must all appear. Beside the bundle file sits `manifest.sha256`, one line, the sha256 of the bundle file itself.

Four independent values, then, all of which must agree: the per-record link, the tail in the manifest, the counts, and the file hash. A single edited character inside any record breaks the first two at once, because that record's hash no longer recomputes and every subsequent `prev_hash` points at a hash that no longer exists.

## Canonical form, stated exactly

Hashing JSON is only meaningful if two writers serialise identically. The rule here is one function, used by the writer and by verify, with no options:

```
json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
```

Sorted keys, compact separators, no ASCII escaping. Then one addition that exists for a physical reason: U+2028 (LINE SEPARATOR) and U+2029 (PARAGRAPH SEPARATOR) are legal unescaped inside a JSON string, but line-based readers treat them as line breaks, and the bundle's whole premise is one record per physical line. Both are escaped explicitly, and both parse back to the same character, so the escape is lossless.

Three invariants follow, and all three are checkable by eye:

1. One record is one line, always. No pretty-printing, no embedded newlines.
2. Field order in the file is irrelevant to the hash, because keys are sorted at hash time. A stranger can re-serialise a record's fields in any order and get the same digest.
3. No field can be added to, removed from, or changed in a record without changing its hash, because the hash covers every field except `record_hash` itself.

## Walking it yourself

You do not need the CLI to check this. Two snippets, both dependency-free beyond the package:

```
python - <<'PY'
import json
from tieout.hashing import record_hash
lines = [json.loads(l) for l in open("runs/demo/bundle.jsonl") if l.strip()]
rec = [l for l in lines if l.get("type") == "event"][0]
print("record hash recomputes:", record_hash(rec) == rec["record_hash"])
PY
```

```
python - <<'PY'
import json
lines = [json.loads(l) for l in open("runs/demo/bundle.jsonl") if l.strip()]
prev = "0" * 64
for i, rec in enumerate([l for l in lines if l.get("type") in ("event", "control")], 1):
    assert rec["prev_hash"] == prev, f"link broken at record {i}"
    prev = rec["record_hash"]
print("chain length:", i, "tail:", prev == lines[0]["tail_event_hash"])
PY
```

The second snippet is the entire integrity argument of the format, in ten lines. It says: the links hold and the last link is the one the manifest promised.

## What verify does with it

`tieout verify` runs five checks in order, and reports each.

| # | check | what it catches |
|---|-------|-----------------|
| 1 | walk the chain | `G-HASH`: a `prev_hash` that does not link, or a record hash that does not recompute |
| 2 | manifest cross-checks | `G-MISSING` on count mismatch, `G-HASH` on a tail or file hash mismatch |
| 3 | pre-assigned ids present | `G-MISSING` naming the item that has no verdict record |
| 4 | re-derive every verdict | `G-VERDICT-MISMATCH` when the stored raw output no longer produces the stored decision |
| 5 | trailing records | `G-RECORD` when the judge audit or a gap record fails its own hash |

The fifth check exists because the judge audit and the named gaps are stored as records with hashes but are deliberately outside the `prev_hash` chain. They are appended after the verdicts, and the chain does not pass through them. verify still recomputes their hashes, so an edited audit line is caught, but it does not claim the audit is chained. That distinction is in the format spec on purpose.

The whole verifier reports through six gap codes: `G-MISSING`, `G-HASH`, `G-VERDICT-MISMATCH`, `G-CONTROL`, `G-RECORD`, `G-PROVENANCE`. A bundle with any gap is a FAIL, and the gaps are named with their scope (a line number, an item id, a manifest field) rather than summarised.

## The failure modes, on purpose

The harness selftest builds the failures so they are not theoretical. Point 5 of the eight-point selftest edits a single character in a bundle and asserts the verifier reports `G-HASH`. Point 6 deletes a line and asserts the verifier reports both `G-HASH` and `G-MISSING`, because the deletion breaks the count and the tail at the same time as it breaks the link.

Run against the committed bundles, verify prints, for `runs/demo`:

```
chain  : 22 records, intact
file   : sha256 match
items  : 14/14 pre-assigned ids present
re-derive: 14/14 verdicts re-derived from stored raw
controls: 8 re-derived, 0 FP / 0 FN
gaps   : none
VERDICT: PASS (re-derivable by a stranger)
```

and for `runs/demo-f2`, a 16-record chain, 8/8 re-derived, 8 controls, no gaps.

The re-derivation line is the one that matters most. Everything above it proves the file is internally consistent; that line proves the decisions follow from the stored raw outputs under the family's detectors. A consistent file of fabricated decisions would pass the first four checks and fail this one, unless the fabrication also rewrote the raws. Which brings us to the honest limit.

## What this cannot prove

A chain proves internal consistency and tamper evidence. It does not prove that the raw outputs came from the model they claim to. An adversary who edits `raw_output` and then recomputes every hash in the chain, the tail, the counts and the file hash produces a bundle that verifies perfectly. Hash chains are not signatures and this format does not pretend otherwise.

Three things do work against that adversary, and it is worth being precise about what each buys.

Provenance. The manifest names the agent, the model, the endpoint of every judge and target call, the dataset hash, and the policy version hash. Recomputing a hash chain does not let you invent `judge_endpoint: local:deterministic detector (no network, no model)` convincingly for an event you fabricated on a different machine.

Distribution. The committed bundles are in git next to the code and the CI re-verifies them on every push. A rewritten bundle is only convincing to someone who does not compare it with the published copy, and the published copy is a commit hash.

Sayability of absence. The manifest lists the ids that should exist, and verify treats a missing id as a named gap rather than an omission. A dropped record cannot silently disappear; it becomes `G-MISSING` with the item id in scope.

None of that is a signature scheme. If you need non-repudiation, sign the file hash with a key and publish the signature; the format's `manifest.sha256` is exactly the value to sign, and it is one line so it is easy to sign well. The format leaves that to the deployment because a key is an operational decision, not a format decision.

## Reproduce it

```
pip install -e .
tieout selftest
tieout verify runs/demo
tieout verify runs/demo-f2
```

The selftest is the adversarial half: eight points, including the one-character edit and the dropped line. If points 5 and 6 do not report `G-HASH` and `G-HASH,G-MISSING`, then the verifier is weaker than this article claims, and the output tells you so without asking you to trust it.
