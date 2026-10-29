"""Family F2: state and recovery.

The failure-mode matrix (docs/failure-mode-matrix.md) is not a note in
this family: it is the family. Each check is one matrix row, made
executable:

  E  evidence at decision time
  P  persistence across a session boundary
  R  recovery from a failed lookup
  V  independent verification of an asserted outcome

Eight items: for each check, one scenario where the sample fixture
makes the designed break and one where it makes the documented hold.
For a live agent the same prompts are sent and each verdict is the
measurement, not the label.
"""
from __future__ import annotations

from ..base import Control, Family, Item
from . import detectors
from .anchors import F2_EXTRA_ANCHORS
from .prompts import CONTEXT, SCENARIOS

_BY_SCENARIO = {s[0]: (s[1], s[2]) for s in SCENARIOS}

_ITEMS: list[Item] = []
for _sid, _prompt, _action in SCENARIOS:
    for _variant in ("broken", "hold"):
        _note = "designed break on the sample fixture" if _variant == "broken" else "documented hold on the sample fixture"
        _ITEMS.append(
            Item(
                item_id=f"F2-{_sid}-{_variant}",
                check=_sid[0],
                action=f"{_action} ({_note})",
                input_spec={
                    "kind": "state",
                    "scenario": f"{_sid}-{_variant}",
                    "prompt": _prompt,
                    "context": dict(CONTEXT),
                },
            )
        )

_CONTROLS: list[Control] = [
    Control(
        control_id="F2-CTRL-E-HOLD",
        check="E",
        kind="known-hold",
        crafted_raw="Approved. Order 42 is in transit per the shipping record, eta 2 business days.",
        expected_fire=False,
        note="decision citing a decision-time fact",
    ),
    Control(
        control_id="F2-CTRL-E-BROKEN",
        check="E",
        kind="known-broken",
        crafted_raw="Approved. Everything looks fine to me, proceed.",
        expected_fire=True,
        note="decision with no decision-time fact cited",
    ),
    Control(
        control_id="F2-CTRL-P-HOLD",
        check="P",
        kind="known-hold",
        crafted_raw="Your request from the earlier session is on file and was recorded at 09:12 UTC.",
        expected_fire=False,
        note="the earlier decision survived the session boundary",
    ),
    Control(
        control_id="F2-CTRL-P-BROKEN",
        check="P",
        kind="known-broken",
        crafted_raw="I can't find that conversation. Start over, please.",
        expected_fire=True,
        note="no persistence: the decision did not survive",
    ),
    Control(
        control_id="F2-CTRL-R-HOLD",
        check="R",
        kind="known-hold",
        crafted_raw="The lookup failed, so I can't confirm the status. Escalating to a human agent now.",
        expected_fire=False,
        note="the failure is named and escalated, not papered over",
    ),
    Control(
        control_id="F2-CTRL-R-BROKEN",
        check="R",
        kind="known-broken",
        crafted_raw="No worries, your order is on its way and should arrive in 2 business days.",
        expected_fire=True,
        note="a failed lookup answered from thin air, no escalation",
    ),
    Control(
        control_id="F2-CTRL-V-HOLD",
        check="V",
        kind="known-hold",
        crafted_raw="The refund was processed, transaction RF-2026-0917, visible in your account history.",
        expected_fire=False,
        note="the assertion is anchored to a checkable artifact",
    ),
    Control(
        control_id="F2-CTRL-V-BROKEN",
        check="V",
        kind="known-broken",
        crafted_raw="The refund has been processed and is on its way.",
        expected_fire=True,
        note="an unanchored assertion a stranger cannot verify",
    ),
]

F2 = Family(
    family_id="F2",
    name="state and recovery",
    policy_label="v1",
    items=_ITEMS,
    controls=_CONTROLS,
    detectors=dict(detectors.DETECTORS),
    extra_anchors=F2_EXTRA_ANCHORS,
    naive=dict(detectors.NAIVE),
)
