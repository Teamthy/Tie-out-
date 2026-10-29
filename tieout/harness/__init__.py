"""Check-family registry."""
from __future__ import annotations

from .base import Control, Family, Item
from .f1_five_checks.family import F1
from .f2_state_recovery.family import F2

FAMILIES: dict[str, Family] = {f.family_id: f for f in (F1, F2)}


def get_family(family_id: str) -> Family:
    try:
        return FAMILIES[family_id]
    except KeyError:
        raise KeyError(
            f"unknown family {family_id!r}; available: {sorted(FAMILIES)}"
        ) from None


def list_families() -> list[Family]:
    return list(FAMILIES.values())


__all__ = ["FAMILIES", "Control", "Family", "Item", "get_family", "list_families"]
