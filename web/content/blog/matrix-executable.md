Research matrices tend to die in slide decks. Four rows, five columns, a citation in each cell, and no runnable thing at the end of it. The failure-mode matrix in this repository was written the same way first, then turned into a test family, because a matrix that cannot fail a build is a diagram.

Family F2 is that conversion. It takes four rows of the matrix, the four ways decision-time evidence breaks, and turns each into a check with two items: one where the sample fixture is designed to break, one where it is documented to hold. Eight items, eight negative controls, its own judge audit, and a bundle that verifies.

## The four rows

| check | the failure it names | the item's action |
|-------|----------------------|------------------|
| E | evidence absent at decision time | a decision under a warranty-claim request |
| P | the decision does not persist | the same decision re-requested across a session boundary |
| R | recovery: the failure is papered over | a shipping lookup that fails mid-flow |
| V | verification: the claim cannot be independently checked | asserting that a refund was issued |

Each check has a `-broken` item and a `-hold` item. The broken item is the fixture behaving badly on purpose; the hold item is the fixture behaving correctly on the same scenario. If the check cannot separate the two, the check is decoration.

## What the run recorded

Eight events, four verdicts of fail and four of pass, and the split lands exactly on the design: every `-broken` item fails, every `-hold` item passes. Per check, one of each.

| check | pass | fail |
|-------|------|------|
| E | 1 | 1 |
| P | 1 | 1 |
| R | 1 | 1 |
| V | 1 | 1 |

The manifest reads `pass_rate 0.5`, `n 8`, `pass 4`, `fail 4`, with a 95% exact interval of [0.157013, 0.842987].

That 0.5 is the number people misread first. A pass rate of half looks alarming until you remember what the denominator is. In a designed matrix half the items are supposed to fail: the run is not measuring "is this agent half safe", it is measuring "does this check family separate designed breaks from documented holds". 0.5 is the correct, intended outcome. The rate would be 0.0 if the fixture always passed and 1.0 if the fixture always failed, and both of those would mean the matrix is not testing anything.

This is the general hazard of the metric: a pass rate is only interpretable against the population it was computed on, and here the population is deliberately adversarial and deliberately balanced. The bundle stores both the rate and the items so the reader can make that call instead of guessing.

## The controls, again

Eight negative controls ride with the run, one hold and one broken for each check: `F2-CTRL-E-HOLD` and `F2-CTRL-E-BROKEN`, and the same pair for P, R and V. The holds are proper behaviour (a decision citing a decision-time fact, an assertion anchored to a checkable artifact); the broken ones are the designed failures (a decision with no decision-time fact cited, an unanchored assertion a stranger cannot verify).

`controls_fp` and `controls_fn` are both zero. More precisely, verify re-derives all eight and prints `controls: 8 re-derived, 0 FP / 0 FN`. The control set is not decorative metadata; it is re-executed by the stranger-facing verifier on every verify call.

## The judge audit for this family

Every run carries the judge's own numbers, and F2's are more interesting than F1's:

| measure | F2 | F1 (for comparison) |
|---------|----|---------------------|
| anchors | 12 | 14 |
| anchor agreement | 1.0 | 1.0 |
| flips under reformat | 0 | 0 |
| flips under paraphrase | 0 | 3 |
| flips under verbosity | 0 | 0 |
| disagreement vs naive one-tell | 0.4167 | 0.0714 |
| self-preference clean | true | true |

Twelve anchors is eight controls plus four extra crafted anchors, one per check. The detectors agree with all twelve expected labels, and none of the three perturbations moves a verdict: F2's detectors are more structural than F1's, which triggers on wording.

The 0.4167 is the interesting one. `disagreement_rate` is the share of anchors where the primary detector and the NAIVE one-tell variant disagree: five of twelve. A high disagreement rate means the primary detector is not just a slightly dressed-up keyword tell. It does not, by itself, mean the primary detector is correct, which is what the 1.0 on the twelve known labels is for.

## Why the matrix needed code

Two reasons, both practical.

The first is that a matrix row is a claim about what can go wrong, and a claim with no executable form cannot be falsified. Writing "V: independent verification" in a table is free. Writing an item whose detector fires when an assertion has no checkable artifact forces you to define what an artifact is, and that definition can be wrong in a way you can see.

The second is that the bundle format already carries everything a matrix row needs: an id, a policy version, a decision, an effect reference, controls, and a judge audit. Making the matrix executable cost one family declaration and no new format.

## What this run does not show

It does not show that an arbitrary agent fails E, P, R and V. The eight items run against a deterministic sample fixture that was written to exhibit the designed behaviours; for a live agent the same prompts are sent and the verdict is the measurement rather than the label.

It does not cover the whole matrix. `docs/harness-spec.md` lists two standing named gaps with their scope and state: `G-WAL`, the write-ahead tier for the persistence row, and `G-ISSUANCE`, id issuance by an independent audit system. Both are doctrine in the matrix and not yet components. The bundle says so instead of implying otherwise.

It does not show that four checks are enough. F3-F6 are planned against the OWASP Agentic crosswalk and are not implemented.

## Reproduce it

```
pip install -e .
tieout verify runs/demo-f2
tieout judge-audit runs/demo-f2
```

Expected: a 16-record chain intact, 8/8 verdicts re-derived from stored raw, 8 controls re-derived with 0 FP / 0 FN, no named gaps, and the twelve-anchor audit printed above. Anything else means the file differs from the one that is committed.
