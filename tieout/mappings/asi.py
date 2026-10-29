"""OWASP Top 10 for Agentic Applications crosswalk.

Record-derived only: the family-to-ASI assignments below follow the
project spec (2026-10-29). Titles appear exactly as recorded in the
spec; where the spec does not record a title, the row says so. The
F1 sub-check mapping is PROPOSED and is recorded as a named gap until
it is confirmed against the full 2026 list (P4: anything that could
not be verified is recorded, never dropped silently).
"""
from __future__ import annotations

ASI_CROSSWALK: list[dict] = [
    {
        "asi": "ASI01",
        "title": "Agent goal hijack",
        "families": ["F1 (T1, T3)"],
        "status": "mapped",
    },
    {
        "asi": "ASI02",
        "title": "tool misuse (planned family F3, per spec)",
        "families": ["F3 (planned)"],
        "status": "planned",
    },
    {
        "asi": "ASI03",
        "title": "identity (planned family F4, per spec)",
        "families": ["F4 (planned)"],
        "status": "planned",
    },
    {
        "asi": "ASI06",
        "title": "memory (planned family F5, per spec)",
        "families": ["F2 (P, proposed)", "F5 (planned)"],
        "status": "mapped",
    },
    {
        "asi": "ASI09",
        "title": "human trust (planned family F6, per spec)",
        "families": ["F6 (planned)"],
        "status": "planned",
    },
    {
        "asi": "ASI10",
        "title": "Rogue agents",
        "families": [],
        "status": "recorded",
    },
]

# F1 sub-check mapping: proposed, pending confirmation against the full
# 2026 OWASP list (named gap G-ASI-MAPPING, to be closed at M3).
F1_PROPOSED_MAPPING: list[dict] = [
    {"check": "T1", "name": "prompt not a wall", "proposed_asi": "ASI01", "status": "proposed"},
    {"check": "T2", "name": "retrieval is untrusted input", "proposed_asi": "ASI01", "status": "proposed"},
    {"check": "T3", "name": "tools trusted unread", "proposed_asi": "ASI01", "status": "proposed"},
    {"check": "T4", "name": "one language", "proposed_asi": "ASI08/ASI09 (human trust lane)", "status": "proposed"},
    {"check": "T5", "name": "the metric", "proposed_asi": "n/a (harness self-measurement, P3/P6)", "status": "proposed"},
]

# F2 sub-check mapping: proposed. E (evidence at decision time), R
# (recovery) and V (independent verification) have no direct row in the
# 2026 list as recorded here; that is a named gap, not a silent drop.
F2_PROPOSED_MAPPING: list[dict] = [
    {"check": "E", "name": "evidence at decision time", "proposed_asi": "no direct row in the recorded list (named gap)", "status": "proposed"},
    {"check": "P", "name": "persistence across a session boundary", "proposed_asi": "ASI06 (memory)", "status": "proposed"},
    {"check": "R", "name": "recovery from a failed lookup", "proposed_asi": "no direct row in the recorded list (named gap)", "status": "proposed"},
    {"check": "V", "name": "independent verification of an asserted outcome", "proposed_asi": "no direct row in the recorded list (named gap)", "status": "proposed"},
]

GAP = {
    "gap_id": "G-ASI-MAPPING",
    "code": "G-PROVENANCE",
    "scope": "mappings/asi.py",
    "reason": "F1 sub-check ASI mapping is proposed; confirm against the full 2026 OWASP Agentic list at M3",
}
