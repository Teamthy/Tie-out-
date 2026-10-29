A CLI is an API for machines, and its exit codes are its return values. Most tools in this space get this wrong in the same way: they exit 0 whenever they ran, and they print the verdict as text. That makes "could not evaluate" indistinguishable from "passed" at exactly the layer where the distinction costs money.

tieout uses three codes with one meaning each. The contract is small enough to hold in your head, and it is what lets CI gate on evidence rather than on log grepping. Except in one place, and that place is worth naming too.

## The three codes

| code | meaning | what a caller should do |
|------|---------|-------------------------|
| 0 | the operation completed and the evidence is intact | proceed |
| 1 | the evidence failed: verify found named gaps | block the change, print the gaps |
| 2 | the operation could not be evaluated: no bundle, no audit, or unalignable runs | fix the invocation, never treat as a pass |

The mapping per command:

| command | 0 | 1 | 2 |
|---------|----|----|-----|
| `tieout verify DIR` | chain, ids, re-derivation, controls all pass | a named gap exists | no `bundle.jsonl` at DIR |
| `tieout selftest` | 8/8 points pass | at least one point fails | never |
| `tieout diff A B` | the diff was computed | never | missing bundle, or two different families |
| `tieout judge-audit DIR` | the audit was printed | never | the bundle carries no judge audit |
| `tieout demo` | the run completed | never | never |
| `tieout gaps DIR` | the gaps were printed | never | never (it raises on a missing file) |

Two of those rows deserve their reason stated.

`verify` returning 1 is not an error, it is the answer. The command's job is to decide whether a bundle re-derives, and a bundle that does not is a successful detection of a problem. CI treats it as a failed build because that is the policy, not because the tool crashed.

`diff` returning 2 on cross-family runs is a refusal to invent an alignment. Two suites with different item sets have no honest row-by-row comparison, so the command says so and exits with the "could not evaluate" code rather than producing a table that cannot be defended.

## The one command that is not a gate

`tieout gaps` exits 0 whether or not there are gaps. It is a reader: it prints the named gaps and their scope for a human, and it never fails a pipeline.

That is intentional and it is also a trap. If you want "fail when there are gaps", use `verify`, which exits 1 for the same condition. The rule of thumb for this CLI is: commands that print evidence exit 0 when the printing worked; commands that adjudicate evidence exit 1 when the adjudication fails.

`tieout demo` and `tieout run` follow the printing rule. A run that produces eleven failures exits 0, because the run is a measurement and a measurement of failure is still a successful measurement. Gate on `verify`, not on `run`.

## What CI actually runs

The workflow runs the backend suite, lint, the selftest, four verifies against the committed bundles, and one stability gate:

```
- name: verify committed runs
  run: |
    python -m tieout verify runs/demo
    python -m tieout verify runs/demo-f2
    python -m tieout verify runs/demo-stability/a
    python -m tieout verify runs/demo-stability/b

- name: stability gate (zero verdict flips)
  run: |
    out=$(python -m tieout diff runs/demo-stability/a runs/demo-stability/b)
    echo "$out"
    echo "$out" | grep -q "stability 1.000"
```

The four verifies are pure exit-code gating: a single broken link, a single missing id, a single control that no longer re-derives, and the job fails with the gap printed by the tool.

The stability gate is the one place the workflow greps text instead of reading a code, and the trade is worth being explicit about. `grep -q` fails closed: if the diff output stops containing the exact string `stability 1.000`, the job fails, whether because a verdict flipped or because the format of the line changed. That is safe but brittle in the annoying direction, since a cosmetic change to the diff report also breaks the build.

The robust version is to parse the JSON form, which exists for exactly this reason:

```
out=$(python -m tieout diff runs/demo-stability/a runs/demo-stability/b --json)
echo "$out" | python -c '
import json, sys
d = json.load(sys.stdin)
assert d["verdict_flips"] == 0, d["verdict_flips"]
assert d["stability"] == 1.0, d["stability"]
'
```

That version fails on the claim (`verdict_flips == 0`) rather than on the prose. If you are writing a gate of your own, prefer it.

## Exit codes as tests

The contract is asserted in the suite rather than described in a docstring. The CLI tests run the real commands as subprocesses and check the codes:

- `demo` then `verify` then `gaps` then `judge-audit` on a fresh bundle: all exit 0, and the verify output contains `VERDICT: PASS`.
- The same bundle with one character appended to an event's `raw_output`, re-serialised so the JSON is valid: `verify` exits 1 and the output names `G-HASH`.
- A cross-family diff: exits 2.
- A missing bundle: exits 2.
- `selftest`: exits 0 and prints `SELFTEST PASS (8/8)`.

Mutating the evidence and asserting the exit code is the difference between a CLI that has exit codes and a CLI whose exit codes are load-bearing. The test knows the exact edit that must be caught, so a verifier that regresses to always-exit-0 fails the suite instead of shipping.

## Why 2 is the code that matters most

Of the three, 2 is the one that prevents the expensive mistake. A pipeline that treats "I could not read the artifact" as "the artifact is fine" will one day report a green build for a repository whose evidence directory was renamed. That failure mode is silent, it is common, and it is exactly what a well-chosen non-zero code prevents.

The convention is worth adopting even outside this tool: two non-zero codes, one for "the thing I checked is bad" and one for "I could not check the thing". A single non-zero code collapses the two, and every caller that wants to distinguish them ends up parsing text, which is how a machine contract decays into a regex.

## Reproduce it

```
pip install -e .
tieout verify runs/demo; echo "verify -> $?"
tieout verify runs/nonexistent; echo "no bundle -> $?"
tieout diff runs/demo runs/demo-f2; echo "cross-family -> $?"
pytest tests/test_cli.py -q
```

Four commands, four exit codes, and a test file that asserts them. That is the whole CI contract, and it is small enough to check by hand in under a minute.
