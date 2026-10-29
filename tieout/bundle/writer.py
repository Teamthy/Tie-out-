"""Bundle writer: bundle.jsonl + manifest.sha256 (tieout-bundle/v1)."""
from __future__ import annotations

from pathlib import Path

from ..hashing import canonical, sha256_file


def write_bundle(
    run_dir: str | Path,
    manifest,
    events: list[dict],
    controls: list[dict],
    audit: dict,
    gaps: list[dict],
) -> Path:
    run_dir = Path(run_dir)
    run_dir.mkdir(parents=True, exist_ok=True)
    bundle = run_dir / "bundle.jsonl"
    with open(bundle, "w", encoding="utf-8") as f:
        f.write(canonical(manifest.model_dump()) + "\n")
        for rec in list(events) + list(controls) + [audit] + list(gaps):
            f.write(canonical(rec) + "\n")
    digest = sha256_file(bundle)
    (run_dir / "manifest.sha256").write_text(f"{digest}  bundle.jsonl\n", encoding="utf-8")
    return bundle
