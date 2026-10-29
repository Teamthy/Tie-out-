# Security

## Scope

tieout is an evaluation harness. Its security properties concern the
**integrity of the record**, not the protection of the target:

- the bundle is the artifact: hash chain, manifest, file hash
- `verify` is the integrity check: no model, no key, no network
- the detectors are heuristic judges; the P6 judge audit measures them
  every run and reports the numbers, including the flips

## Verify, don't trust

Anyone reviewing this repository should verify its claims from a cold
clone:

```bash
pip install -e ".[dev]"
python -m tieout selftest
python -m tieout demo
python -m tieout verify runs/demo
python -m tieout verify runs/demo-f2
python -m tieout verify runs/demo-stability/a
python -m tieout verify runs/demo-stability/b
python -m tieout diff runs/demo-stability/a runs/demo-stability/b
pytest
```

All of it must pass. The committed runs are real artifacts:
`runs/demo` (F1, 0.2.0, format v1.0), `runs/demo-f2` (F2), and the
stability pair `runs/demo-stability/{a,b}` with the committed diff
report. Their `verify` outputs are in each directory's
`verify_report.json`. The v1.0 demo verifying under v1.1 code is the
backward compatibility invariant, checked on every commit.

## Reporting issues

Open an issue on the repository. If a report involves a live endpoint
or an active engagement, keep the details out of the public issue and
open a security advisory (GitHub: Security -> Advisories -> New draft)
or share via direct message first; the issue can link the advisory once
it is public.

## Safe use

- Live runs send the prompts in `tieout/harness/f1_five_checks/prompts.py`
  and `tieout/harness/f2_state_recovery/prompts.py`, plus the scenario
  context, and the system prompt you supply, to the endpoint you
  configure.
  Treat any live endpoint as receiving that content; do not point the
  harness at an endpoint with credentials you would not accept being
  quoted back to you.
- The `MY_SYSTEM_PROMPT_FILE` / `--system-prompt-file` contract sends the
  file's full content as the system prompt. Use a file you are willing
  to have transmitted verbatim.
- Result bundles contain raw inputs and outputs. Share bundles
  deliberately: the raw is the point, but it is also the privacy
  surface.

## Record hardening

The harness is the artifact, so the record format is treated as
adversarial input:

- **one record, one physical line, always.** `canonical()` escapes
  U+2028/U+2029, which are legal unescaped in JSON but treated as line
  breaks by line-based readers. Without the escape, one raw output could
  split a record in the file bytes and break the chain at the reader
  without touching any hash at write time.
- **hostile raws round-trip exactly.** `tests/test_bundle_v11.py` runs
  the family against a fixture that answers every item with a raw
  containing JSON quotes, backslashes, control characters, line
  separators, emoji, homoglyphs, and a forged record line; the bundle
  must write, verify clean, and re-parse the raw byte-for-byte.
- **the chain is checked at read time.** verify recomputes every record
  hash from the file bytes, so a split, reordered, or edited record is
  a G-HASH or G-RECORD gap, never a silent pass.

## Heuristic disclaimer

Detectors flag likely failures; they do not prove them. A `fail` in a
bundle is a detector firing on a stored raw, re-derivable by a stranger.
Confirmation is a human act, in the raw, by design.
