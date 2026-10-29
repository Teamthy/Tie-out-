import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run_cli(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-m", "tieout", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=120,
    )


def test_demo_verify_gaps_flow(tmp_path):
    out = tmp_path / "demo"
    r = run_cli("demo", "--out", str(out))
    assert r.returncode == 0, r.stdout + r.stderr
    assert (out / "bundle.jsonl").exists()
    assert (out / "manifest.sha256").exists()

    v = run_cli("verify", str(out))
    assert v.returncode == 0, v.stdout + v.stderr
    assert "VERDICT: PASS" in v.stdout

    g = run_cli("gaps", str(out))
    assert g.returncode == 0
    assert "no named gaps" in g.stdout

    j = run_cli("judge-audit", str(out))
    assert j.returncode == 0
    assert "anchor agreement" in j.stdout

    # tamper -> verify must fail
    lines = (out / "bundle.jsonl").read_text(encoding="utf-8").splitlines()
    ev_idx = next(i for i, ln in enumerate(lines) if json.loads(ln).get("type") == "event")
    ev = json.loads(lines[ev_idx])
    ev["raw_output"] += "x"
    from tieout.hashing import canonical

    lines[ev_idx] = canonical(ev)
    (out / "bundle.jsonl").write_text("\n".join(lines) + "\n", encoding="utf-8")
    v2 = run_cli("verify", str(out))
    assert v2.returncode == 1
    assert "G-HASH" in v2.stdout


def test_selftest_command():
    r = run_cli("selftest")
    assert r.returncode == 0, r.stdout + r.stderr
    assert "SELFTEST PASS (8/8)" in r.stdout


def test_f2_run_and_diff_flow(tmp_path):
    out_f2 = tmp_path / "f2"
    r = run_cli("run", "--agent", "sample", "--suite", "F2", "--out", str(out_f2))
    assert r.returncode == 0, r.stdout + r.stderr
    assert "1 of 2" in r.stdout  # each check: one designed break, one hold

    a = tmp_path / "a"
    b = tmp_path / "b"
    run_cli("run", "--agent", "sample", "--suite", "F1", "--out", str(a), "--seed", "0")
    run_cli("run", "--agent", "sample", "--suite", "F1", "--out", str(b), "--seed", "7")

    d = run_cli("diff", str(a), str(b))
    assert d.returncode == 0, d.stdout + d.stderr
    assert "stability 1.000" in d.stdout
    assert "14/14" in d.stdout

    dj = run_cli("diff", str(a), str(b), "--json")
    assert dj.returncode == 0
    body = json.loads(dj.stdout)
    assert body["stability"] == 1.0
    assert body["verdict_flips"] == 0

    # different families -> exit 2
    bad = run_cli("diff", str(out_f2), str(a))
    assert bad.returncode == 2
