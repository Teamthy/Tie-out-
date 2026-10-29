The 2026 tooling landscape is crowded in three layers and empty in the fourth.

Attacks are commoditized: garak, PyRIT, promptfoo, DeepTeam, Giskard, AgentDojo all generate probes, and most of them do it better than a small independent practice could. Evals are commoditized at the scoring level: OpenAI Evals, DeepEval, Inspect AI, LangSmith, Braintrust, Phoenix all run a dataset through a model and produce a number. Taxonomy is standardized, with the OWASP Top 10 for Agentic Applications, MITRE ATLAS and the NIST AI RMF giving everyone a shared vocabulary for what the failures are called.

The fourth layer is evidence. Almost nothing in the landscape emits an artifact that a stranger can re-derive.

## What "evidence" means here, precisely

The word is used loosely in security writing, usually to mean "we kept logs". This project means something narrower and more demanding. An artifact is evidence if all six of the following are true, and each has a mechanical test in the format.

| property | the test |
|----------|----------|
| the decision is a record, not a sentence | one verdict event per check, with action, policy version, decision and effect reference |
| provenance is part of the claim | harness, dataset hash, environment, decoding, seed, judge endpoint in the manifest |
| the grader cannot grade itself | negative controls in both directions, FP and FN reported per run |
| unverifiable things are named | named gaps with a code, a scope and a reason |
| a stranger can recompute it | a hash chain, a file hash, and a re-derivation of every verdict from stored raw |
| the judge is measured | anchor agreement, perturbation flips, disagreement, self-preference, every run |

The list is not a wishlist. Each row corresponds to a field or a check that either exists in the bundle or does not, and the difference is visible in one command.

## The self-grade problem

The usual pipeline is this: a team builds or buys a red team tool, configures the judge inside that tool, runs it against their own agent, and reports the tool's number. The evaluator and the evaluated share an operator, and the judge lives inside the tool that is being sold as the judge. A green result from that arrangement is not a measurement of the agent; it is a measurement of the tool's opinion of the agent, produced by the same organisation that profits from the opinion.

This is not an accusation of bad faith. It is a structural property, and it is the reason audit artifacts in other fields keep the auditor and the audited separate. When the separation is impossible, the next best thing is a record that lets a third party redo the audit without the auditor.

Three specific failures follow from the self-grade arrangement, and all three are documented in the research the method note cites:

- No judge is uniformly reliable across domains. Agreement scores on one corpus do not transfer to another, so a single number without its judge audit is unfalsifiable.
- Verdicts flip under reformatting, paraphrase and verbosity. The stability of a verdict is a property of the judge as much as of the target, and it has to be measured rather than assumed.
- Where raw outputs were not shipped, published numbers cannot be re-audited. This is the terminal one: it does not matter how careful a report was if nobody can recompute it.

## What an evidence layer actually has to ship

Four artifacts, in practice, and the format here is one implementation of the list rather than a standard:

A per-decision record. Not a summary row. The action, the policy version being enforced, the decision, and a reference to the effect. One per check, with the id assigned before the attempt so that a missing verdict is nameable.

The raw material. The input and output that the decision was made from, stored verbatim, so the decision can be recomputed by anyone with the detector. A record that stores only the verdict cannot be re-derived; it can only be believed.

The counter-evidence. Controls, in both directions, and the judge's own error numbers. An artifact that contains only supporting evidence is a press release with hashes.

The names of what is missing. This is the one everyone skips. Every real run has things it could not establish: an endpoint that was not resolved, a mapping that was proposed rather than confirmed, a write-ahead tier that is doctrine rather than a component. Naming them with a code and a scope converts a hidden weakness into a reviewable one, and a reviewer who sees a named gap trusts the rest of the document more, not less.

## Where tieout sits, and where it does not

tieout is not a probe library. F1 and F2 consume patterns from the public five-tests method and the failure-mode matrix; F3-F6 are planned against the OWASP Agentic crosswalk and are not shipped. If you want attack generation, the tools listed at the top of this piece are better and more numerous.

tieout is not an observability dashboard. The UI renders tieout's own bundles and nothing else; it is a viewer for the record. There is no trace ingestion, no token accounting, no per-request cost graph.

tieout is the artifact. It emits bundles, verifies them, diffs two runs, and prices the judge. The commands are small:

```
tieout demo
tieout verify runs/demo
tieout diff runs/demo-stability/a runs/demo-stability/b
```

Everything above the command line is a JSONL file and a one-line sha256. That is deliberate: a reviewer does not need the tool to check the claim, only the file, the check definition, and a few lines of Python.

## The honest position on "verified"

An evidence layer does not make a claim true. It makes a claim checkable, and it makes the checking cost collapse from "do the whole evaluation again" to "recompute a hash and re-run a detector on a stored string".

The claims in these articles follow that rule. Every number traces to one of three things: a committed bundle or manifest field, a committed test or selftest output, or a cited public artifact. Where a claim cannot be traced, it is not made as a finding, and the gap is named.

That constraint is the whole discipline. After it, "trust me" is not a rhetorical posture but a defined failure, and the record can be handed to someone who does not trust you and still be useful.
