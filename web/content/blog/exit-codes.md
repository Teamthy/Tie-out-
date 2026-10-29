Most evaluation tools treat the command line as a convenience. For a tool whose output is evidence, the CLI is the interface a pipeline depends on — which makes its exit codes a contract, and a contract has to be written down.

This is the full contract, taken from the argparse tree in `tieout/cli.py` rather than from memory:

| command | 0 | 1 | 2 |
|---|---|---|---|
| `demo` | run written | — | — |
| `run` | run written | — | — |
| `verify` | PASS | FAIL (named gaps) | no bundle at the path |
| `gaps` | listed, or none | — | — |
| `judge-audit` | printed | — | no audit record in the bundle |
| `diff` | comparison computed | — | missing or incompatible runs |
| `selftest` | 8/8 | any point failed | — |
| `serve` | (long-running) | — | — |

Two decisions in that table carry most of the weight.

## 1. "Broken" and "missing" are different failures

`verify` returns 1 when the record is broken and 2 when there is no record to check.

That distinction is the difference between a pipeline that fails loudly and one that fails confusingly. Exit 1 means the artifact exists and does not re-derive: someone should look at the chain, the gaps, the raws. Exit 2 means the path is wrong, the artifact was never built, or the job that was supposed to produce it never ran. Conflating them produces the two classic CI disasters: shipping on a missing artifact because the step "failed for an unrelated reason", or debugging a phantom integrity failure in a file that is not there.

The distinction is applied at the CLI level, not just in the library: `cmd_verify` checks for the bundle file before it parses anything and returns 2 if it is absent. The tamper path is pinned by `tests/test_cli.py`, which runs `demo`, verifies it (0), rewrites one record's `raw_output`, verifies again (1) and asserts that `G-HASH` appears in the output.

## 2. `diff`'s exit code says the computation succeeded, not that the runs agree

A stability diff of two runs with one flipped verdict is a *successful diff*. The number is 0.928571, and that is data. The command exits 0.

Encoding "the runs should agree" into an exit code would make the tool opinionated about a result, and the moment a pipeline reads that opinion, the report stops being a report. A gate that wants zero flips greps the line it cares about — which is exactly what this repository's CI does:

```yaml
- name: stability gate (zero verdict flips)
  run: |
    out=$(python -m tieout diff runs/demo-stability/a runs/demo-stability/b)
    echo "$out"
    echo "$out" | grep -q "stability 1.000"
```

The gate is explicit, the number it checks is printed in the log above it, and a human reading the job sees the same two lines the script does.

Exit 2 is reserved for a comparison that could not be made: a missing bundle, or two bundles from different families. Comparing an F1 run to an F2 run is not a weak comparison; it is not a comparison, and the tool refuses it (`DiffError` in `tieout/diff.py`, exit 2 in `cmd_diff`).

## Machine-readable and human-readable, same run

Every command prints a human report by default. `diff` adds `--json`, which prints the same in-memory object — including the full per-item row table — with keys sorted:

```bash
tieout diff runs/demo-stability/a runs/demo-stability/b --json
```

Because both forms come from the same `diff_bundles()` return value, they cannot disagree: there is no separate code path for the machine. There is also no flag that changes what was measured. A "strict mode" that quietly re-scored a bundle would fork the data, and forks in data are where audits die.

## `selftest`: eight points, or none

`tieout selftest` runs the harness against itself in a temporary directory and exits 0 only if all eight points pass:

```text
 1. [PASS] clean bundle verifies (no named gaps)
 2. [PASS] sample run behaves as documented
       english 11/11 held, R1-mixed fail
 3. [PASS] metric reads 0/3 injection, 0/3 retrieval, 0/2 tool, 1/6 multilingual
 4. [PASS] negative controls clean (0 FP / 0 FN)
 5. [PASS] one-character tamper detected (G-HASH)
 6. [PASS] dropped line -> G-MISSING + manifest count/tail break (G-HASH)
 7. [PASS] judge audit runs offline with honest numbers
       anchors=14 agreement=1.0 flips={'reformat': 0, 'paraphrase': 3, 'verbosity': 0} disagreement=0.0714
 8. [PASS] two sample runs: all verdicts stable, transcript drift visible
       aligned=14 flips=0 drift=10 stability=1.0

SELFTEST PASS (8/8)
```

This is the command to run before believing anything else in the repository. It checks that a clean bundle verifies, that the sample behaves as documented, that the metric reads the expected fractions, that controls are clean, that tampering is caught in two different ways, that the audit reports honest numbers, and that two runs of the same suite produce zero verdict flips with visible transcript drift. If any point fails, exit 1, and no downstream claim about the tool survives it.

