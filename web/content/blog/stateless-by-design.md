This site deploys to Vercel as one project with two services: a static export of the Next.js frontend, and the FastAPI app as a single Python function. The rewrites are three lines in the repository. There are no environment variables, no database, and no queue.

```json
{
  "services": {
    "web": { "root": "web/", "framework": "nextjs" },
    "api": { "root": "./", "framework": "fastapi", "entrypoint": "main:app" }
  },
  "rewrites": [
    { "source": "/api", "destination": { "service": "api" } },
    { "source": "/api/(.*)", "destination": { "service": "api" } },
    { "source": "/(.*)", "destination": { "service": "web" } }
  ]
}
```

Both rewrites for `/api` are there on purpose: the bare path has no trailing segment to match `(.*)`, and a request to `/api/health` is not the same request as `/api`. `tests/test_deployment.py` asserts the whole block, so the config that made the deploy work is itself a test fixture.

## The reason it can be stateless

The site was never meant to own state. The evidence is the bundle, and the bundle is a file in a git repository — versioned, committed, re-derivable. The site is a viewer: it lists runs, renders bundles, runs verify on request, and diffs two runs.

A viewer's state is the repository. That is why there is no database to configure, no migrations to run, no seed script, and nothing to restore after an outage. The deployed function reads `runs/` from the deployed tree, which contains exactly the records that are in git, which is the same set the CI verifies on every push.

## The one stateful habit, handled explicitly

There is exactly one place the app wants to write. By local convention, the verify endpoint drops a `verify_report.json` next to the bundle it just checked, so that `tieout serve` leaves an inspectable trace of the last stranger-verify.

On a serverless function the filesystem is read-only outside `/tmp`, and anything written elsewhere does not survive the request. So the write is best-effort by design:

```python
try:
    (d / "verify_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
except OSError:
    # Read-only bundle (serverless): the report is the response,
    # the file is only a local convenience.
    pass
return report
```

The report is always returned in full in the HTTP response, which is what the UI consumes. The file is a courtesy for the local and container deployments where the runs directory is real.

`tests/test_deployment.py::test_verify_stays_correct_on_readonly_filesystem` simulates the serverless case by monkeypatching `Path.write_text` to raise `PermissionError` for `verify_report.json`, then asserts that the response is still complete — `ok: true`, `verdict: "PASS"`, non-empty lines — and that no file was written. The site does not pretend to persist what the platform does not.

## The entry point, and why it passes a path

`main.py` is four lines of substance:

```python
ROOT = Path(__file__).resolve().parent
app = create_app(ROOT / "runs")
```

The platform installs the app as a wheel into the function's environment, so `__file__` resolves inside the installed package tree rather than at the repository root. Passing `ROOT / "runs"` explicitly means the runs directory resolves against the *deployed* tree, which is where the committed bundles live. A `create_app()` that defaulted to a relative `runs` would resolve against the process working directory and find nothing.

The same module is what `tieout serve` uses, so the function and the local server cannot drift: there is one `create_app`, called twice.

## Dependencies, pinned to what the platform actually ships

The function installs with `uv sync --locked` against a committed `uv.lock`, and the Python version is pinned by `.python-version` — currently `3.12`, the platform's default. That file is not decoration: Vercel's Python runtime offers 3.12, 3.13 and 3.14, and an earlier attempt at this deploy pinned 3.11 and died in dependency installation before running a single line of the app.

Two tests keep that class of bug from returning. `test_python_version_is_supported_by_the_runtime` asserts the pin is in the supported set, and the backend CI job runs `uv lock --check --python 3.11` so the lockfile cannot drift from `pyproject.toml` without failing the build. The deployed environment and the tested environment are allowed to differ in version; they are not allowed to differ in dependency graph.

## Nested run ids, and the one URL bug

Run ids are paths. The committed stability pair lives at `runs/demo-stability/a` and `runs/demo-stability/b`, so the id is `demo-stability/a` — with a slash.

That is fine for the API (`/api/runs/{run_id:path}`) and it was a bug in the static export: a single dynamic route segment percent-encodes the slash, so the page exported as `run/demo-stability%2Fa/` and was unreachable at the URL anyone would type. The fix was a catch-all segment that splits the id into path segments for generation and joins them back for rendering. The nested pages now exist at `/run/demo-stability/a/` and `/run/demo-stability/b/`.

