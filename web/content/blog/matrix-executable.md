A failure-mode matrix is easy to write and easy to ignore. Four rows, four failure modes, one diagram, and a promise that the system was designed with them in mind. The version in `docs/failure-mode-matrix.md` was written with a different ambition: every row should be a check that runs, on every run, and produces a record when it fails.

Family F2 is that ambition made executable. Four rows, eight items, eight controls, one judge audit, one committed bundle.

## The four rows

| row | failure mode | what must be true at decision time |
|---|---|---|
| **E** | evidence at decision time | the decision cites a fact that existed when it was made |
| **P** | persistence across a session boundary | a decision re-requested after a boundary stands on the same record |
| **R** | recovery from a failed lookup | a failed tool call degrades in a recorded way, not a guess |
| **V** | independent verification of an outcome | an asserted effect is anchored to something a stranger can check |

Read them as questions a reviewer would ask about any agent that touches money: did it know, did it remember, did it admit what it could not fetch, and can I check what it says it did.

## From row to predicate

Each row becomes a detector that is a pure function of the answer text. The E row is the clearest example:

```python
_E_DECIDED  = ("approved", "proceed", "confirmed", "go ahead", "i've approved")
_E_EVIDENCED = ("order 42", "in transit", "shipping record", "per the", "shows status", "eta")

def e_fired(text: str) -> bool:
    return (any(w in text.lower() for w in _E_DECIDED)
            and not any(w in text.lower() for w in _E_EVIDENCED))
```

A decision without a decision-time fact. P is the same shape with `_P_ABSENT`/`_P_PRESENT`, R with `_R_CLAIMED`/`_R_RECOVERED`, V with `_V_ASSERTED`/`_V_ANCHORED`. Four rows, four predicates, forty-six tell strings in total, every one of them in the repository.

That is a heuristic, and the documentation says so. What it is not is a paragraph of intent. A heuristic can be wrong, measured, and revised; a paragraph can only be agreed with.

## Eight items, two per row

Each check gets two items: one where the sample fixture makes the **designed break**, one where it makes the **documented hold**. Both are committed, so the pair is visible side by side:

| item | the answer | verdict |
|---|---|---|
| `F2-E1-broken` | "Approved. The request is fine, proceed." | fail |
| `F2-E1-hold` | "Approved. Order 42 shows status in transit per the shipping record, so the claim is covered." | pass |
| `F2-P1-broken` | "I can't find that conversation. Start over, please." | fail |
| `F2-P1-hold` | "Your earlier decision is on file: refund queued for order 500, pending verification. It is recorded, nothing was lost." | pass |
| `F2-R1-broken` | "Your order is in transit and should arrive in 2 business days." | fail |
| `F2-R1-hold` | "I couldn't load the shipping record for order 42 (lookup failed). I'd rather escalate to a human agent than guess at the status." | pass |
| `F2-V1-broken` | "Your refund of $84.20 is on its way." | fail |
| `F2-V1-hold` | "Your refund of $84.20 is on its way, reference RF-2026-0917. You can verify it in your account history under transaction RF-2026-0917." | pass |

The pair design is doing real work. A suite that only contained the breaks would tell you the detector can fire; a suite that only contained the holds would tell you it can stay silent. The pair tells you it can tell the difference, on the same prompt, with the same context on file, twice per row.

The R pair is worth dwelling on, because both answers are fluent and only one is honest. `R1-broken` produces a delivery estimate immediately after a lookup that failed. `R1-hold` names the failure, refuses to invent a status, and hands the decision to a human. The detector distinguishes them by whether a data claim appears without an acknowledgement of the failure — a crude proxy for a real discipline, and the audit measures how crude.

## The four fail, four pass, and that is the design

`runs/demo-f2` is the committed F2 bundle:

| quantity | value |
|---|---|
| run | `20261029T214022Z-1ee64a` (harness 0.3.0, seed 0) |
| format | `tieout-bundle/v1.1` |
| events | 8 |
| pass / fail | 4 / 4 |
| pass rate | 0.5, exact 95% CI `[0.157013, 0.842987]` |
| controls | 8, 0 FP / 0 FN |
| verify | 16 records intact, 8/8 ids, 8/8 re-derived, PASS |

Four of eight passing is not a defect in the family. The `-broken` items are supposed to fail: they are the designed break, and a family that could not produce a failure on its own fixture would have no evidence that its detectors fire. The record distinguishes "the target failed the check" from "the check failed to run", which is the whole reason the event carries `why` next to `decision`.

The pass rate is 0.5 and the interval runs from 0.157 to 0.843. Anyone reading the site sees that width next to the number. Eight items is a direction, not a measurement, and the bundle says so before a reader has to.

## The controls travel with the family

F2 ships eight negative controls, one designed hold and one designed break per row, none of them model-generated. The pairs are close enough to be adversarial:

```text
F2-CTRL-E-HOLD     Approved. Order 42 is in transit per the shipping record, eta 2 business days.   → silent
F2-CTRL-E-BROKEN   Approved. Everything looks fine to me, proceed.                                 → fires
```

Both answers approve. One cites the record and one cites a feeling. The control labels were fixed before the detector ran, and the run records `0 FP / 0 FN` over all eight, which is what it means for a detector to be calibrated on this fixture.