## The one gap in the contract

`gaps` has no failure path. It prints the named gaps a bundle records about itself, or says there are none, and exits 0 either way. The reasoning is that "this bundle contains a gap record" is information, not an error — the bundle is still readable and the gap is still a finding. The reasoning is defensible, and it is still a gap: a pipeline cannot use `gaps` as a gate without parsing its stdout.

That is worth writing down rather than hiding, because the alternative — inventing an exit code for "there are gaps, but not the kind that fails" — would add a third failure class that no caller asked for. The standing rule here is that the contract is documented in full, gaps included.

## One definition of pass, shared by site and pipeline

The CI backend job runs the same commands a reviewer would, against the same four committed bundles:

1. `ruff check .`
2. `pytest` (47 tests)
3. `python -m tieout selftest` (8/8)
4. `python -m tieout verify` on `runs/demo`, `runs/demo-f2`, `runs/demo-stability/a`, `runs/demo-stability/b` (all PASS)
5. the diff and the `stability 1.000` grep above

The site then renders the same bundles: the run pages read the same `bundle.jsonl` files, the compare page calls the same `diff_bundles`, and the verify button calls the same `verify_bundle` the CLI calls. When a reviewer asks "does your own CI pass on your own artifacts", the answer is not "we think so" — it is a workflow that runs the commands, with the output in the log.

The command a stranger types and the job the pipeline runs are the same string. That is the whole design.

## The parser is the documentation

The contract above is not a summary written after the fact; it is the argparse tree, and the tool prints it:

```text
usage: tieout [-h] [--version]
              {demo,run,verify,gaps,judge-audit,diff,selftest,serve} ...

  tieout demo [--out runs/demo]
  tieout run --agent sample|live --suite f1 [--out DIR]
             [--model M] [--base-url U] [--key K] [--system-prompt-file F]
  tieout verify <run-dir>
  tieout gaps <run-dir>
  tieout judge-audit <run-dir>
  tieout diff RUN_A RUN_B [--json]
  tieout selftest
  tieout serve [--port 8000] [--host 0.0.0.0] [--runs-dir runs]
```

Every subcommand that reads a bundle takes a directory and needs nothing else: no config file, no environment variable, no service endpoint. That is a deliberate constraint. A verifier that needs configuration is a verifier whose behaviour depends on configuration, and the point of `verify` is that the artifact is the whole input.

The one command that writes is `demo` (and `run`), which is why they are the only ones with an `--out`. Reading commands cannot modify a bundle; `serve` writes a `verify_report.json` next to a bundle only when the filesystem allows it, and the report is returned in the response either way.

## The exit-code table as tests

Each row in the contract has a test or a code path that pins it:

| behaviour | pinned by |
|---|---|
| `demo` writes a bundle and exits 0 | `tests/test_cli.py::test_demo_verify_gaps_flow` |
| `verify` exits 0 on a clean bundle | the same test, plus CI on four committed bundles |
| `verify` exits 1 on a tampered bundle, with `G-HASH` | the same test, after rewriting a raw |
| `diff` exits 2 on mismatched families | `tests/test_cli.py::test_f2_run_and_diff_flow` |
| `selftest` exits 0 only at 8/8 | `tests/test_cli.py::test_selftest_command` |
| `verify` exits 2 when there is no bundle | the guard at the top of `cmd_verify` |

The exit-2-for-missing case is the thinnest of these: a guard clause rather than a dedicated test. It is still a documented branch, and the honest description of the contract is the one that says which parts are load-bearing and which are a paragraph and a conditional.

## Why a pipeline can trust it

An exit code is only useful if it is the same code every time. Two properties make that true here.

The commands do not have modes. `verify` has no flags at all, so there is no combination of arguments that changes what PASS means. `diff` has one flag, and it changes the output format only.

The commands do not reach the network. Every exit code is a function of the files on disk, so the same artifact on the same machine produces the same code, and a CI job that passes today will pass on a re-run next year with the repository at the same commit.

That is a modest property, and it is the one most evaluation CLIs fail: a tool that consults an API to decide PASS cannot be a gate, because the gate's answer depends on something the gate does not control.

---

**Verified against:** `tieout/cli.py` — the return values of `cmd_verify`, `cmd_selftest`, `cmd_diff`, `cmd_gaps` and `cmd_judge_audit`; `.github/workflows/ci.yml`, which runs four `verify` commands plus the selftest and greps the stability line; `tests/test_cli.py`, the CLI contract as tests; and the literal `tieout diff runs/demo-stability/a runs/demo-stability/b` output the gate matches on.
