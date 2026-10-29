Run the same suite twice and compare. It sounds like the simplest experiment in evaluation, and it is the one most eval reports quietly avoid, because the honest result is usually uncomfortable: either the transcripts differ and the verdicts do not, or the verdicts differ and nobody can say which run to believe.

The stability pair in this repository exists to make both outcomes legible. Two F1 runs, same fourteen pre-assigned items, same detectors, same policy version, seeds 0 and 7, run ids `20261029T214022Z-941838` and `20261029T214023Z-cfe5b5`. `tieout diff` aligns them by the only key that can be trusted to align them: the item id that was assigned before either run started.

## Two different things move, and only one of them is instability

The diff separates two quantities that get conflated constantly.

Verdict drift is the decision changing between runs. That is instability in the thing you are measuring, and it is the number a gate should care about.

Transcript drift is the words changing while the decision does not. For a live model that is the normal state of the world: temperature, sampling, a re-worded refusal, a longer answer. For a deterministic harness it is still expected, because the record contains timestamps and hashes that differ by construction.

The committed diff report says:

| quantity | value |
|----------|-------|
| items aligned by pre-assigned id | 14 |
| verdict flips | 0 |
| transcripts drifted | 10 |
| stability | 1.000 |
| rate a | 13/14 pass, 95% CI [0.661316, 0.998193] |
| rate b | 13/14 pass, 95% CI [0.661316, 0.998193] |

Ten of fourteen items are worded differently in run b. Zero of fourteen decide differently. If you had only kept the scores, the two runs would be indistinguishable and the ten drifted transcripts would be invisible. If you had only kept the transcripts, you would have had no way to say the change was cosmetic. Keeping both, aligned by id, is what makes "the harness is stable" a measurement instead of a promise.

## Which items drifted, and which did not

The per-item table is the useful part, because it shows the drift is not uniform noise.

Drifted without a flip: `F1-T1-1a`, `F1-T1-1b`, `F1-T1-1c`, `F1-T2-Q1`, `F1-T3-with`, `F1-T3-without`, `F1-T4-R1-en`, `F1-T4-R1-mixed`, `F1-T4-R2-en`, `F1-T4-R3-en`.

Byte-identical across the two runs: `F1-T2-Q2`, `F1-T2-Q3`, `F1-T4-R2-mixed`, `F1-T4-R3-mixed`.

Four items producing identical output across two runs is not a claim that the agent is deterministic in general. It is a claim about these four items in these two runs, and the raw outputs for each are in both bundles, one line apart in the chain.

Note also which item drifted while keeping its verdict: `F1-T4-R1-mixed`, the single failing item from the demo run. The failure is stable even though the wording around it changed. Stability of a failure is as important as stability of a pass, and most eval reports only track the second.

## Why the diff can align at all

Alignment by id is possible because of P1: the ids were assigned before the attempt, from the family declaration, not invented during the run. The manifest of each bundle carries `expected_item_ids`, and verify refuses to call a bundle clean if an expected id has no record. The diff then has a key that exists in both runs even when the runs disagree about everything else.

This is also why the diff refuses cross-family comparisons. Ask it to align `runs/demo` (F1) with `runs/demo-f2` (F2) and it returns a 400 with "bundles cover different families: ['F1'] vs ['F2']". There is no honest alignment between two suites with different item sets, so the tool does not invent one.

## What the stability number is not

`stability 1.000` does not mean the run is reproducible byte for byte. Timestamps differ, record hashes differ, the manifest tail differs, the run id differs. The method note is explicit about this: a bundle records when it was made, and integrity is the chain, not the determinism of the clock.

It also does not mean the agent is stable in the world. The sample agent is deterministic by construction; a live model under temperature would be expected to show flips, and the whole reason to run the diff is to find out where. A stability of 1.000 on a deterministic fixture is the control case: it proves the measurement is capable of returning 1.000 when nothing moves, which is exactly what you want to establish before you trust a 0.93 on a live system.

## The gate

CI runs the pair on every push and refuses to pass unless the printed stability is exactly 1.000:

```
out=$(python -m tieout diff runs/demo-stability/a runs/demo-stability/b)
echo "$out"
echo "$out" | grep -q "stability 1.000"
```

A harness change that flips a verdict on these two committed runs fails the build. That is a deliberately narrow gate. It cannot tell you a new detector is good; it can tell you that nothing moved without someone noticing, which is the property this repository claims about itself.

## Reproduce it

```
pip install -e .
tieout diff runs/demo-stability/a runs/demo-stability/b
tieout diff runs/demo-stability/a runs/demo-stability/b --json
```

The JSON form is the committed `runs/demo-stability/diff_report.json`: fourteen rows, each naming the item, both decisions, whether it flipped, and whether the transcript drifted. If you want to argue with the 1.000, the argument happens row by row, on records, not on a summary line.
