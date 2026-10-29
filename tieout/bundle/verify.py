"""P5 re-derivation.

verify re-checks the hash chain, re-hashes the manifest, and re-derives
every verdict from the stored raw outputs, all without re-running the
model: no model, no key, no network. The bundle either passes a
stranger's verify or it does not exist, as far as this project is
concerned.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from ..hashing import GENESIS, record_hash, sha256_file
from ..models import NamedGap

GAP_CODES = (
    "G-MISSING",           # an expected pre-assigned id has no record
    "G-HASH",              # chain, tail, or file hash does not recompute
    "G-VERDICT-MISMATCH",  # re-derived verdict differs from the stored one
    "G-CONTROL",           # a negative control no longer re-derives
    "G-RECORD",            # a trailing record (audit/gap) fails its hash
    "G-PROVENANCE",        # provenance fields missing
)


@dataclass
class VerifyResult:
    ok: bool
    verdict: str
    lines: list[str] = field(default_factory=list)
    gaps: list[NamedGap] = field(default_factory=list)


def _add_gap(res: VerifyResult, code: str, scope: str, reason: str) -> None:
    res.gaps.append(
        NamedGap(
            gap_id=f"verify:{code}:{scope}",
            code=code,
            scope=scope,
            reason=reason,
        )
    )


def load_lines(run_dir: Path) -> list[dict]:
    bundle = run_dir / "bundle.jsonl"
    with open(bundle, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def verify_bundle(run_dir: str | Path, family=None) -> VerifyResult:
    run_dir = Path(run_dir)
    res = VerifyResult(ok=True, verdict="PASS")
    lines = load_lines(run_dir)
    manifest = lines[0]
    if manifest.get("type") != "manifest":
        _add_gap(res, "G-PROVENANCE", "line:0", "first line is not a manifest")
        res.ok = False
        res.verdict = "FAIL"
        res.lines.append("line 0: expected manifest, got " + manifest.get("type", "?"))
        return res

    prov = manifest.get("provenance", {})
    if not prov.get("harness_version") or not prov.get("dataset_hash"):
        _add_gap(res, "G-PROVENANCE", "manifest.provenance", "provenance incomplete")

    chained = [ln for ln in lines[1:] if ln.get("type") in ("event", "control")]
    events = [ln for ln in chained if ln.get("type") == "event"]
    controls = [ln for ln in chained if ln.get("type") == "control"]
    trailing = [ln for ln in lines[1:] if ln.get("type") not in ("event", "control")]

    res.lines.append(f"format : {manifest.get('bundle_format')}")
    res.lines.append(f"run    : {manifest.get('run_id')}")
    res.lines.append(f"agent  : {prov.get('agent')}")

    # 1. walk the chain
    prev = GENESIS
    for i, rec in enumerate(chained, start=1):
        stored = rec.get("record_hash", "")
        if rec.get("prev_hash") != prev:
            _add_gap(res, "G-HASH", f"line:{i}", "prev_hash does not link to the prior record")
        recomputed = record_hash(rec)
        if recomputed != stored:
            _add_gap(res, "G-HASH", f"line:{i}", "record hash does not recompute (content tampered)")
        prev = stored
    res.lines.append(
        f"chain  : {len(chained)} records, "
        + ("intact" if not any(g.code == "G-HASH" for g in res.gaps) else "BROKEN")
    )

    # 2. manifest cross-checks
    if len(events) != manifest.get("event_count"):
        _add_gap(
            res, "G-MISSING", "manifest.event_count",
            f"manifest claims {manifest.get('event_count')} events, bundle has {len(events)}",
        )
    if len(controls) != manifest.get("control_count"):
        _add_gap(
            res, "G-MISSING", "manifest.control_count",
            f"manifest claims {manifest.get('control_count')} controls, bundle has {len(controls)}",
        )
    if chained and manifest.get("tail_event_hash") != chained[-1].get("record_hash"):
        _add_gap(res, "G-HASH", "manifest.tail_event_hash", "tail hash does not match the last record")
    sha_file = run_dir / "manifest.sha256"
    if sha_file.exists():
        claimed = sha_file.read_text(encoding="utf-8").split()[0]
        actual = sha256_file(run_dir / "bundle.jsonl")
        if claimed != actual:
            _add_gap(res, "G-HASH", "manifest.sha256", "bundle file hash does not match manifest.sha256")
        res.lines.append("file   : sha256 " + ("match" if claimed == actual else "MISMATCH"))
    else:
        _add_gap(res, "G-MISSING", "manifest.sha256", "manifest.sha256 file absent")

    # 3. pre-assigned ids: absence is nameable (P4)
    emitted = {e.get("item_id") for e in events}
    for iid in manifest.get("expected_item_ids", []):
        if iid not in emitted:
            _add_gap(res, "G-MISSING", iid, f"pre-assigned item {iid} has no verdict record")
    missing_ids = [i for i in manifest.get("expected_item_ids", []) if i not in emitted]
    res.lines.append(
        f"items  : {len(emitted)}/{len(manifest.get('expected_item_ids', []))} pre-assigned ids present"
        + ("" if not missing_ids else f" (missing: {', '.join(missing_ids)})")
    )

    # 4. re-derive verdicts from stored raw (no model, no key, no network)
    if family is not None:
        mismatches = 0
        for e in events:
            if e.get("raw_output") is None or e.get("decision") is None:
                continue
            try:
                det = family.detector_for(e["check"])
            except KeyError:
                _add_gap(res, "G-PROVENANCE", e.get("item_id"), f"check {e.get('check')} unknown to the family")
                continue
            fired = bool(det(e["raw_output"]))
            expected = "fail" if fired else "pass"
            if fired != e.get("detector_fired") or expected != e.get("decision"):
                mismatches += 1
                _add_gap(
                    res, "G-VERDICT-MISMATCH", e.get("item_id"),
                    f"re-derived fired={fired} ({expected}), stored fired={e.get('detector_fired')} ({e.get('decision')})",
                )
        res.lines.append(
            f"re-derive: {len(events) - mismatches}/{len(events)} verdicts re-derived from stored raw"
        )
        for c in controls:
            try:
                det = family.detector_for(c["check"])
            except KeyError:
                continue
            fired = bool(det(c.get("crafted_raw", "")))
            if fired != c.get("fired") or fired != c.get("expected_fire"):
                _add_gap(res, "G-CONTROL", c.get("control_id"), "control no longer re-derives as stored")
        fp = sum(1 for c in controls if c.get("kind") == "known-hold" and c.get("fired"))
        fn = sum(1 for c in controls if c.get("kind") == "known-broken" and not c.get("fired"))
        res.lines.append(f"controls: {len(controls)} re-derived, {fp} FP / {fn} FN")

    # 5. trailing records (judge audit, named gaps)
    for rec in trailing:
        if record_hash(rec) != rec.get("record_hash", ""):
            _add_gap(res, "G-RECORD", rec.get("type"), "trailing record hash does not recompute")

    if res.gaps:
        res.ok = False
        res.verdict = "FAIL"
        res.lines.append(f"gaps   : {len(res.gaps)} named gap(s)")
        for g in res.gaps:
            res.lines.append(f"  [{g.code}] {g.scope}: {g.reason}")
    else:
        res.lines.append("gaps   : none")
    res.lines.append(f"VERDICT: {res.verdict}" + (" (re-derivable by a stranger)" if res.ok else ""))
    return res
