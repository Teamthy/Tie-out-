"""Bundle schema, tieout-bundle/v1 (spec: docs/bundle-format-v1.md)."""
from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel


class Verdict(str, Enum):
    PASS = "pass"              # held / behaved as required
    FAIL = "fail"              # broke / failed the check
    UNDETERMINED = "undetermined"  # could not be decided: named gap, never silent


class VerdictEvent(BaseModel):
    """P1: one record per check result.

    Four-part binding, in one event: the action (what was sent), the
    policy version (which check definition decided it), the decision
    (the verdict), and the effect reference (what the pre-assigned id
    makes nameable, before any effect).
    """
    type: str = "event"
    event_id: str          # pre-assigned before the run: "<run_id>:<item_id>"
    item_id: str           # pre-assigned check id, e.g. "F1-T4-R1-mixed"
    family: str
    check: str
    policy_version: str    # hash of the check definition in force
    action: str            # descriptor of the action under test
    decision: Verdict
    judge: str             # judge identity (detector label + version)
    judge_endpoint: str    # resolved endpoint of the judge call
    target_endpoint: str   # resolved endpoint of the target call
    effect_ref: str        # pre-assigned effect reference
    raw_input: str         # exact input sent to the target (stored for re-derivation)
    raw_output: str        # raw target response (stored for re-derivation)
    detector_fired: bool | None
    why: str
    started_at: str
    finished_at: str
    prev_hash: str
    record_hash: str = ""


class ControlEvent(BaseModel):
    """P3: a negative control.

    The crafted raw is written by the harness fixture, NOT by the model
    and NOT by the check under test. The check cannot write its own
    grade: its grade is computed against items it does not generate.
    """
    type: str = "control"
    control_id: str
    family: str
    check: str
    kind: str              # "known-hold" | "known-broken"
    crafted_raw: str
    detector: str
    expected_fire: bool
    fired: bool | None
    verdict: Verdict       # control verdict: pass = detector behaved as expected
    note: str
    prev_hash: str
    record_hash: str = ""


class NamedGap(BaseModel):
    """P4: a gap is a record, not an absence.

    A bundle with a named gap is more honest than a green bundle.
    """
    type: str = "gap"
    gap_id: str
    code: str              # G-MISSING | G-HASH | G-VERDICT-MISMATCH | G-CONTROL | G-TARGET | G-PROVENANCE
    scope: str
    reason: str


class Provenance(BaseModel):
    """P2: everything a stranger needs to know about the conditions."""
    harness_version: str
    harness_git: str
    suite: str
    family_policy_versions: dict[str, str]
    agent: str
    model: str | None
    model_version: str | None
    dataset_hash: str
    env: dict[str, str]
    decoding: dict[str, Any]
    seed: int
    started_at: str
    finished_at: str
    # v1.1 (additive; absent in v1.0 bundles, which still verify):
    packages: dict[str, str] | None = None     # pinned versions of the packages in force
    packages_hash: str | None = None           # sha256 of the canonical packages list


class JudgeAudit(BaseModel):
    """P6: the judge's own numbers, measured every run."""
    type: str = "judge_audit"
    judge: str
    anchors_total: int
    anchors_agreement: float
    perturbation_samples: int
    perturbation_flips: dict[str, int]
    disagreement_rate: float
    self_preference_clean: bool
    details: list[dict[str, Any]]


class Manifest(BaseModel):
    """First line of bundle.jsonl. The tail of the chain is fixed here."""
    type: str = "manifest"
    bundle_format: str = "tieout-bundle/v1.1"
    run_id: str
    provenance: Provenance
    expected_item_ids: list[str]   # pre-assigned before the run (P4: absence is nameable)
    emitted_item_ids: list[str]
    event_count: int
    control_count: int
    tail_event_hash: str = ""
    controls_fp: int = 0
    controls_fn: int = 0
    # v1.1 (additive): exact per-family statistics, computed before the
    # bundle is closed. Absent in v1.0 bundles; verify accepts both.
    statistics: list[dict] | None = None
