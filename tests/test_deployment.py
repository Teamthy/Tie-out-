"""Deployment contract (Vercel services and peers).

The repo deploys as-is: a root ASGI entry (`main.py`) serving the same
app as `tieout serve`, and a verify endpoint that stays correct when the
filesystem is ephemeral and read-only.

The deployment itself is two services in one project (see vercel.json):
`web` is the Next.js static export, `api` is this ASGI app, and /api/* is
rewritten to the api service. Everything below runs against `main.app`
exactly as the platform imports it.
"""
import json
from pathlib import Path

from fastapi.testclient import TestClient
from test_server import make_client

COMMITTED = {"demo", "demo-f2", "demo-stability/a", "demo-stability/b"}


def test_vercel_entry_serves_the_app():
    import main

    c = TestClient(main.app)
    assert c.get("/api/health").status_code == 200
    assert c.get("/api/health").json()["ok"] is True

    runs = c.get("/api/runs").json()
    ids = {r["id"] for r in runs}
    # the committed evidence must be readable from the deployed tree,
    # nested run ids included (the compare page needs the stability pair)
    assert COMMITTED <= ids
    assert c.get("/api/docs").status_code == 200
    assert c.get("/api/families").status_code == 200

    by_id = {r["id"]: r for r in runs}
    det = c.get("/api/runs/demo-stability/a")
    assert det.status_code == 200
    assert det.json()["manifest"]["run_id"] == by_id["demo-stability/a"]["run_id"]
    assert len(det.json()["events"]) == by_id["demo-stability/a"]["events"]

    ver = c.post("/api/runs/demo-stability/a/verify")
    assert ver.status_code == 200
    assert ver.json()["ok"] is True

    d = c.get("/api/diff", params={"a": "demo-stability/a", "b": "demo-stability/b"})
    assert d.status_code == 200
    assert d.json()["stability"] == 1.0
    assert d.json()["verdict_flips"] == 0


def test_verify_report_persisted_when_writable(tmp_path):
    c = make_client(tmp_path)
    r = c.post("/api/runs/demo/verify")
    assert r.status_code == 200
    assert (tmp_path / "runs/demo/verify_report.json").exists()


def test_verify_stays_correct_on_readonly_filesystem(tmp_path, monkeypatch):
    """Simulates the serverless bundle: the write fails, the report must
    still be complete in the response (the UI consumes the response)."""
    c = make_client(tmp_path)
    orig = Path.write_text

    def boom(self, *args, **kwargs):
        if self.name == "verify_report.json":
            raise PermissionError("read-only filesystem (simulated serverless)")
        return orig(self, *args, **kwargs)

    monkeypatch.setattr(Path, "write_text", boom)
    r = c.post("/api/runs/demo/verify")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["verdict"] == "PASS"
    assert body["lines"]
    assert not (tmp_path / "runs/demo/verify_report.json").exists()


def test_vercel_json_declares_both_services():
    """The project builds as services only when vercel.json has a
    `services` key; a missing key fails the build with MISSING_SERVICES."""
    cfg = json.loads((Path(__file__).resolve().parent.parent / "vercel.json").read_text())
    assert set(cfg["services"]) == {"web", "api"}
    assert cfg["services"]["web"]["root"] == "web/"
    assert cfg["services"]["api"]["framework"] == "fastapi"
    assert cfg["services"]["api"]["entrypoint"] == "main:app"
    routes = {r["source"]: r["destination"]["service"] for r in cfg["rewrites"]}
    assert routes["/api"] == "api"
    assert routes["/api/(.*)"] == "api"
    assert routes["/(.*)"] == "web"


def test_python_version_is_supported_by_the_runtime():
    """Vercel's Python runtime offers 3.12 (default), 3.13, 3.14. A
    pin outside that set fails the build before dependencies install."""
    root = Path(__file__).resolve().parent.parent
    pinned = (root / ".python-version").read_text().strip()
    assert pinned in {"3.12", "3.13", "3.14"}
