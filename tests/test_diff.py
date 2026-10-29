"""Cross-run stability diff: alignment, flips, drift, errors."""
import json

import pytest

from tieout.diff import DiffError, diff_bundles
from tieout.harness import get_family
from tieout.harness.agents import SampleOrderBot
from tieout.harness.runner import run_suite
from tieout.hashing import canonical


def _pair(tmp_path):
    run_suite(get_family("F1"), SampleOrderBot(seed=0), out_dir=tmp_path / "a", seed=0)
    run_suite(get_family("F1"), SampleOrderBot(seed=7), out_dir=tmp_path / "b", seed=7)
    return tmp_path / "a", tmp_path / "b"


def test_deterministic_runs_align_with_zero_verdict_drift(tmp_path):
    a, b = _pair(tmp_path)
    d = diff_bundles(a, b)
    assert d["aligned"] == 14
    assert d["verdict_flips"] == 0
    assert d["stability"] == 1.0
    assert d["transcript_drift"] > 0  # the words moved, the verdicts did not
    assert d["only_in_a"] == [] and d["only_in_b"] == []
    assert d["rate_a"]["pass"] == 13 and d["rate_b"]["pass"] == 13
    for row in d["rows"]:
        assert row["decision_a"] == row["decision_b"]
        assert not row["flipped"]


def test_tampered_decision_is_reported_as_a_flip(tmp_path):
    a, b = _pair(tmp_path)
    lines = (b / "bundle.jsonl").read_text(encoding="utf-8").splitlines()
    idx = next(i for i, ln in enumerate(lines) if json.loads(ln).get("type") == "event")
    ev = json.loads(lines[idx])
    ev["decision"] = "fail" if ev["decision"] == "pass" else "pass"
    lines[idx] = canonical(ev)
    (b / "bundle.jsonl").write_text("\n".join(lines) + "\n", encoding="utf-8")

    d = diff_bundles(a, b)
    assert d["verdict_flips"] == 1
    assert d["stability"] == round(13 / 14, 6)
    flipped = [r for r in d["rows"] if r["flipped"]]
    assert len(flipped) == 1
    assert flipped[0]["item_id"] == ev["item_id"]


def test_dropped_item_is_nameable(tmp_path):
    a, b = _pair(tmp_path)
    lines = (b / "bundle.jsonl").read_text(encoding="utf-8").splitlines()
    idx = next(i for i, ln in enumerate(lines) if json.loads(ln).get("type") == "event")
    dropped_id = json.loads(lines[idx])["item_id"]
    del lines[idx]
    (b / "bundle.jsonl").write_text("\n".join(lines) + "\n", encoding="utf-8")

    d = diff_bundles(a, b)
    assert d["aligned"] == 13
    assert d["only_in_a"] == [dropped_id]
    assert d["only_in_b"] == []


def test_different_families_are_refused(tmp_path):
    run_suite(get_family("F1"), SampleOrderBot(), out_dir=tmp_path / "f1")
    run_suite(get_family("F2"), SampleOrderBot(), out_dir=tmp_path / "f2")
    with pytest.raises(DiffError):
        diff_bundles(tmp_path / "f1", tmp_path / "f2")


def test_missing_bundle_is_refused(tmp_path):
    a, _ = _pair(tmp_path)
    with pytest.raises(DiffError):
        diff_bundles(a, tmp_path / "nope")
