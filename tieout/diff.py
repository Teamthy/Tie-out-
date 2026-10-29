"""Cross-run stability diff.

The same suite run twice is a claim about stability; this module is
the record that settles it. Two bundles are aligned by pre-assigned
item id (the P1 invariant that makes alignment possible without any
model), and each aligned item is compared two ways:

  verdict drift    the decision changed between runs
  transcript drift the words changed but the verdict did not

A healthy deterministic harness shows transcript drift with zero
verdict drift. A live model under temperature shows both, and the
table says exactly where. diff reads the stored records; record
integrity is verify's job, not diff's.
"""
from __future__ import annotations

import json
from pathlib import Path

from .stats import clopper_pearson


class DiffError(ValueError):
    pass


def _load(run_dir: str | Path) -> tuple[dict, list[dict]]:
    run_dir = Path(run_dir)
    bundle = run_dir / "bundle.jsonl"
    if not bundle.exists():
        raise DiffError(f"no bundle at {run_dir}")
    lines = [
        json.loads(line)
        for line in bundle.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    manifest = lines[0]
    events = [ln for ln in lines[1:] if ln.get("type") == "event"]
    return manifest, events


def _rate(events: list[dict]) -> tuple[float, list[float], int, int]:
    n = len(events)
    k = sum(1 for e in events if e.get("decision") == "pass")
    lo, hi = clopper_pearson(n, k)
    return (round(k / n, 6) if n else 0.0, [lo, hi], k, n)


def diff_bundles(a_dir: str | Path, b_dir: str | Path) -> dict:
    ma, ea = _load(a_dir)
    mb, eb = _load(b_dir)

    fam_a = {e.get("family") for e in ea}
    fam_b = {e.get("family") for e in eb}
    if fam_a != fam_b:
        raise DiffError(f"bundles cover different families: {sorted(fam_a)} vs {sorted(fam_b)}")

    by_a = {e["item_id"]: e for e in ea}
    by_b = {e["item_id"]: e for e in eb}
    common = sorted(set(by_a) & set(by_b))
    only_a = sorted(set(by_a) - set(by_b))
    only_b = sorted(set(by_b) - set(by_a))

    rows = []
    flips = 0
    drift = 0
    for iid in common:
        a, b = by_a[iid], by_b[iid]
        flipped = a.get("decision") != b.get("decision")
        drifting = a.get("raw_output") != b.get("raw_output")
        flips += 1 if flipped else 0
        drift += 1 if (drifting and not flipped) else 0
        rows.append(
            {
                "item_id": iid,
                "family": a.get("family"),
                "check": a.get("check"),
                "action": a.get("action"),
                "decision_a": a.get("decision"),
                "decision_b": b.get("decision"),
                "flipped": flipped,
                "transcript_drift": drifting,
            }
        )

    rate_a, ci_a, pass_a, n_a = _rate(ea)
    rate_b, ci_b, pass_b, n_b = _rate(eb)
    aligned = len(common)
    return {
        "run_a": ma.get("run_id"),
        "run_b": mb.get("run_id"),
        "agent_a": ma.get("provenance", {}).get("agent"),
        "agent_b": mb.get("provenance", {}).get("agent"),
        "families": sorted(fam_a),
        "aligned": aligned,
        "only_in_a": only_a,
        "only_in_b": only_b,
        "verdict_flips": flips,
        "transcript_drift": drift,
        "stability": round((aligned - flips) / aligned, 6) if aligned else 1.0,
        "rate_a": {"pass": pass_a, "n": n_a, "pass_rate": rate_a, "ci95": ci_a},
        "rate_b": {"pass": pass_b, "n": n_b, "pass_rate": rate_b, "ci95": ci_b},
        "rows": rows,
    }


def format_report(d: dict) -> str:
    lines = [
        "tieout diff",
        "  a : %s (%s)" % (d["run_a"], d["agent_a"]),
        "  b : %s (%s)" % (d["run_b"], d["agent_b"]),
        "  aligned    : %d items (by pre-assigned id)" % d["aligned"],
        "  verdicts   : %d flipped, %d stable  ->  stability %.3f"
        % (d["verdict_flips"], d["aligned"] - d["verdict_flips"], d["stability"]),
        "  transcripts: %d drifted without a verdict flip" % d["transcript_drift"],
        "  rate a     : %d/%d pass (%.4f), 95%% CI %.4f..%.4f"
        % (d["rate_a"]["pass"], d["rate_a"]["n"], d["rate_a"]["pass_rate"], d["rate_a"]["ci95"][0], d["rate_a"]["ci95"][1]),
        "  rate b     : %d/%d pass (%.4f), 95%% CI %.4f..%.4f"
        % (d["rate_b"]["pass"], d["rate_b"]["n"], d["rate_b"]["pass_rate"], d["rate_b"]["ci95"][0], d["rate_b"]["ci95"][1]),
    ]
    if d["only_in_a"] or d["only_in_b"]:
        lines.append("  alignment  : %d only in a, %d only in b" % (len(d["only_in_a"]), len(d["only_in_b"])))
    flipped_rows = [r for r in d["rows"] if r["flipped"]]
    if flipped_rows:
        lines.append("  flipped:")
        for r in flipped_rows:
            lines.append("    %s: %s -> %s" % (r["item_id"], r["decision_a"], r["decision_b"]))
    stable = d["aligned"] - d["verdict_flips"]
    lines.append(
        "  verdicts stable: %d/%d across the two runs" % (stable, d["aligned"])
    )
    lines.append(
        "  read the raw outputs in both bundles before you trust the stability."
    )
    return "\n".join(lines)