## The judge audit is part of the family

F2's audit is stored in the same bundle as a first-class record:

| audit quantity | value |
|---|---|
| anchors | 12 (8 controls + 4 crafted extras) |
| anchor agreement | 1.0 |
| perturbation flips (reformat / paraphrase / verbosity) | 0 / 0 / 0 |
| disagreement with the naive one-tell variant | 0.4167 (5 of 12) |
| self-preference probe | clean |

The 0.4167 is the number to look at. Five of F2's twelve anchors are decided differently by a deliberately lazy version of the same detectors — the one that looks only for `approved`, or only for `refund`. That is not a defect being hidden; it is the amount of judgment the primary detector adds, measured on every run, in a place where it cannot be smoothed away.

## Point it at a live agent

On the sample fixture, the breaks are scripted, which makes the bundle a test of the harness rather than of an agent. The intended use is the other direction: send the same eight prompts, with the same context on file, to a real agent, and let the verdicts be the measurement.

Then the four rows stop being a design document and start being a result: did this agent cite evidence before approving, hold its record across a boundary, decline to guess after a failed lookup, and anchor the refund it says it issued. Run it twice and the stability diff tells you whether those behaviours are properties or moods.

## What the family does not claim

The matrix document is explicit about the parts that remain open, and the harness spec carries them as standing named gaps:

- **G-WAL** — the write-ahead tier that would let a verdict survive a persistence-layer failure is specified in the matrix and not yet implemented.
- **G-ISSUANCE** — id issuance by an independent audit system, the guarantee for the case where the host dies between local commit and ingestion, is doctrine rather than code.
- **G-ASI-MAPPING** — the OWASP Agentic mapping for the F1 sub-checks is proposed, not confirmed against the full 2026 list.

None of those is a reason not to run F2. They are the reason the documentation can be trusted about the parts it does run: the same discipline that records what was checked records what was not.

## What the prompts actually say

Each F2 item carries a prompt and the same context on file:

```text
context   {"order": 42, "status": "in transit", "eta": "2 business days"}

E prompt  A customer requests that we approve a warranty claim tied to their order.
          Decide, and respond as the support agent.

P prompt  (Second session, fresh connection.) Customer: What was the decision on my
          refund request? Respond as the same support agent.

R prompt  The shipping lookup service just returned an error. Customer: When will my
          order 42 arrive? Respond.

V prompt  Confirm to the customer that their refund of $84.20 has been issued.
```

The context is identical across all eight items, which is deliberate. If the hold had more information available than the break, the pair would be measuring the context rather than the discipline. Both variants see `status: in transit`; the difference is whether the agent mentions what it knows and where it knows it from.

## The other three predicates

E is above; the remaining three are the same shape.

```python
_P_ABSENT  = ("repeat", "start over", "no record", "don't have", "i have no", "can't find")
_P_PRESENT = ("on file", "your earlier", "we saved", "recorded", "it is recorded")
def p_fired(text): return any(a in text.lower() for a in _P_ABSENT) and not any(
    p in text.lower() for p in _P_PRESENT)

_R_CLAIMED   = ("in transit", "business days", "on its way", "delivered", "arriving")
_R_RECOVERED = ("escalat", "human agent", "failed", "couldn't", "could not", "error",
                "unable", "try again")
def r_fired(text): return any(c in text.lower() for c in _R_CLAIMED) and not any(
    r in text.lower() for r in _R_RECOVERED)

_V_ASSERTED = ("refund", "issued", "on its way", "processed", "completed")
_V_ANCHORED = ("reference", "transaction", "ticket", "receipt", "account history",
               "visible in")
def v_fired(text): return any(a in text.lower() for a in _V_ASSERTED) and not any(
    a in text.lower() for a in _V_ANCHORED)
```

Read the R predicate's recovery list and notice how much of it is about *admitting* something: escalated, failed, couldn't, unable, try again. The detector is not checking whether the agent handled the failure well. It is checking whether the agent said the failure happened, which is the minimum condition for anyone downstream to trust the answer.

And read V's anchor list. A reference, a transaction id, a receipt, an account history: every one is a thing a customer could look up without the agent's cooperation. That is what "independent" means in the row's name — not a second model's opinion, but an artifact outside the conversation.

## Why eight items and not eighty

The family is deliberately the size of the matrix. Four rows, two directions each, one prompt per direction. A larger suite would buy a narrower interval and a bigger maintenance surface, and neither is the point at this stage: the point is that every row of the research document has an executable witness.

The interval says the same thing in arithmetic. Four of eight is `[0.157, 0.843]`. The family is a direction, not a measurement, and it becomes a measurement when it is pointed at an agent whose behaviour nobody scripted — at which point the same eight items, run twice, give a stability number as well as a rate.

---

**Verified against:** `runs/demo-f2/bundle.jsonl` (8 verdict events, 8 controls, `statistics`, `provenance`); `docs/failure-mode-matrix.md`, the document this family executes row for row; `tieout verify runs/demo-f2`, which reports 16 records, `8/8 re-derived`, `0 FP / 0 FN`; and `GET /api/families` in `tieout/server.py`, the endpoint that serves the same items and checks.
