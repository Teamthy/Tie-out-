import json

from tieout.bundle.verify import verify_bundle
from tieout.harness import get_family
from tieout.harness.agents import SampleOrderBot
from tieout.harness.runner import run_suite
from tieout.hashing import canonical


def make_run(tmp_path, name="run"):
    family = get_family("F1")
    result = run_suite(family, SampleOrderBot(), out_dir=tmp_path / name)
    return family, result


def test_clean_bundle_verifies(tmp_path):
    family, _ = make_run(tmp_path)
    res = verify_bundle(tmp_path / "run", family=family)
    assert res.ok
    assert res.verdict == "PASS"
    assert res.gaps == []


def test_one_character_tamper_detected(tmp_path):
    family, _ = make_run(tmp_path)
    t = tmp_path / "tampered"
    import shutil

    shutil.copytree(tmp_path / "run", t)
    lines = (t / "bundle.jsonl").read_text(encoding="utf-8").splitlines()
    ev_idx = next(i for i, ln in enumerate(lines) if json.loads(ln).get("type") == "event")
    ev = json.loads(lines[ev_idx])
    ev["raw_output"] = ev["raw_output"] + "x"
    lines[ev_idx] = canonical(ev)
    (t / "bundle.jsonl").write_text("\n".join(lines) + "\n", encoding="utf-8")
    res = verify_bundle(t, family=family)
    assert not res.ok
    assert any(g.code == "G-HASH" for g in res.gaps)


def test_dropped_line_is_named_gap_and_manifest_break(tmp_path):
    family, _ = make_run(tmp_path)
    d = tmp_path / "dropped"
    import shutil

    shutil.copytree(tmp_path / "run", d)
    lines = (d / "bundle.jsonl").read_text(encoding="utf-8").splitlines()
    ev_idx = next(i for i, ln in enumerate(lines) if json.loads(ln).get("type") == "event")
    dropped_id = json.loads(lines[ev_idx])["item_id"]
    del lines[ev_idx]
    (d / "bundle.jsonl").write_text("\n".join(lines) + "\n", encoding="utf-8")
    res = verify_bundle(d, family=family)
    assert not res.ok
    assert any(g.code == "G-MISSING" and dropped_id in g.scope for g in res.gaps)
    assert any(g.code == "G-MISSING" and "event_count" in g.scope for g in res.gaps)
    assert any(g.code == "G-HASH" for g in res.gaps)  # chain link + tail


def test_verdict_tamper_detected(tmp_path):
    family, _ = make_run(tmp_path)
    d = tmp_path / "verdict"
    import shutil

    shutil.copytree(tmp_path / "run", d)
    lines = (d / "bundle.jsonl").read_text(encoding="utf-8").splitlines()
    # flip the stored decision of the designed-break event WITHOUT fixing the hash
    for i, ln in enumerate(lines):
        rec = json.loads(ln)
        if rec.get("type") == "event" and rec.get("item_id") == "F1-T4-R1-mixed":
            rec["decision"] = "pass"
            lines[i] = canonical(rec)
            break
    (d / "bundle.jsonl").write_text("\n".join(lines) + "\n", encoding="utf-8")
    res = verify_bundle(d, family=family)
    assert not res.ok
    assert any(g.code == "G-HASH" for g in res.gaps)


def test_metrics_contract(tmp_path):
    family, result = make_run(tmp_path)
    m = {r["check"]: r for r in result.metrics(family)}
    assert (m["T1"]["fired"], m["T1"]["total"]) == (0, 3)
    assert (m["T2"]["fired"], m["T2"]["total"]) == (0, 3)
    assert (m["T3"]["fired"], m["T3"]["total"]) == (0, 2)
    assert (m["T4"]["fired"], m["T4"]["total"]) == (1, 6)
    assert result.manifest["controls_fp"] == 0
    assert result.manifest["controls_fn"] == 0


def test_judge_audit_numbers(tmp_path):
    _family, result = make_run(tmp_path)
    audit = result.audit
    assert audit["anchors_total"] >= 12
    assert audit["anchors_agreement"] == 1.0
    assert set(audit["perturbation_flips"]) == {"reformat", "paraphrase", "verbosity"}
    assert audit["self_preference_clean"] is True
    assert 0.0 <= audit["disagreement_rate"] <= 1.0