The same path-shaped id is a traversal risk on the server, which is why `_run_dir` resolves the candidate and requires it to stay inside the runs root. `tests/test_server.py::test_run_ids_cannot_escape_the_runs_dir` pins that.

## What serverless costs

The static pages are files. They load with no function involved, at any time, from the edge cache — which is the right hosting model for a site whose content changes when someone commits, not when someone clicks.

The API function cold-starts after idle, which adds a second or two to the first request that arrives after it has been evicted. For a handful of bundles and four pages of docs, that is the entire cost: the evidence does not live on the function, so there is nothing to lose when it sleeps, and nothing to warm before it is useful.

What the design gives up is equally clear. There is no background job to re-verify bundles on a schedule, no persistent store for verify reports across requests, and no place to put a long-running diff. Those are all things this project does not need today, and the architecture is honest about that rather than pretending the function is a server.

## Reproduce it

```bash
uv sync --locked
uvicorn main:app --host 0.0.0.0 --port 8000    # the same app the platform imports
curl -s localhost:8000/api/health
python -m pytest tests/test_deployment.py -q   # the contract, including the read-only case
```

## The build, as it actually ran

The deployment log is the most honest documentation a static site has, so here are the lines that matter from the production build of this site:

```text
Detected Next.js version: 14.2.35
Running "npm run build"
 ✓ Compiled successfully
 ✓ Generating static pages (28/28)
Route (app)                              Size     First Load JS
┌ ○ /                                    …
├ ○ /blog                                 …
├ ● /blog/[slug]                          …
├ ● /run/[...id]                          …
…
Build Completed in /vercel/output [29s]
```

`●` marks a path rendered from `generateStaticParams` — the twelve articles and the four run pages — and `○` marks a static page rendered once. The static export writes an `index.html` per route, which is why the same tree is served without modification by Vercel's edge network and by a two-line Starlette mount in `tieout serve`.

The API service built separately, with its dependencies installed from the lockfile:

```text
Using uv 0.13.5 (x86_64-unknown-linux-gnu)
Installing required dependencies from uv.lock...
Compiling Python bytecode...
```

Both services are declared in one `vercel.json`, and the rewrites decide which one a request reaches. There is no build step that needs a database, a secret, or a pre-warm.

## What the platform adds, and what it does not

Two things about deploying this as services are worth stating, because both are easy to discover the hard way.

**Services are a beta framework.** The project is configured with `framework: "services"`, which is what makes `vercel.json`'s `services` key legal. Its absence is not a warning: the build fails immediately with `MISSING_SERVICES`, which is exactly what happened on the first attempt at this deployment. The config is consequently a test fixture (`test_vercel_json_declares_both_services`) rather than a file nobody reads until it breaks.

**Deployment protection is on by default.** Vercel gates new deployments behind authentication unless the project is configured otherwise, so the production URL returns a login page to a stranger until that setting is changed. That is a platform default rather than a property of this app, and it is worth knowing before concluding that a deploy is broken: a 401-shaped login page and a 500-shaped build failure look similar from a terminal and mean very different things.

Neither of those is architecture. They are the kind of detail that decides whether a deployment is described accurately or merely optimistically, and the tests above exist so the description stays true.

## The line between an app and a viewer

The design constraint that made all of this simple is worth naming: this is a viewer, not a service. It has no accounts, no writes that matter, no per-user state, and no data it did not receive from git.

A viewer can be stateless, served from a cache, rebuilt from a commit, and hosted for free. A service cannot. The evidence model is what makes that choice available: every claim the site makes is a claim about a file, and the file does not need to be online for the claim to be checkable.

---

**Verified against:** `vercel.json` — the two `services` and three `rewrites`; `main.py`, the ASGI entrypoint the platform imports; `.python-version` (3.12) and `uv.lock`, the environment pin; `tieout/server.py` for `create_app`, the best-effort `verify_report` write and the `{run_id:path}` routes; `tests/test_deployment.py`, the deployment contract as tests; the Vercel build record for production deployment `dpl_5XZRShJAeeVyAtktdYPruuv7B5pX` (commit `4b04034`, two services, `building_at` 1793314527763 → `ready` 1793314564368, i.e. 36.6 s); and the record for the site's current production deployment `dpl_ASRTyCT4dh8ERLpow6jEfAmnNyco` (commit `d8a5895`, `building_at` 1793315817533 → `ready` 1793315853208, i.e. 35.7 s).
