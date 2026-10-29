A pass rate without an environment is a number without a referent. Two runs can produce 13/14 with the same items and the same detectors and still be different measurements: a different Python, a different pydantic, a detector whose behaviour changed in a patch release, a model endpoint that now resolves to a new deployment. The verdict is a claim about a target, and the environment is part of the claim.

This is the second pillar, and it is the one that gets skipped in practice because the interesting part of an eval is the target and the boring part is the plumbing. The boring part is what makes the number reproducible.

## What a bundle pins

The manifest's provenance block for the F2 run in this repository:

| field | value |
|-------|-------|
| agent | sample:deterministic-orderbot |
| suite | f2 |
| harness version | 0.3.0 |
| harness git | empty string |
| model | null |
| model version | null |
| seed | 0 |
| dataset hash | sha256:f92f1905823cc6fd569f4f2f1328e9c792ee4a27d32e5b7db34e1b2ce59d3e59 |
| family policy hash | F2 sha256:d617f7ab613f25eef148a0fb52d67a223d65841a03da5ffe8af2b1e6111c914f |
| environment | python 3.11.2, Linux-6.1.158+-x86_64-with-glibc2.36, x86_64 |
| decoding | empty object |
| started / finished | 2026-10-29T21:40:22Z / 2026-10-29T21:40:22Z |
| packages | fastapi 0.162.0, httpx 0.28.1, pydantic 2.14.2, tieout 0.3.0, uvicorn 0.54.0 |
| packages hash | sha256:ad5b76bc56823f5743413584bb26f0640a00d8de3681bb2fd0f38b4cf4e1b5fa |

Each field earns its place. The dataset hash is the canonical hash of the item ids and input specs, so two runs that claim the same dataset hash were given the same inputs. The family policy hash is the hash of the declaration that contains the items, the controls and the detector names, so two bundles with the same policy hash were judged by the same content. The seed is recorded because surface drift depends on it. The environment block is recorded because a detector can depend on a pydantic version and you cannot tell by looking.

## The watched set, and why it is not the whole environment

Hashing the entire environment is the wrong goal. It changes constantly, most of it does not matter, and a hash that changes for irrelevant reasons is a hash people learn to ignore.

So the record hashes a declared set: tieout, fastapi, uvicorn, pydantic, httpx, openai. Those are the packages whose versions can change the outcome of a run. The list is in `tieout/provenance.py`, it is small enough to audit, and `packages_hash` is the canonical hash of the sorted name/version pairs that were actually installed.

The consequence is precise and worth stating: the manifest claims exactly what it watches, and nothing else. It does not claim the OS image, the CPU microarchitecture, the filesystem's sorting behaviour or a wheel that is not on the list. A reader who needs more can add to the watched set, at which point the hash changes and every bundle written after that records the larger claim.

## The empty fields are also information

Two fields in the table above are empty on purpose.

`model` is null because the sample agent is deterministic and calls no model. The event records say so directly: `judge_endpoint: local:deterministic detector (no network, no model)` and `target_endpoint: local:sample-orderbot (deterministic, no network)`. A bundle that claims a model call while carrying these endpoints would be internally inconsistent, and a reader would see it.

`harness_git` is an empty string. The harness commit was not available to the process that wrote these bundles. That is a gap, it is visible in the record, and it is the kind of gap the format prefers to show rather than fill with a plausible value. Nothing in verify fails because of it; a reviewer who needs commit identity gets it from the repository that contains the bundles, which is the same repository that contains the code.

Both empties follow the P4 rule: anything that could not be established is recorded as absent with a reason rather than silently omitted. It is a small discipline that makes the rest of the block believable.

## Additive, so old bundles keep verifying

`runs/demo` was written at 0.2.0 with bundle format `tieout-bundle/v1`. Its provenance block has no `packages` and no `packages_hash`, and its manifest has `statistics: null`. It still verifies at 0.3.0, unchanged, because the new fields are additive and verify does not require them.

That is the correct behaviour for a format whose value is longevity: a record written before the environment-locking existed is still a record, and the honest reading is "this bundle predates package pinning", not "this bundle is invalid". The v1.1 spec says which fields are required and which were added, and a reader can tell from `bundle_format` which contract the file was written under.

The alternative, a format that upgrades itself by invalidating old artifacts, would make every improvement a reason to distrust the archive. That is a bad trade for an evidence format.

## The site's own pin

The same discipline applies to the deployment of this site, which is the layer that usually goes unrecorded. Two files carry it:

`.python-version` contains `3.12`. It must be a version the runtime offers, and that is not a formality: an earlier deployment attempt pinned 3.11, the platform rejected it before installing a single dependency, and the build failed with `No interpreter found for Python 3.11`. The pin is part of the deploy, and a wrong pin is a deploy that does not happen.

`uv.lock` is committed, and the platform installs with `uv sync --locked`. A lockfile that drifts from `pyproject.toml` turns the deploy into a different environment than the one that was tested, so CI now runs `uv lock --check` on every push. If the two disagree, the build fails in CI before it can fail in production.

That is provenance for a website, which sounds excessive until the page you are reading is the evidence. The claim "the numbers on this page come from the committed bundles" depends on the site that renders them being built from the repository that contains them, with an environment that is pinned the same way the bundles are.

## What provenance does not establish

It does not establish that the code is correct, that the detectors measure the right thing, or that the target was actually the target. It establishes identity: this run, this environment, this dataset, this policy, this judge endpoint.

Identity is what makes disagreement productive. Two runs that disagree while claiming the same dataset hash and different package hashes are a bug report waiting to be written; two runs that disagree with different dataset hashes are two different experiments wearing the same name. Without the block you cannot tell which situation you are in, and with it you usually can.

## Reproduce it

```
pip install -e .
python - <<'PY'
import json
m = json.loads(open("runs/demo-f2/bundle.jsonl").readline())
print(json.dumps(m["provenance"], indent=2, sort_keys=True))
PY
uv lock --check
```

The first prints the block quoted above. The second is the check that keeps the deployed site's environment honest, and it runs in CI on every push.
