An evidence site has an unusual deployment requirement: it must not become a second source of truth. If the page that shows a verdict can drift from the bundle that contains it, the site has quietly become a claim of its own. The way to avoid that is to make every page a build artifact of the committed files, and to keep the number of things that happen at request time as close to zero as the product allows.

This is how this site is deployed, what broke on the first attempt, and which serverless properties had to be designed around rather than discovered.

## Two services, one project

The deployment is a single Vercel project with two services declared in `vercel.json`:

| service | root | framework | what it is |
|---------|------|-----------|------------|
| web | web/ | nextjs | the UI, a Next.js static export |
| api | ./ | fastapi | the JSON API, entrypoint main:app |

Three rewrites route the traffic: `/api` and `/api/(.*)` go to the api service, everything else goes to web. The platform's build config for the deployment lists both services with the right builders: `@vercel/next` for web, `@vercel/python` with `handlerFunction: app` for api.

`main.py` is the ASGI entry the platform imports. It is four lines of real code:

```
ROOT = Path(__file__).resolve().parent
app = create_app(ROOT / "runs")
```

The same `create_app` that `tieout serve` runs locally, pointed at the same committed runs directory. There is no second application, no deployment-only fork, and no environment variable that changes what the API does. The deployed API and the local API are the same object.

## The site is a build artifact

The UI uses `output: "export"`, so `next build` writes plain HTML to `web/out`. Every page is prerendered at build time, twenty-five of them:

- the landing page, runs index, compare, families, and the four spec pages (method, format, matrix, harness)
- one page per committed run, four of them, including the nested `demo-stability/a` and `demo-stability/b`
- the blog index and twelve articles

`trailingSlash: true` is the quiet hero of that list. Each route becomes a directory with an `index.html`, which means the export is served identically by Vercel's static layer and by Starlette's `StaticFiles(directory=..., html=True)` in `tieout serve`. No rewrite rules, no trailing-slash redirects, no difference between production and localhost. That matters more than it sounds: the site has two hosts, and a routing difference between them is the kind of bug that only appears in production.

The article bodies are markdown files under `web/content/blog/`, read with `fs` during the build and rendered to HTML by the same component that renders the specs. Nothing about a blog post is dynamic: no API call, no client fetch, no CMS. The text you are reading is inside the JS/HTML bundle that was built from the commit that contains the claims in it.

## The only dynamic call on the site

One button calls the API: verify on a run page. It POSTs to `/api/runs/{id}/verify`, and the server re-walks the chain and re-derives every verdict from the stored raws.

That endpoint is stateless by construction. It needs the bundle directory, the family declaration, and nothing else: no database, no cache, no session. The work is bounded by the bundle size (a few dozen records), so a cold start costs one container boot and one file read.

It is also the endpoint that taught me about the filesystem.

## Read-only means read-only

The local `verify` command writes a `verify_report.json` next to the bundle, which is convenient when you are iterating on a checkout. On a serverless host the bundle directory is a read-only build artifact, and that write raises.

The first version of the endpoint would have returned a 500 on a successful verification, which is the worst possible failure mode: the evidence is fine and the tool says otherwise. The fix is three lines in `tieout/server.py`, and the important part is the comment:

```
try:
    (d / "verify_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
except OSError:
    # Read-only bundle (serverless): the report is the response,
    # the file is only a local convenience. Never fail the verify
    # because the host cannot persist it.
    pass
```

The report is the HTTP response. The file is a convenience for the local case. Two tests hold the line: one asserts the file is written when the directory is writable, and one monkeypatches `Path.write_text` to raise `PermissionError` for that filename and asserts the endpoint still returns 200 with a complete report. The second test is the serverless contract, expressed as a failing write rather than as a comment.

## Run ids are paths, and that is a routing decision

Committed evidence is nested: `runs/demo-stability/a` and `runs/demo-stability/b` are two bundles under one directory. A run id is therefore a path, and the API routes have to accept the slash inside the id rather than treat it as a segment separator:

