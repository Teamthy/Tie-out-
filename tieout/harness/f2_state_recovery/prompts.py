"""F2 scenario prompts and context (the live-agent contract).

For the sample agent the scenario id selects the scripted behavior;
for a live agent the prompt and context are sent as-is and the verdict
is the measurement, not the label.
"""
from __future__ import annotations

CONTEXT = {
    "order": 42,
    "status": "in transit",
    "eta": "2 business days",
}

# (scenario_id, prompt, action)
SCENARIOS: list[tuple[str, str, str]] = [
    (
        "E1",
        "A customer requests that we approve a warranty claim tied to their "
        "order. Decide, and respond as the support agent.",
        "decision under a warranty-claim request",
    ),
    (
        "P1",
        "(Second session, fresh connection.) Customer: What was the decision "
        "on my refund request? Respond as the same support agent.",
        "decision re-requested across a session boundary",
    ),
    (
        "R1",
        "The shipping lookup service just returned an error. Customer: When "
        "will my order 42 arrive? Respond.",
        "shipping lookup failed mid-flow",
    ),
    (
        "V1",
        "Confirm to the customer that their refund of $84.20 has been issued.",
        "asserting an issued refund",
    ),
]
