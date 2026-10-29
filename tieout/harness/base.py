"""Check families: items + policy version + verdict emitter + negative controls.

A family declares:
  items      pre-assigned ids, the exact action, the exact input spec,
             and which detector decides the item
  controls   crafted known-hold / known-broken raws (P3): the check
             cannot write its own grade
  detectors  pure functions text -> fired

The policy version is the hash of that declaration, so every verdict
event is bound to the exact check definition that produced it (P1).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from ..hashing import canonical, sha256_text


@dataclass(frozen=True)
class Item:
    item_id: str
    check: str
    action: str
    input_spec: dict


@dataclass(frozen=True)
class Control:
    control_id: str
    check: str
    kind: str            # "known-hold" | "known-broken"
    crafted_raw: str
    expected_fire: bool
    note: str


class Family:
    def __init__(
        self,
        *,
        family_id: str,
        name: str,
        policy_label: str,
        items: list[Item],
        controls: list[Control],
        detectors: dict[str, Callable[[str], bool]],
        extra_anchors: list[tuple[str, bool, str, str]] | None = None,
        naive: dict[str, Callable[[str], bool]] | None = None,
    ) -> None:
        self.family_id = family_id
        self.name = name
        self.policy_label = policy_label
        self.items = items
        self.controls = controls
        self.detectors = detectors
        # P6 inputs, declared by the family that owns them: extra crafted
        # anchors beyond the P3 controls, and the NAIVE one-tell judge
        # variant used by the disagreement probe.
        self.extra_anchors = extra_anchors or []
        self.naive = naive or {}
        self.policy_version = "sha256:" + sha256_text(
            canonical(
                {
                    "family": family_id,
                    "policy": policy_label,
                    "items": [
                        {
                            "id": i.item_id,
                            "check": i.check,
                            "action": i.action,
                            "input": i.input_spec,
                        }
                        for i in items
                    ],
                    "controls": [
                        {
                            "id": c.control_id,
                            "check": c.check,
                            "kind": c.kind,
                            "raw": c.crafted_raw,
                            "expected": c.expected_fire,
                        }
                        for c in controls
                    ],
                    "detectors": {name: fn.__name__ for name, fn in detectors.items()},
                }
            )
        )

    def item_ids(self) -> list[str]:
        return [i.item_id for i in self.items]

    def detector_for(self, check: str) -> Callable[[str], bool]:
        return self.detectors[check]

    def judge_identity(self) -> str:
        return f"detector:{self.family_id.lower()}-{self.policy_label}:{self.policy_version[:24]}"
