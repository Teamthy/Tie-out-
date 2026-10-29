
from fastapi.testclient import TestClient

from tieout.harness import get_family
from tieout.harness.agents import SampleOrderBot
from tieout.harness.runner import run_suite
from tieout.server import create_app


def make_client(tmp_path):
    runs = tmp_path / "runs"
    run_suite(get_family("F1"), SampleOrderBot(), out_dir=runs / "demo")
    return TestClient(create_app(runs))


def test_health(tmp_path):
    c = make_client(tmp_path)
    r = c.get("/api/health")
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_runs_list_and_detail(tmp_path):
    c = make_client(tmp_path)
    runs = c.get("/api/runs").json()
    assert len(runs) == 1
    assert runs[0]["events"] == 14
    assert runs[0]["verdicts"]["pass"] == 13
    assert runs[0]["verdicts"]["fail"] == 1
    assert runs[0]["bundle_format"] == "tieout-bundle/v1.1"
    assert runs[0]["statistics"][0]["n"] == 14
    assert runs[0]["statistics"][0]["ci95"][0] < runs[0]["statistics"][0]["ci95"][1]

    detail = c.get("/api/runs/demo").json()
    assert detail["manifest"]["bundle_format"] == "tieout-bundle/v1.1"
    assert detail["manifest"]["provenance"]["packages"]
    assert len(detail["events"]) == 14
    assert len(detail["controls"]) == 8
    assert detail["judge_audit"]["anchors_total"] >= 12
    assert detail["gaps"] == []


def test_verify_endpoint(tmp_path):
    c = make_client(tmp_path)
    r = c.post("/api/runs/demo/verify")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["verdict"] == "PASS"
    assert any(line.startswith("VERDICT: PASS") for line in body["lines"])


def test_families_and_asi(tmp_path):
    c = make_client(tmp_path)
    fams = c.get("/api/families").json()
    assert [f["family_id"] for f in fams] == ["F1", "F2"]
    assert fams[0]["items"] == 14
    assert fams[0]["controls"] == 8
    assert len(fams[0]["items_detail"]) == 14
    assert fams[0]["items_detail"][0]["id"] == "F1-T1-1a"
    assert fams[1]["items"] == 8
    assert {row["asi"] for row in asi_rows(c)} == {"ASI01", "ASI02", "ASI03", "ASI06", "ASI09", "ASI10"}


def asi_rows(c):
    return c.get("/api/asi").json()["crosswalk"]


def test_diff_endpoint(tmp_path):
    runs = tmp_path / "runs"
    run_suite(get_family("F1"), SampleOrderBot(seed=0), out_dir=runs / "seed0", seed=0)
    run_suite(get_family("F1"), SampleOrderBot(seed=7), out_dir=runs / "seed7", seed=7)
    c = TestClient(create_app(runs))

    r = c.get("/api/diff", params={"a": "seed0", "b": "seed7"})
    assert r.status_code == 200
    d = r.json()
    assert d["aligned"] == 14
    assert d["verdict_flips"] == 0
    assert d["stability"] == 1.0
    assert d["transcript_drift"] > 0

    # different families are refused
    run_suite(get_family("F2"), SampleOrderBot(), out_dir=runs / "f2")
    r2 = c.get("/api/diff", params={"a": "seed0", "b": "f2"})
    assert r2.status_code == 400

    r3 = c.get("/api/diff", params={"a": "seed0", "b": "nope"})
    assert r3.status_code == 404


def test_docs_endpoint(tmp_path):
    c = make_client(tmp_path)
    r = c.get("/api/docs")
    assert r.status_code == 200
    docs = r.json()
    assert set(docs) == {"method", "format", "matrix", "harness"}
    assert docs["method"].startswith("# Method note")
    assert "re-derivation" in docs["format"].lower()
    assert docs["matrix"].startswith("# Failure-mode matrix")
    assert "T0" in docs["matrix"]
    assert docs["harness"].startswith("# Harness spec")
