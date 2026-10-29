"""Exact statistics for verdict rates, no external dependencies.

The pass rate of a run is a proportion on a small sample (n = number of
pre-assigned items). At n = 14 the normal approximation is not honest,
so the interval is the exact Clopper-Pearson one: the endpoints are the
solutions of the binomial tail equations, found by bisection on the
binomial CDF computed with math.comb. No approximation, no scipy.

Semantics (documented in docs/method-note.md): undetermined verdicts
count against the pass rate. A verdict the harness could not decide is
not a hold; it is a named gap, and the interval says so by being wider.
"""
from __future__ import annotations

import math


def _binom_pmf(n: int, k: int, p: float) -> float:
    if p <= 0.0:
        return 1.0 if k == 0 else 0.0
    if p >= 1.0:
        return 1.0 if k == n else 0.0
    return math.comb(n, k) * (p**k) * ((1.0 - p) ** (n - k))


def _binom_cdf_le(n: int, x: int, p: float) -> float:
    """P(X <= x) for X ~ Bin(n, p), exact sum."""
    if x < 0:
        return 0.0
    if x >= n:
        return 1.0
    return sum(_binom_pmf(n, i, p) for i in range(x + 1))


def _bisect(f, lo: float, hi: float, target: float, monotone: str, tol: float = 1e-12) -> float:
    """Solve f(p) = target on [lo, hi]; f strictly monotone."""
    flo, fhi = f(lo), f(hi)
    if (monotone == "decreasing" and flo < target) or (monotone == "increasing" and fhi < target):
        return hi
    if (monotone == "decreasing" and fhi > target) or (monotone == "increasing" and flo > target):
        return lo
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        fmid = f(mid)
        if hi - lo < tol:
            break
        if monotone == "decreasing":
            if fmid > target:
                lo = mid
            else:
                hi = mid
        else:
            if fmid < target:
                lo = mid
            else:
                hi = mid
    return 0.5 * (lo + hi)


def clopper_pearson(n: int, k: int, alpha: float = 0.05) -> tuple[float, float]:
    """Exact (1-alpha) confidence interval for a binomial proportion.

    n = trials, k = successes. n = 0 -> (0.0, 1.0): the interval is
    the whole space, which is what an empty sample is worth.
    """
    if n < 0 or k < 0 or k > n:
        raise ValueError(f"invalid binomial: n={n}, k={k}")
    if n == 0:
        return (0.0, 1.0)
    half = alpha / 2.0
    # lower endpoint: P(X >= k; n, p) = alpha/2  (increasing in p)
    if k == 0:
        lo = 0.0
    else:
        lo = _bisect(
            lambda p: 1.0 - _binom_cdf_le(n, k - 1, p),
            0.0,
            1.0,
            half,
            "increasing",
        )
    # upper endpoint: P(X <= k; n, p) = alpha/2  (decreasing in p).
    # Identity: I_p(k+1, n-k) = 1 - alpha/2  <=>  P(X <= k) = alpha/2,
    # which reproduces the standard 0/10 interval [0, 0.3085].
    if k == n:
        hi = 1.0
    else:
        hi = _bisect(
            lambda p: _binom_cdf_le(n, k, p),
            0.0,
            1.0,
            half,
            "decreasing",
        )
    return (round(lo, 6), round(hi, 6))


def family_statistics(family_id: str, events: list[dict]) -> dict:
    """Per-check counts plus the family-level rate and its exact CI."""
    checks: dict[str, dict[str, int]] = {}
    counts = {"pass": 0, "fail": 0, "undetermined": 0}
    for e in events:
        top = e["check"].split("-")[0]
        c = checks.setdefault(top, {"pass": 0, "fail": 0, "undetermined": 0})
        d = e.get("decision", "undetermined")
        if d in c:
            c[d] += 1
        if d in counts:
            counts[d] += 1
    n = len(events)
    lo, hi = clopper_pearson(n, counts["pass"])
    return {
        "family": family_id,
        "n": n,
        "pass": counts["pass"],
        "fail": counts["fail"],
        "undetermined": counts["undetermined"],
        "pass_rate": round(counts["pass"] / n, 6) if n else 0.0,
        "ci95": [lo, hi],
        "checks": [
            {
                "check": key,
                "n": c["pass"] + c["fail"] + c["undetermined"],
                "pass": c["pass"],
                "fail": c["fail"],
                "undetermined": c["undetermined"],
            }
            for key, c in sorted(checks.items())
        ],
    }
