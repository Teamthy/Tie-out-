# Contributing

## Setup

```bash
make install     # or: pip install -e ".[dev]"
make test        # pytest (40 tests)
make selftest    # the 8-point harness selftest
make lint        # ruff
```

Frontend:

```bash
cd web
npm install
npm run build    # next build, static export to web/out
```

Run everything:

```bash
make ui && make serve
# then open http://localhost:8000
```

## The evidence doctrine (read before touching the harness)

1. **Nothing is silent.** A code path that cannot decide must emit an
   `undetermined` event plus a named gap. "Skip" is not a verdict.
2. **The check does not grade itself.** New checks must ship with
   crafted negative controls (known-hold and known-broken) written
   outside the check.
3. **Verdicts are re-derivable.** A detector must be a pure function of
   the stored raw. If your feature needs the network or a model to
   re-derive, it does not belong in `verify`.
4. **Ids are pre-assigned.** New items get their ids from the family
   declaration, before the run. The manifest's `expected_item_ids` is
   the contract that makes absence nameable.
5. **The policy version moves.** Any change to items, controls, or
   detector code changes the policy hash; that is intended, and old
   bundles remain bound to the old version.

## Adding a check family

F2 (`harness/f2_state_recovery/`) is the working example.

1. Create `tieout/harness/f<n>_<name>/` with `prompts.py` (inputs),
   `detectors.py` (pure functions + a one-tell NAIVE variant),
   `anchors.py` (the family's extra crafted P6 anchors), `family.py`
   (items, controls, `Family` instance with `extra_anchors` and
   `naive`).
2. Register it in `tieout/harness/__init__.py` (`FAMILIES`).
3. Make the sample agent's behavior for the family's input kinds
   documented: which items are designed breaks, which are holds. The
   metric must be non-degenerate (not all pass, not all fail) on the
   sample agent.
4. Verify every crafted raw against its detector by hand before
   running: controls clean (0 FP / 0 FN), anchor agreement 1.0, and
   the NAIVE variant must disagree somewhere or it is not a probe.
   Check the raws against the P6 perturbations (reformat / paraphrase
   / verbosity) and the self-preference marker, or the audit will show
   the flips.
5. Add the test: deterministic agent behavior expectation, the metric
   contract, controls clean, bundle verifies, audit honest.
6. Extend `tests/` and, if the family is deterministic, the selftest.
7. If you commit a demo run for the family, un-ignore its directory in
   `.gitignore` (the committed runs are the public evidence).
8. Update `docs/` (bundle format only if the record schema changed) and
   the README families section.

Two invariants that catch people:

- **raws are data, not code.** Anything the agent can emit must survive
  `canonical()`: JSON quotes, backslashes, control characters, emoji,
  homoglyphs, and the line separators U+2028/U+2029. The hostile-input
  test (`tests/test_bundle_v11.py`) is the check; add worse cases to it
  when you find them.
- **the format is additive.** New manifest or provenance fields are
  optional, v1.0 bundles must keep verifying, and the backward
  compatibility test stays green.

## Adding a page

Pages are hash routes in `web/app/page.tsx` (`#/runs`, `#/run/<id>`,
`#/method`, `#/format`, `#/matrix`, `#/harness`, `#/families`). New
pages: add a component in `web/components/`, a route in `page.tsx`,
and a nav entry if it belongs in the top bar. Keep the monochrome
system: black, white, gray levels, no color; verdicts read as
typography.

## Style

- Python: ruff (line length 100), no new runtime dependencies without a
  note in the PR/commit (the keyless core must stay keyless).
- TypeScript: strict mode; the build typechecks.
- Docs: the docs double as the site's content (rendered by
  `web/components/Markdown.tsx`); keep to the supported markdown subset
  (headings, paragraphs, lists, tables, fenced code, inline code, bold,
  links).
- Commits: imperative, one fact per line, state what changed and how it
  was verified.
