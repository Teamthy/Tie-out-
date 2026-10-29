# Failure-mode matrix: decision-time evidence for agent governance

Technical note by Timothy Olusanya, developed through public
practitioner discussion and hardened by the corrections it drew. The
four-part binding, the T0-T6 trace, and the test classes below are the
working model; the guarantee and failure-assumption columns remain the
open work of this practice.

## Scope

The matrix covers decision-time evidence for agent governance: what must
exist, where it must survive, how it is detected when it is absent, how
it is recovered, and what gap remains after recovery. It is not about
attack generation (the F-families do that); it is about the evidence
path itself.

## The four failure modes

| # | failure mode | detectability | survivability requirement (what must outlive what) | recovery | residual gap | test case |
|---|--------------|---------------|-----------------------------------------------------|----------|--------------|-----------|
| 1 | the verdict is not emitted | never, by the record itself; at review time only if ids are pre-assigned | the id assignment must outlive the run that failed to emit | none: the absence is the incident | silence with no id is undetectable; with pre-assigned ids the gap is nameable and provable | test 1: suite run with one item's emitter suppressed; verify must name the id (G-MISSING), not pass silently |
| 2 | the verdict is emitted but not preserved | decision time (commit failed) or review time (hash chain breaks) | the committed verdict must outlive the persistence layer failure | write-ahead copy, then ship; replay on recovery; the recovered verdict carries its decision-time timestamp, not the arrival time | the WAL is host-local: it buys persistence-layer survivability only | test 2: the T0-T6 trace (below); the negative control is the same trace without the pre-assigned id |
| 3 | the host dies between local commit and independent ingestion | review time: the audit system records a named gap (with id issuance) or nothing (without it) | the verdict must outlive the host: written to the audit system or an independent availability domain, per action class | high-consequence: independent durability is a precondition of the effect; reversible: local commit + replay + mandatory reconciliation, bounded by replay frequency | host-lifetime evidence loss: between local commit and ingestion the verdict exists in exactly one place | test 3: kill the host between local commit and ingestion (the T2-T5 window); assert the audit system records a named gap, not silence |
| 4 | the record is preserved but not independently verifiable | review time: the stranger's verify fails or cannot be run | the check definition, the raw inputs/outputs, and the hash chain must outlive the runner as one artifact | re-derivation: verify re-walks the chain, re-hashes the manifest, re-runs the detectors on stored raw, no model, no key, no network | the detectors themselves are the last trusted component; the judge audit (P6) measures but does not eliminate that trust | test 4: `tieout verify` on a bundle produced on a different machine; plus the tamper suite (one-character edit, dropped line, verdict flip) |

## Test classes

The tests split into two classes, per the round-6 distinction:

- **P (persistence / recovery)**: tests 1-3. They fail a component and
  assert the gap is named and the recovery path behaves.
- **V (cryptographic verification, key-free)**: test 4 and the tamper
  suite. They never fail a component; they corrupt or move the artifact
  and assert the stranger's verify catches it, with no key and no
  network available to the verifier.

## The T0-T6 trace (test 2, commit order)

```
T0  action A-1042 proposed, state: draft          (id pre-assigned, before the attempt)
T1  guard verdict: BLOCK, rule R7, policy v12
T2  verdict durable in local write-ahead copy
T3  ship to audit store fails, persistence layer down
T4  effect withheld, no durable record outside the host, no state change
T5  store recovers, WAL replays, verdict lands with its T1 timestamp
T6  verification pulls A-1042 by ID: verdict, rule, policy version, state, time
```

Negative control: the same trace without the pre-assigned id. At T4 the
outcome exists but the record cannot name it, and the review cannot tell
whether the guard ran at all. The control demonstrates the point rather
than merely covering it.

## The four-part binding

One verdict event binds, in a single record:

1. the pre-assigned action id (nameable before any effect)
2. the hash of the policy version in force
3. the decision
4. the effect reference the id makes nameable before the effect

A third party verifies without trusting the host: which guard (judge
identity), which version (policy hash), which action (id chain). A
stranger re-derives the binding from the bundle alone.

## Guarantee limits (as corrected in review, recorded)

- Signature plus policy hash prove integrity and provenance, not correct
  enforcement, not institutional authorization, not effect execution.
- Issuance (the audit system minting the id range) does not by itself
  prove the action was proposed; what makes the gap independent is the
  issuer's own record, which requires no trust in the host.
- The guarantees are per action class. One global guarantee is the wrong
  answer: the cost (availability, latency on the decision path) is paid
  where the consequence requires it.

Status: rows 1-4 and tests 1-4 are implemented in this harness (the
harness IS test 4's substrate; tests 1-3 map to G-MISSING, the WAL
discussion, and the host-kill scenario respectively). The four rows
are also executable against an agent: **family F2 (state and recovery)**
turns each row into a check the agent is measured on (E evidence at
decision time, P persistence across a session boundary, R recovery from
a failed lookup, V independent verification of an asserted outcome),
with 8 items, 8 negative controls, and its own judge audit; committed
evidence at `runs/demo-f2`. The check-to-row mapping is in
`harness/f2_state_recovery/family.py` and the harness spec. The
guarantee and failure-assumption columns remain the open work of this
practice.
