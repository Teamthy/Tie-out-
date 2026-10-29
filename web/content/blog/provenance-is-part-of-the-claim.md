"Pass rate 92 percent" is not a claim until you can say where it was made.

Model version, decoding parameters, package versions, harness version, dataset hash, seed, machine: every one is a variable that can move the number. A record that omits them cannot be reproduced, compared, or even repeated. So provenance is not metadata around the eval. It is part of the claim, and in this format it is the first record in the file.

## What the manifest actually stores

The `provenance` block of `runs/demo-f2` — a v1.1 bundle — in full:

| field | value |
|---|---|
| `harness_version` | `0.3.0` |
| `harness_git` | `""` (empty, and left empty on purpose) |
| `suite` | `f2` |
| `family_policy_versions` | `{"F2": "sha256:d617f7ab613f25eef148a0fb52d67a223d65841a03da5ffe8af2b1e6111c914f"}` |
| `agent` | `sample:deterministic-orderbot` |
| `model` / `model_version` | `null` / `null` |
| `dataset_hash` | `sha256:f92f1905823cc6fd569f4f2f1328e9c792ee4a27d32e5b7db34e1b2ce59d3e59` |
| `env` | `{"machine": "x86_64", "platform": "Linux-6.1.158+-x86_64-with-glibc2.36", "python": "3.11.2"}` |
| `decoding` | `{}` |
| `seed` | `0` |
| `packages` | `{fastapi: 0.162.0, httpx: 0.28.1, pydantic: 2.14.2, tieout: 0.3.0, uvicorn: 0.54.0}` |
| `packages_hash` | `sha256:ad5b76bc56823f5743413584bb26f0640a00d8de3681bb2fd0f38b4cf4e1b5fa` |

Two fields deserve a note before the rest.

`model` is `null` because there is no model: the target is a deterministic fixture, and the endpoint string recorded on every event says so in words (`local:sample-orderbot (deterministic, no network)`). A null in a provenance block is a fact about the run, not a missing form field.

`harness_git` is empty in all four committed bundles. The field exists, the plumbing to fill it does not, and the record shows a blank rather than a plausible hash. A provenance block that guesses to look complete is worse than one that leaves a visible hole, because the hole is a question a reviewer can ask and a guess is one they cannot.

## The dataset hash is the reproducibility claim

The interesting property of `dataset_hash` is what it makes comparable. Two runs with the same dataset hash, the same policy hash and the same agent are running the same inputs under the same rules — and that is a sha256, not a feeling.

The F1 stability pair is built on exactly that. Runs `20261029T214022Z-941838` (seed 0) and `20261029T214023Z-cfe5b5` (seed 7) share:

- `dataset_hash` `sha256:2fee5c8c9319f5cd…`
- policy version `sha256:b6c24cc7116f24cd…`
- harness `0.3.0`, agent `sample:deterministic-orderbot`, Python 3.11.2, the same packages

and differ in the run id, the timestamps (one second apart) and the seed. Nothing else in the two provenance blocks moves. Any difference between the two bundles is therefore attributable to the seed, and the stability diff can make a claim about the harness rather than about the weather.

## v1.1: the environment includes the packages

Format v1.0 recorded the runtime but not the software. That is a real gap: a verdict decided under a different `pydantic` or `httpx` is a verdict from a different world, and nothing in a v1.0 bundle says which world it came from.

v1.1 closes it with two additive fields. The package list is a declared watch-list, not a `pip freeze`:

```python
WATCHED_PACKAGES = ("tieout", "fastapi", "uvicorn", "pydantic", "httpx", "openai")
```

`openai` is absent from the F2 record because it is not installed, and the snapshot skips missing packages rather than recording `None`. The hash is over the canonical sorted list:

```python
digest = "sha256:" + sha256_text(canonical(sorted(packages.items())))
```

which `tests/test_bundle_v11.py` recomputes independently and compares to the stored value. A reviewer in six months does not have to hope the lockfile survived; the record says what was loaded, and one line of code says whether the record is internally consistent.

The format marker moves from `tieout-bundle/v1` to `tieout-bundle/v1.1`. The reader rule is written down and tested: both fields are optional on read, always emitted on write. `runs/demo` is a v1.0 bundle with neither field, and `test_committed_v1_0_demo_still_verifies` asserts on every commit that it still verifies with no gaps.

A format that can verify its own history can say something about its past. One that cannot has to re-run everything to say anything — which is a strange kind of amnesia for a tool whose product is memory.

