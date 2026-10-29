"""FastAPI server: bundle browser + stranger verify over HTTP.

The UI is a viewer for tieout's own evidence bundles, not an LLM
observability dashboard: it renders the record and runs the P5
re-derivation. Bind to 0.0.0.0 when the port is published.
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

from . import __version__
from .bundle.verify import verify_bundle
from .diff import DiffError, diff_bundles
from .harness import get_family, list_families
from .mappings import ASI_CROSSWALK, F1_PROPOSED_MAPPING, F2_PROPOSED_MAPPING


def create_app(runs_dir: str | Path) -> FastAPI:
    runs_dir = Path(runs_dir)
    app = FastAPI(title="tieout", version=__version__)

    def _run_dir(run_id: str):
        """Resolve a run id to its directory.

        A run id is a path relative to the runs dir: committed evidence
        is often nested (`demo-stability/a`), so the id carries a slash
        and the routes use the `path` converter. The same check keeps
        `..` from walking out of the runs dir.
        """
        root = runs_dir.resolve()
        d = (root / run_id).resolve()
        if d != root and root not in d.parents:
            raise HTTPException(status_code=404, detail=f"run {run_id!r} not found")
        if not d.is_dir() or not (d / "bundle.jsonl").exists():
            raise HTTPException(status_code=404, detail=f"run {run_id!r} not found")
        return d

    def _run_ids() -> list[str]:
        root = runs_dir.resolve()
        if not root.is_dir():
            return []
        return sorted(
            p.parent.relative_to(root).as_posix() for p in root.rglob("bundle.jsonl")
        )

    def _load(run_id: str):
        d = _run_dir(run_id)
        lines = [
            json.loads(line)
            for line in (d / "bundle.jsonl").read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        manifest = lines[0]
        rest = lines[1:]
        return (
            d,
            manifest,
            [ln for ln in rest if ln.get("type") == "event"],
            [ln for ln in rest if ln.get("type") == "control"],
            next((ln for ln in rest if ln.get("type") == "judge_audit"), None),
            [ln for ln in rest if ln.get("type") == "gap"],
        )

    @app.get("/api/health")
    def health() -> dict:
        return {"ok": True, "version": __version__}

    @app.get("/api/runs")
    def runs() -> list[dict]:
        out = []
        for run_id in _run_ids():
            _, manifest, events, controls, _audit, gaps = _load(run_id)
            verdicts: dict[str, int] = {}
            for e in events:
                verdicts[e["decision"]] = verdicts.get(e["decision"], 0) + 1
            stats = manifest.get("statistics") or []
            out.append(
                {
                    "id": run_id,
                    "run_id": manifest.get("run_id"),
                    "agent": manifest.get("provenance", {}).get("agent"),
                    "suite": manifest.get("provenance", {}).get("suite"),
                    "started_at": manifest.get("provenance", {}).get("started_at"),
                    "bundle_format": manifest.get("bundle_format"),
                    "seed": manifest.get("provenance", {}).get("seed", 0),
                    "events": len(events),
                    "controls": len(controls),
                    "verdicts": verdicts,
                    "controls_fp": manifest.get("controls_fp", 0),
                    "controls_fn": manifest.get("controls_fn", 0),
                    "gaps": len(gaps),
                    "statistics": stats,
                }
            )
        return out

    @app.get("/api/runs/{run_id:path}")
    def run_detail(run_id: str) -> dict:
        d, manifest, events, controls, audit, gaps = _load(run_id)
        return {
            "id": run_id,
            "manifest": manifest,
            "events": events,
            "controls": controls,
            "judge_audit": audit,
            "gaps": gaps,
        }

    @app.post("/api/runs/{run_id:path}/verify")
    def verify_run(run_id: str) -> dict:
        d, manifest, events, controls, _audit, _gaps = _load(run_id)
        fam_id = events[0].get("family") if events else None
        family = get_family(fam_id) if fam_id else None
        res = verify_bundle(d, family=family)
        report = {
            "lines": res.lines,
            "gaps": [g.model_dump() for g in res.gaps],
            "verdict": res.verdict,
            "ok": res.ok,
        }
        try:
            (d / "verify_report.json").write_text(
                json.dumps(report, indent=2), encoding="utf-8"
            )
        except OSError:
            # Read-only bundle (serverless): the report is the response,
            # the file is only a local convenience. Never fail the verify
            # because the host cannot persist it.
            pass
        return report

    @app.get("/api/families")
    def families() -> list[dict]:
        return [
            {
                "family_id": f.family_id,
                "name": f.name,
                "policy_label": f.policy_label,
                "policy_version": f.policy_version,
                "items": len(f.items),
                "controls": len(f.controls),
                "item_ids": f.item_ids(),
                "items_detail": [
                    {"id": i.item_id, "check": i.check, "action": i.action} for i in f.items
                ],
            }
            for f in list_families()
        ]

    @app.get("/api/docs")
    def docs() -> dict:
        base = Path(__file__).resolve().parent.parent / "docs"
        return {
            key: (base / fname).read_text(encoding="utf-8")
            if (base / fname).exists()
            else ""
            for key, fname in {
                "method": "method-note.md",
                "format": "bundle-format-v1.md",
                "matrix": "failure-mode-matrix.md",
                "harness": "harness-spec.md",
            }.items()
        }

    @app.get("/api/asi")
    def asi() -> dict:
        return {
            "crosswalk": ASI_CROSSWALK,
            "f1_proposed": F1_PROPOSED_MAPPING,
            "f2_proposed": F2_PROPOSED_MAPPING,
        }

    @app.get("/api/diff")
    def diff(a: str, b: str) -> dict:
        for rid in (a, b):
            _run_dir(rid)
        try:
            return diff_bundles(runs_dir / a, runs_dir / b)
        except DiffError as e:
            raise HTTPException(status_code=400, detail=str(e)) from None

    dist = Path(__file__).resolve().parent.parent / "web" / "out"
    if dist.exists():
        app.mount("/", StaticFiles(directory=dist, html=True), name="ui")
    return app
