"""Exact Clopper-Pearson intervals and family statistics."""
from tieout.stats import clopper_pearson, family_statistics


def test_empty_sample_is_the_whole_space():
    assert clopper_pearson(0, 0) == (0.0, 1.0)


def test_zero_successes_lower_bound_is_zero():
    lo, hi = clopper_pearson(5, 0)
    assert lo == 0.0
    assert 0.0 < hi < 1.0


def test_all_successes_upper_bound_is_one():
    lo, hi = clopper_pearson(5, 5)
    assert hi == 1.0
    assert 0.0 < lo < 1.0


def test_interval_contains_the_sample_proportion():
    for n, k in [(14, 13), (20, 7), (50, 41), (1, 1), (1, 0)]:
        if 0 < k < n:
            lo, hi = clopper_pearson(n, k)
            assert lo < k / n < hi, (n, k, lo, hi)


def test_known_value_0_of_10():
    """Documented reference: binom.test(0, 10) -> [0, 0.3085]."""
    lo, hi = clopper_pearson(10, 0)
    assert lo == 0.0
    assert abs(hi - 0.3085) < 0.001, hi


def test_known_value_13_of_14():
    lo, hi = clopper_pearson(14, 13)
    assert abs(lo - 0.6613) < 0.001, lo
    assert abs(hi - 0.9982) < 0.001, hi


def test_symmetry_under_complement():
    """CP(k/n) and CP((n-k)/n) are mirrors about 0.5."""
    lo1, hi1 = clopper_pearson(14, 13)
    lo2, hi2 = clopper_pearson(14, 1)
    assert abs(lo1 - (1.0 - hi2)) < 0.001
    assert abs(hi1 - (1.0 - lo2)) < 0.001


def test_wider_samples_narrower_intervals():
    lo_big, hi_big = clopper_pearson(100, 50)
    lo_small, hi_small = clopper_pearson(10, 5)
    assert (hi_big - lo_big) < (hi_small - lo_small)


def test_invalid_arguments_raise():
    import pytest

    with pytest.raises(ValueError):
        clopper_pearson(3, 4)
    with pytest.raises(ValueError):
        clopper_pearson(-1, 0)


def test_family_statistics_counts_and_ci():
    events = (
        [{"check": "T1", "decision": "pass"}] * 3
        + [{"check": "T2", "decision": "pass"}] * 2
        + [{"check": "T2", "decision": "fail"}]
        + [{"check": "T4-R1", "decision": "undetermined"}]
    )
    s = family_statistics("F1", events)
    assert s["n"] == 7
    assert s["pass"] == 5
    assert s["fail"] == 1
    assert s["undetermined"] == 1
    assert s["pass_rate"] == round(5 / 7, 6)
    lo, hi = s["ci95"]
    assert lo < 5 / 7 < hi
    checks = {c["check"]: c for c in s["checks"]}
    assert checks["T1"]["n"] == 3
    assert checks["T2"]["fail"] == 1
    assert checks["T4"]["undetermined"] == 1  # grouped by top-level check
    assert sum(c["n"] for c in s["checks"]) == s["n"]


def test_family_statistics_empty():
    s = family_statistics("F1", [])
    assert s["n"] == 0
    assert s["ci95"] == [0.0, 1.0]
