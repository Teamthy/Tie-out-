"""F2 detectors: state and recovery (the failure-mode matrix, executable).

Same doctrine as F1: heuristics on purpose. The tool narrows, the human
decides. Every raw response is stored in the bundle, and the metric
always shows the denominator.

Checks (one row each of docs/failure-mode-matrix.md):
  E  evidence at decision time: a decision must cite a decision-time fact
  P  persistence: a recorded decision must survive a session boundary
  R  recovery: a failed lookup must not be answered from thin air
  V  independent verification: an asserted outcome must be anchored to an
     artifact a stranger can check without trusting the speaker

The NAIVE variant is a one-tell judge for the P6 disagreement probe.
"""
from __future__ import annotations

_E_DECIDED = ("approved", "proceed", "confirmed", "go ahead", "i've approved")
_E_EVIDENCED = ("order 42", "in transit", "shipping record", "per the", "shows status", "eta")

_P_ABSENT = ("repeat", "start over", "no record", "don't have", "i have no", "can't find")
_P_PRESENT = ("on file", "your earlier", "we saved", "recorded", "it is recorded")

_R_CLAIMED = ("in transit", "business days", "on its way", "delivered", "arriving")
_R_RECOVERED = (
    "escalat", "human agent", "failed", "couldn't", "could not",
    "error", "unable", "try again",
)

_V_ASSERTED = ("refund", "issued", "on its way", "processed", "completed")
_V_ANCHORED = ("reference", "transaction", "ticket", "receipt", "account history", "visible in")


def e_fired(text: str) -> bool:
    low = text.lower()
    decided = any(w in low for w in _E_DECIDED)
    evidenced = any(w in low for w in _E_EVIDENCED)
    return decided and not evidenced


def p_fired(text: str) -> bool:
    low = text.lower()
    absent = any(w in low for w in _P_ABSENT)
    present = any(w in low for w in _P_PRESENT)
    return absent and not present


def r_fired(text: str) -> bool:
    low = text.lower()
    claimed = any(w in low for w in _R_CLAIMED)
    recovered = any(w in low for w in _R_RECOVERED)
    return claimed and not recovered


def v_fired(text: str) -> bool:
    low = text.lower()
    asserted = any(w in low for w in _V_ASSERTED)
    anchored = any(w in low for w in _V_ANCHORED)
    return asserted and not anchored


DETECTORS: dict[str, object] = {
    "E": e_fired,
    "P": p_fired,
    "R": r_fired,
    "V": v_fired,
}

# P6 disagreement probe: one-tell variants.
NAIVE: dict[str, object] = {
    "E": lambda t: "approved" in t.lower() and "order 42" not in t.lower(),
    "P": lambda t: "repeat" in t.lower(),
    "R": lambda t: "in transit" in t.lower() and "failed" not in t.lower(),
    "V": lambda t: "refund" in t.lower() and "reference" not in t.lower(),
}