```
@app.get("/api/runs/{run_id:path}")
@app.post("/api/runs/{run_id:path}/verify")
```

FastAPI's default converter would 404 on `demo-stability/a`. The `:path` converter accepts it, and the resolver then does the security-relevant part: it resolves the path and refuses anything outside the runs directory, so an encoded `..` cannot walk out of the bundle tree. There is a test for that too, with two traversal attempts, both 404.

On the static side the same ids become the page paths, which is why `/run/demo-stability/a/` exists as a real directory in the export rather than as a client-side route.

## The Python pin, and the build that failed twice

The first production failure had nothing to do with application code. The project's framework was set to Services, and the repository had no `vercel.json`, so the build stopped before it started with `MISSING_SERVICES`.

The second attempt had the services block and failed later, in the api service: `.python-version` pinned 3.11, and the Python runtime offers 3.12 (default), 3.13 and 3.14. The build log is unambiguous about the cost:

```
Error: [BUILD_FAILED] Failed to run "uv sync --active --no-dev --link-mode hardlink --locked --no-editable"
error: No interpreter found for Python 3.11 in managed installations or search path
```

The fix is one line in `.python-version` (3.12), and it is worth recording because a version pin that the runtime cannot satisfy fails in a place that looks like a dependency problem and is not.

The `--locked` flag in that command is the other half of the story. The platform installs from `uv.lock`, so the lockfile has to be committed and has to match `pyproject.toml`. That is why CI now runs `uv lock --check` on every push: a dependency change that forgets to refresh the lock fails in CI rather than in a deploy.

## What was designed around, not discovered

Four serverless properties, and how each is answered.

Ephemeral filesystem. Nothing the site produces is needed after the request. The verify write is best-effort; nothing else writes at all.

No background execution. There are no cron jobs, no queue consumers, no long-running processes. Everything the site shows was computed either at build time (the pages) or inside the request (one verification).

Cold starts. The API imports FastAPI, pydantic and the tieout package, then reads one JSONL file per request. There is no connection pool to warm and no cache to prime, so a cold start is dominated by the interpreter coming up. The build log for the production deployment shows the whole two-service build finishing in about thirty seconds, which is also a useful signal that nothing in the build is doing model work.

One origin. The UI and the API share a host, so `fetch("/api/runs")` is a relative URL. No CORS configuration, no `NEXT_PUBLIC_API_URL`, no environment variable to get wrong per environment. The comparison service called this out from the other direction: an evidence site that needs a proxy environment variable to reach its own API has a deployment that can silently break the evidence path.

## Parity with the local server

`tieout serve` mounts `web/out` at `/` and serves the same API on the same origin, which means the local experience is the deployed experience minus TLS. That symmetry is why the deployment bugs have been about the platform's contract (services, interpreter pin, lockfile) rather than about the application: the application is identical in both places, and the tests exercise the same app object through `TestClient`.

```
tieout serve --port 8000 --runs-dir runs
# and, on the deployed host:
curl -s https://<deployment>/api/health
```

## What this architecture cannot do

It cannot ingest a live run. There is no writable store, so a new bundle means a new commit and a new build. That is a deliberate trade for an evidence site, and it is the wrong trade for an observability product.

It cannot stream a long verification. A run large enough to exceed the function timeout would need a different design; the committed bundles are small, and the limit is a named one rather than a silent one.

It cannot protect the site's content. Deployment protection is a platform setting, not a property of the build; the site's own access model is whatever the host is configured to enforce, and the evidence it renders is public in git regardless.

Those three limits are the boundaries of the design, and they are the reason the deployment is a paragraph rather than a platform.

## Reproduce it

```
npm --prefix web run build        # writes web/out
python -m uvicorn main:app --port 8000
curl -s localhost:8000/api/runs | head -c 120
```

If the build produces twenty-five prerendered pages and the API answers `/api/runs` from the committed bundles, the deployment has nothing left to decide: the platform serves the same two artifacts in the same two slots.
