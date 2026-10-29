"""Suite runner: emits P1 verdict events, P3 controls, P4 gaps, P6 audit."""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from ..bundle.writer import write_bundle
from ..calibration.audit import run_audit
from ..hashing import GENESIS, canonical, record_hash, sha256_text
from ..models import (
    Manifest,
    NamedGap,
    Verdict,
)
from ..provenance import snapshot
from ..stats import family_statistics
from .agents import AgentError
from .base import Family

UTC = "%Y-%m-%dT%H:%M:%SZ"


def _now() -> str:
    return datetime.now(timezone.utc).strftime(UTC)


@dataclass
class RunResult:
    run_id: str
    out_dir: Path
    events: list[dict] = field(default_factory=list)
    controls: list[dict] = field(default_factory=list)
    gaps: list[dict] = field(default_factory=list)
    audit: dict = field(default_factory=dict)
    manifest: dict = field(default_factory=dict)

    def metrics(self, family: Family) -> list[dict]:
        """The metric (check T5 of the five-tests method): specific
        failure, sample size, rate, grouped by top-level check."""
        groups: dict[str, list[dict]] = {}
        for e in self.events:
            groups.setdefault(e["check"].split("-")[0], []).append(e)
        order = [c.split("-")[0] for c in (i.check for i in family.items)]
        seen: set[str] = set()
        ordered = [c for c in order if not (c in seen or seen.add(c))]
        rows = []
        for key in ordered:
            evs = groups.get(key, [])
            fired = sum(1 for e in evs if e.get("detector_fired") is True)
            und = sum(1 for e in evs if e.get("decision") == Verdict.UNDETERMINED.value)
            rows.append(
                {
                    "check": key,
                    "total": len(evs),
                    "fired": fired,
                    "undetermined": und,
                    "rate": (f"{fired} of {len(evs)}") if evs else "n/a",
                }
            )
        return rows


def run_suite(
    family: Family,
    agent,
    *,
    out_dir: str | Path,
    run_id: str | None = None,
    suite_name: str | None = None,
    harness_git: str = "",
    model: str | None = None,
    model_version: str | None = None,
    decoding: dict | None = None,
    seed: int = 0,
) -> RunResult:
    run_id = run_id or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:6]
    out_dir = Path(out_dir)
    suite_name = suite_name or family.family_id.lower()
    started_at = _now()

    # P1: every event id and effect reference is assigned BEFORE the run.
    expected_item_ids = family.item_ids()
    dataset_hash = "sha256:" + sha256_text(
        canonical([{"id": i.item_id, "input": i.input_spec} for i in family.items])
    )
    judge = family.judge_identity()

    events: list[dict] = []
    controls: list[dict] = []
    gaps: list[NamedGap] = []
    prev = GENESIS

    for item in family.items:
        event_id = f"{run_id}:{item.item_id}"
        effect_ref = f"effect:{run_id}:{item.item_id}"
        s = _now()
        err = None
        try:
            raw_out, target_ep = agent.respond(item.input_spec)
        except AgentError as e:
            raw_out, target_ep, err = "", getattr(agent, "ENDPOINT", "unknown"), str(e)
        det = family.detector_for(item.check)
        if err:
            decision, fired, why = Verdict.UNDETERMINED, None, f"target error: {err}"
            gaps.append(
                NamedGap(
                    gap_id=f"{run_id}:G-TARGET:{item.item_id}",
                    code="G-TARGET",
                    scope=item.item_id,
                    reason=err,
                )
            )
        else:
            fired = bool(det(raw_out))
            decision = Verdict.FAIL if fired else Verdict.PASS
            why = "detector fired (target broke the check)" if fired else "detector silent (held)"
        payload = {
            "type": "event",
            "event_id": event_id,
            "item_id": item.item_id,
            "family": family.family_id,
            "check": item.check,
            "policy_version": family.policy_version,
            "action": item.action,
            "decision": decision.value,
            "judge": judge,
            "judge_endpoint": "local:deterministic detector (no network, no model)",
            "target_endpoint": target_ep,
            "effect_ref": effect_ref,
            "raw_input": canonical(item.input_spec),
            "raw_output": raw_out,
            "detector_fired": fired,
            "why": why,
            "started_at": s,
            "finished_at": _now(),
            "prev_hash": prev,
        }
        payload["record_hash"] = record_hash(payload)
        events.append(payload)
        prev = payload["record_hash"]

    # P3: negative controls, graded against items the check does not generate.
    fp = fn = 0
    for c in family.controls:
        det = family.detector_for(c.check)
        fired = bool(det(c.crafted_raw))
        ok = fired == c.expected_fire
        if not ok:
            if c.expected_fire is False:
                fp += 1
            else:
                fn += 1
            gaps.append(
                NamedGap(
                    gap_id=f"{run_id}:G-CONTROL:{c.control_id}",
                    code="G-CONTROL",
                    scope=c.control_id,
                    reason=(
                        f"control {c.kind} for check {c.check}: expected fire="
                        f"{c.expected_fire}, detector fired={fired}"
                    ),
                )
            )
        payload = {
            "type": "control",
            "control_id": c.control_id,
            "family": family.family_id,
            "check": c.check,
            "kind": c.kind,
            "crafted_raw": c.crafted_raw,
            "detector": judge,
            "expected_fire": c.expected_fire,
            "fired": fired,
            "verdict": Verdict.PASS.value if ok else Verdict.FAIL.value,
            "note": c.note,
            "prev_hash": prev,
        }
        payload["record_hash"] = record_hash(payload)
        controls.append(payload)
        prev = payload["record_hash"]

    finished_at = _now()
    # P6: judge's own numbers, computed offline on stored/crafted raw.
    audit = run_audit(family)
    audit_payload = audit.model_dump()
    audit_payload["record_hash"] = record_hash(audit_payload)

    gap_payloads = []
    for g in gaps:
        gp = g.model_dump()
        gp["record_hash"] = record_hash(gp)
        gap_payloads.append(gp)

    prov = snapshot(
        suite=suite_name,
        family_policy_versions={family.family_id: family.policy_version},
        agent=agent.name,
        dataset_hash=dataset_hash,
        started_at=started_at,
        finished_at=finished_at,
        model=model,
        model_version=model_version,
        decoding=decoding,
        seed=seed,
        harness_git=harness_git,
    )
    # v1.1: exact statistics computed before the bundle is closed, so
    # the interval is part of the record, not a post-hoc opinion.
    statistics = [family_statistics(family.family_id, events)]
    manifest = Manifest(
        run_id=run_id,
        provenance=prov,
        expected_item_ids=expected_item_ids,
        emitted_item_ids=[e["item_id"] for e in events],
        event_count=len(events),
        control_count=len(controls),
        tail_event_hash=prev,
        controls_fp=fp,
        controls_fn=fn,
        statistics=statistics,
    )

    write_bundle(out_dir, manifest, events, controls, audit_payload, gap_payloads)
    return RunResult(
        run_id=run_id,
        out_dir=out_dir,
        events=events,
        controls=controls,
        gaps=gap_payloads,
        audit=audit_payload,
        manifest=manifest.model_dump(),
    )