## Provenance at three levels

There are three granularities in play, and they answer different questions.

**Per run.** The manifest block above: harness, policy, dataset, environment, packages, seed. It answers "what produced these numbers".

**Per event.** Every event carries `policy_version`, `judge`, `judge_endpoint`, `target_endpoint`, `effect_ref`, and its own timestamps. It answers "what produced this verdict", which matters when a policy changed mid-suite or a judge endpoint moved.

**Per repository.** The commits themselves: which version of the harness, which version of the family declaration, which version of the docs. It answers "what did the code say when this was run", and it is the level at which the honest caveat about `harness_git` lives.

The record is strongest where the three agree. It is most useful where one of them is blank, because a blank is a question someone can act on.

## What provenance cannot do

It cannot prove the environment it reports. A forger can write `python 3.11.2` into a JSON line. The hash chain makes edits detectable and git makes substitution attributable, but no self-reported environment field is proof of environment.

What provenance does is make the claim specific enough to be wrong. "Pass rate 0.5 on F2 under tieout 0.3.0, pydantic 2.14.2, Python 3.11.2, dataset sha256:f92f1905…, 8 events, 4 pass" can be checked, contradicted, or reproduced. "Pass rate 0.5" cannot.

That is the whole practice: the questions a reviewer does not have to ask are the ones the record answered on its own.

## Two generations, side by side

The v1.0 and v1.1 bundles in this repository differ in exactly the fields the format document says they differ in, and comparing them is the cheapest way to see what a format change costs.

| field | v1.0 (`runs/demo`) | v1.1 (`runs/demo-f2`) |
|---|---|---|
| `bundle_format` | `tieout-bundle/v1` | `tieout-bundle/v1.1` |
| `manifest.statistics` | absent | one entry per family: counts, pass rate, `ci95` |
| `provenance.packages` | absent | five packages with versions |
| `provenance.packages_hash` | absent | `sha256:ad5b76bc…` |
| everything else | identical shape | identical shape |

The old bundle still verifies, and the test that says so is not a courtesy:

```python
def test_committed_v1_0_demo_still_verifies():
    demo = ROOT / "runs" / "demo"
    m = _manifest(demo)
    assert m["bundle_format"] == "tieout-bundle/v1"
    assert "statistics" not in m
    assert "packages" not in m["provenance"]
    v = verify_bundle(demo, family=get_family("F1"))
    assert v.ok, v.lines
    assert not v.gaps
```

Read the assertions in order: the marker is v1, the new fields are absent, and the verifier accepts it anyway. A format that only understands its newest version is a format that has to re-run its history to trust it.

## The hash, on a napkin

`packages_hash` is defined by one line, and a reader can reproduce it without the tool:

```python
import hashlib, json
packages = {"fastapi": "0.162.0", "httpx": "0.28.1", "pydantic": "2.14.2",
            "tieout": "0.3.0", "uvicorn": "0.54.0"}
blob = json.dumps(sorted(packages.items()), sort_keys=True, separators=(",", ":"))
print("sha256:" + hashlib.sha256(blob.encode()).hexdigest())
# sha256:ad5b76bc56823f5743413584bb26f0640a00d8de3681bb2fd0f38b4cf4e1b5fa
```

That is not a summary of the environment; it is a commitment to it. Add a package, bump a version, drop one from the watch-list, and the digest changes. The test suite asserts exactly this equality, so a change to the snapshot logic that silently altered the digest would fail before it shipped.

## The environment string, and what it is for

`"platform": "Linux-6.1.158+-x86_64-with-glibc2.36"` is the output of `platform.platform()`, recorded verbatim rather than parsed into fields. It is ugly and it is the right call: the parsed version would be a schema that has to grow a field every time a kernel naming convention changes, and the string is what a reader would type into a search box when something behaves differently.

`python: 3.11.2` is the interpreter that ran the suite, not the one the site is deployed on. Those are allowed to differ — verification is arithmetic, not execution of the run — and keeping the distinction visible is the difference between a provenance record and a deployment manifest.

---

**Verified against:** the `provenance` blocks in `runs/demo-f2`, `runs/demo-stability/a` and `runs/demo-stability/b` (`packages`, `packages_hash`, `env`, `seed`, `dataset_hash`); `tieout/provenance.py` and its `WATCHED_PACKAGES` snapshot; `runs/demo`, a v1.0 bundle with no `packages` block that still verifies; and the committed `.python-version` and `uv.lock` that pin the deployment the site itself runs on.
