Every automated evaluation has a judge, and almost no evaluation reports the judge's own reliability. The scoring function is assumed to work because it was written by the person who is selling the result. Then a reviewer asks the obvious question, "how do you know the judge is right", and the answer is a code link.

The judge audit makes that question part of the artifact. Every run emits a `judge_audit` record with four measures, computed on crafted anchors that the run did not generate, and stored in the bundle next to the verdicts it is priced against.

## The four measures

Anchor agreement. The detectors are run against anchors whose expected label is fixed in the family declaration, and the share that agree is reported. This is the direct accuracy question on a small, known set.

Perturbation flips. Each anchor is rewritten three ways, and the audit counts how often the verdict changes: reformat (whitespace normalised), paraphrase (a synonym table, so "can't" becomes "unable to", "refund" becomes "reimbursement", and so on), and verbosity (a courtesy preamble and sign-off wrapped around the text). A flip only counts when the rewritten text is actually different and the verdict actually changed, so a perturbation that does nothing is not counted as a pass or a failure.

Disagreement rate. Each family ships a NAIVE one-tell detector alongside its real detector. The audit reports the share of anchors where the two disagree. A primary detector that agrees with the naive one on everything is not adding anything; one that disagrees on a lot is doing real work, which is not the same as doing it correctly.

Self-preference. The judge's own marker string, `EVALUATED BY TIEOUT JUDGE AUDIT`, is appended to every anchor raw and the detectors are re-run. If any verdict moves, the audit is not clean. It is a probe of the specific pathology where a model recognises evaluation context and changes behaviour.

## The numbers, per committed run

| measure | runs/demo, stability a, stability b (F1) | runs/demo-f2 (F2) |
|---------|------------------------------------------|-------------------|
| anchors | 14 | 12 |
| anchor agreement | 1.0 | 1.0 |
| flips under reformat | 0 | 0 |
| flips under paraphrase | 3 | 0 |
| flips under verbosity | 0 | 0 |
| disagreement vs naive | 0.0714 | 0.4167 |
| self-preference clean | true | true |

The anchor count is not arbitrary. F1 has eight controls plus six extra crafted anchors; F2 has eight controls plus four. All anchors are hand-written and versioned, none is model output, which is the property that makes them anchors rather than examples.

## Reading the three paraphrase flips

The F1 audit names them:

```
detail: {'anchor': 'F1-CTRL-T1-BROKEN', 'problem': 'flip under paraphrase'}
detail: {'anchor': 'F1-CTRL-T4R1-BROKEN', 'problem': 'flip under paraphrase'}
detail: {'anchor': 'F1-ANCHOR-1', 'problem': 'flip under paraphrase'}
```

This is the most useful line in the whole record, and it is a line that says the detector is imperfect. Three anchors that the detector gets right in their original wording stop firing (or start firing) once the text is rewritten with synonyms. Paraphrase is the cheapest adversarial transformation available to anyone who wants to evade a surface-matching check, so a paraphrase flip is a directly exploitable weakness, not a cosmetic one.

The audit does not fix it. It prices it, in public, next to the 13/14, so that nobody can read the pass rate without also reading the detector's surface sensitivity. That is the whole purpose: the number is not there to make the judge look good, it is there to make the judge's weakness impossible to leave out of the summary.

F2's zero flips across all three perturbations tells a different story: those detectors key on structural properties of the raw (does the decision cite a decision-time fact; does the assertion carry an artifact) rather than on vocabulary, so synonym substitution does not move them.

## Reading the disagreement rate

0.0714 is one anchor in fourteen where F1's primary detector and its naive variant disagree. The naive variant is a single-tell heuristic for each check: a much simpler rule that fires on one characteristic string. A disagreement on one of fourteen means the primary detector is behaving almost exactly like the naive one on this corpus.

That is an honest number and it is not flattering. F1's detectors are ports of a public five-tests method, kept behaviour-compatible on purpose; they are not claimed to be sophisticated. The audit makes the claim testable rather than rhetorical: if you think the detector adds something over the naive tell, the 0.0714 is the size of the delta on this corpus.

F2's 0.4167 is five of twelve. Those detectors do disagree with the naive variant a lot, which is what you would expect from checks that key on structure. Neither number is "good" or "bad" in isolation; both are the price of trust, printed in the bundle.

## Self-preference, and why the probe is trivial and still worth it

Appending a marker string to the raw and checking the verdict is unchanged is a weak probe. A real judge running as a model call would need a much more serious design: blinded ordering, counterbalanced prompts, repeated sampling at fixed seed.

For the deterministic detectors in this repository, the probe passes trivially: `self_preference_clean: true` in every committed run. Its value is that it is never omitted, so the day a judge becomes a model call, the field is already in the schema and CI will fail if it starts returning false. It is the same argument as the negative controls: naming the pathology in the format is how you avoid discovering it in production.

## What the audit does not cover

It audits the detectors, not a language model's judgement. A live judge configured through `tieout run --agent live` produces the same bundle fields, but the audit inputs are still the crafted anchors judged by the family's detectors: the audit's four numbers describe the check, not the model that wrote the output. That distinction is why the audit record's `judge` field carries the detector identity, `detector:f1-v1:sha256:b6c24cc7116f24cdb`, rather than a model name.

It also cannot see anything the anchors do not exercise. Fourteen anchors is a small corpus, and a detector can be right on all fourteen and wrong on the behaviour you care about. The mitigation is the same as everywhere else in this format: the raw output for every item is in the bundle, so a reader who distrusts the detector can read the fourteen outputs directly. The audit is a summary of a summary; the primaries are preserved.

## Reproduce it

```
pip install -e .
tieout judge-audit runs/demo
tieout judge-audit runs/demo-f2
tieout selftest
```

The printed details are the audit's own `details` array, so a flip named there is a flip you can find in the bundle's anchor set. If the numbers you get differ from the table above, one of the two is stale, and the committed bundle is the one that counts.
