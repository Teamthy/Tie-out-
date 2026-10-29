"""Family F2: the failure-mode matrix, executable.

The sample fixture makes the designed break on every -broken item and
the documented hold on every -hold item; the controls are clean; the
bundle re-derives; the judge audit is honest.
"""
from tieout.bundle.verify import verify_bundle
from tieout.harness import get_family
from tieout.harness.agents import SampleOrderBot
from tieout.harness.runner import run_suite


def _run(tmp_path):
    family = get_family("F2")
    return family, run_suite(family, SampleOrderBot(), out_dir=tmp_path / "f2")


def test_family_shape(tmp_path):
    family, _ = _run(tmp_path)
    assert family.family_id == "F2"
    assert len(family.items) == 8
    assert len(family.controls) == 8
    checks = {i.check for i in family.items}
    assert checks == {"E", "P", "R", "V"}


def test_sample_behaves_as_documented(tmp_path):
    _, result = _run(tmp_path)
    by_id = {e["item_id"]: e["decision"] for e in result.events}
    for sid in ("E1", "P1", "R1", "V1"):
        assert by_id[f"F2-{sid}-broken"] == "fail"
        assert by_id[f"F2-{sid}-hold"] == "pass"


def test_metric_is_non_degenerate(tmp_path):
    _, result = _run(tmp_path)
    rows = {r["check"]: r for r in result.metrics(get_family("F2"))}
    for key in ("E", "P", "R", "V"):
        assert rows[key]["total"] == 2
        assert rows[key]["fired"] == 1
        assert rows[key]["undetermined"] == 0


def test_controls_clean_and_bundle_verifies(tmp_path):
    family, result = _run(tmp_path)
    assert result.manifest["controls_fp"] == 0
    assert result.manifest["controls_fn"] == 0
    v = verify_bundle(result.out_dir, family=family)
    assert v.ok, v.lines
    assert not v.gaps


def test_judge_audit_is_honest(tmp_path):
    _, result = _run(tmp_path)
    a = result.audit
    assert a["anchors_agreement"] == 1.0
    assert a["anchors_total"] == 12  # 8 controls + 4 crafted extras
    assert a["self_preference_clean"] is True
    assert a["perturbation_flips"] == {"reformat": 0, "paraphrase": 0, "verbosity": 0}
    # the one-tell judge must disagree somewhere, or it is not a probe
    assert 0.0 < a["disagreement_rate"] < 1.0
