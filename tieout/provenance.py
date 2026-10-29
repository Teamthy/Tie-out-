"""P2 provenance snapshot."""
from __future__ import annotations

import platform
from importlib import metadata

from .hashing import canonical, sha256_text
from .models import Provenance

# The packages whose versions can change the outcome of a run. Not the
# whole environment: the pinned set, hashed, is what the record claims.
WATCHED_PACKAGES = (
    "tieout",
    "fastapi",
    "uvicorn",
    "pydantic",
    "httpx",
    "openai",
)


def package_snapshot() -> tuple[dict[str, str], str]:
    packages: dict[str, str] = {}
    for name in WATCHED_PACKAGES:
        try:
            packages[name] = metadata.version(name)
        except metadata.PackageNotFoundError:
            continue
    digest = "sha256:" + sha256_text(canonical(sorted(packages.items())))
    return packages, digest


def snapshot(
    *,
    suite: str,
    family_policy_versions: dict[str, str],
    agent: str,
    dataset_hash: str,
    started_at: str,
    finished_at: str,
    model: str | None = None,
    model_version: str | None = None,
    decoding: dict | None = None,
    seed: int = 0,
    harness_git: str = "",
) -> Provenance:
    from . import __version__

    packages, packages_hash = package_snapshot()
    return Provenance(
        harness_version=__version__,
        harness_git=harness_git,
        suite=suite,
        family_policy_versions=family_policy_versions,
        agent=agent,
        model=model,
        model_version=model_version,
        dataset_hash=dataset_hash,
        env={
            "python": platform.python_version(),
            "platform": platform.platform(),
            "machine": platform.machine(),
        },
        decoding=decoding or {},
        seed=seed,
        started_at=started_at,
        finished_at=finished_at,
        packages=packages,
        packages_hash=packages_hash,
    )
