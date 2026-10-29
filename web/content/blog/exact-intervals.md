Thirteen of fourteen is 0.9286. Most eval reports stop there, or append a Wilson interval, and call it rigor.

At n = 14 the normal approximation those intervals lean on is not just rough, it is the wrong tool. The exact answer for a binomial proportion is the Clopper-Pearson interval, and this harness computes it in the code, from `math.comb`, before the bundle closes.

For 13 of 14 the exact 95% interval is:

```text
[0.661316, 0.998193]
```

Read the lower bound. Thirteen of fourteen is not "93 percent, give or take a little". It is consistent with a true pass rate as low as 66%. That is not pessimism. It is what fourteen observations support.

## The two equations

Clopper-Pearson inverts two binomial tails. The lower endpoint `L` solves

```text
P(X >= k | n, p = L) = alpha / 2
```

and the upper endpoint `U` solves

```text
P(X <= k | n, p = U) = alpha / 2
```

with `alpha = 0.05`. Both tails are monotone in `p`, so each endpoint is the root of a monotone function on [0, 1] — which is exactly the case bisection handles without approximation, and without a statistics dependency.

```python
def _binom_cdf_le(n, x, p):
    """P(X <= x) for X ~ Bin(n, p), exact sum."""
    if x < 0: return 0.0
    if x >= n: return 1.0
    return sum(_binom_pmf(n, i, p) for i in range(x + 1))
```

`_binom_pmf` is `math.comb(n, k) * p**k * (1-p)**(n-k)`, with the edge cases at `p <= 0` and `p >= 1` returned exactly rather than computed. `math.comb` is integer arithmetic; the only floating point is in the two powers and the sum. Bisection runs to a tolerance of `1e-12` or 200 iterations, and the result is rounded to six decimals before it is stored. No scipy. No sampling. No approximation.

## Reference values, from outside the repository

The implementation is pinned to values computed elsewhere. `0 of 10` matches `binom.test(0, 10)` in R, and the rest are checked for internal consistency:

| k / n | point estimate | exact 95% interval |
|---|---|---|
| 14 / 14 | 1.0000 | [0.768364, 1.000000] |
| 13 / 14 | 0.9286 | [0.661316, 0.998193] |
| 11 / 14 | 0.7857 | [0.492024, 0.953421] |
| 8 / 8 | 1.0000 | [0.630583, 1.000000] |
| 4 / 8 | 0.5000 | [0.157013, 0.842987] |
| 0 / 10 | 0.0000 | [0.000000, 0.308497] |
| 27 / 30 | 0.9000 | [0.734712, 0.978883] |
| 93 / 100 | 0.9300 | [0.861080, 0.971395] |
| 0 / 0 | — | [0.000000, 1.000000] |

The test suite pins the two headline rows — `13/14` to four places and `0/10` to the R value — and adds three structural checks: symmetric under complement, narrower for larger n at the same rate, and always containing the point estimate. Two invalid inputs, `clopper_pearson(3, 4)` and `clopper_pearson(-1, 0)`, raise rather than returning a plausible number.

## Why the interval is asymmetric, and why that is the point

At 13 of 14 the interval is [0.661, 0.998], not something centred on 0.9286. At 14 of 14 it is [0.768, 1.000]; at 0 of 14 it is [0, 0.232]. The interval gets lopsided as the count approaches a boundary, because a binomial cannot overshoot 1.0 and the upper tail has nowhere to go.

That asymmetry is information. A run with 14 of 14 passing has a lower bound at 0.77, which is a much weaker statement than "100%". A run with 13 of 14 has a lower bound at 0.66. Neither says the agent is good; both say what fourteen items can support, and the bound that matters is the one a decision would rest on.

Normal-approximation intervals hide this. At the extremes they can even produce bounds outside [0, 1], which is the arithmetic telling you the method is out of its depth.

## Where the interval lives, and what it is attached to

The interval is computed before the bundle closes and stored in the manifest, next to the counts it describes:

```json
"statistics": [{
  "family": "F1", "n": 14, "pass": 13, "fail": 1, "undetermined": 0,
  "pass_rate": 0.928571,
  "ci95": [0.661316, 0.998193],
  "checks": [{"check": "T4", "n": 6, "pass": 5, "fail": 1, "undetermined": 0}]
}]
```

Three consumers read the same field: the site renders it beside the pass rate, the diff recomputes each run's rate and interval from the events for its comparison table, and a stranger recomputing from the raw events gets the same numbers from the same integer arithmetic. Because the stored interval is written before the bundle is hashed, a later disagreement about it is a disagreement about a line in a chained file — which is a much better argument to have than one about a chart.

The 4-of-8 family carries `[0.157013, 0.842987]`. The site shows that width next to the 0.5, because an interval that wide is a statement about the family: this is a direction, not a measurement.

## One semantic decision: undetermined counts against the rate

There is a choice hidden in one line of code:

```python
n = len(events)
lo, hi = clopper_pearson(n, counts["pass"])
```

The denominator is every item in the run, including any the harness could not decide. An `undetermined` verdict is not a hold: the target errored, or the judge had no rule, and the gap record says which. Counting it as a pass would inflate the rate and narrow the interval at the same time — a more confident number built from less evidence, which is the worst combination available.

Because undetermined items stay in the denominator, they widen the interval, and the record says "less is known here" without needing a sentence. The sentence exists anyway, in the gap record.

## What this changes about small evals

Small evals are where agent evaluation actually happens. Suites are expensive, families grow one check at a time, and eight items is normal rather than pathological.

At that size the honest report has three parts, in this order: the count, the point estimate, the exact interval. If the interval is too wide to act on, the next step is more items, not a different interval. Swapping Clopper-Pearson for Wilson does not create information; it moves the lower bound up in a way that flatters a small sample, which is precisely the failure mode the exact interval exists to prevent.

Two practical consequences show up in this repository's own writing:

- **Four of eight is a direction.** The F2 bundle says so in the same JSON block that reports the 0.5.
- **Thirteen of fourteen is not a grade.** It is a rate with a floor at two thirds, which is why every article here quotes the interval whenever it quotes the rate.

## Reproduce it

```bash
python -c "from tieout.stats import clopper_pearson; print(clopper_pearson(14, 13))"
# (0.661316, 0.998193)
python -m pytest tests/test_stats.py -q
```

About sixty lines of Python, one dependency — the standard library — and a number that does not improve because someone wanted it to.

## Why the normal approximation fails here

At 13 of 14 the point estimate is 0.9286 and the standard error is 0.0688. The textbook normal interval is 0.9286 ± 1.96 × 0.0688:

```text
[0.7937, 1.0635]
```

The upper bound is greater than one. A pass rate cannot exceed one, so the interval is reporting a probability above certainty — the formula is not slightly off, it is outside its own domain. Wilson's interval repairs that particular embarrassment by clipping, but it is still a large-sample approximation applied to fourteen observations, and it moves the lower bound up in a way that flatters the sample.

Clopper-Pearson does not clip, because it never leaves the parameter space. Its endpoints are solutions of the exact binomial tail equations, so the asymmetry at the boundary comes out of the arithmetic rather than being imposed after it.

## The bisection, in full

```python
def _bisect(f, lo, hi, target, monotone, tol=1e-12):
    flo, fhi = f(lo), f(hi)
    if monotone == "decreasing" and flo < target: return hi
    if monotone == "increasing" and fhi < target: return hi
    if monotone == "decreasing" and fhi > target: return lo
    if monotone == "increasing" and flo > target: return lo
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        fmid = f(mid)
        if hi - lo < tol:
            break
        if monotone == "decreasing":
            if fmid > target: lo = mid
            else: hi = mid
        else:
            if fmid < target: lo = mid
            else: hi = mid
    return 0.5 * (lo + hi)
```

The first four lines are the degenerate cases: if the target probability is already outside the range the function attains on [0, 1], the endpoint is a boundary rather than an interior root. Without them, `k = 0` and `k = n` would return values computed by bisecting a function that never crosses the target, and the interval would be quietly wrong at exactly the extremes where small evals live.

The loop is ordinary bisection, 200 iterations at most, stopping when the bracket is narrower than a trillionth. For n = 14 the binomial CDF is a small exact sum, so the whole computation is microseconds.

## Where it gets used

Three places, with the same function:

- **the manifest**, when a v1.1 bundle closes: `family_statistics()` counts pass/fail/undetermined and stores `pass_rate` plus `ci95`;
- **the stability diff**, which computes each side's rate and interval from the events rather than copying the manifest, so the two paths cross-check;
- **the site**, which renders the stored interval next to the rate and never recomputes it in the browser.

The F2 bundle is the clearest example of the third: `4 of 8`, `ci95 [0.157013, 0.842987]`, rendered as a rate with a visible width. A reader who sees only "50%" has been told a fact about eight items that sounds like a fact about the world. A reader who sees the interval has been told which one it is.

---

**Verified against:** `tieout/stats.py` — `clopper_pearson()`, bisection on the exact binomial CDF via `math.comb`, no SciPy; `tests/test_stats.py`, which pins the documented reference `binom.test(0, 10) -> [0, 0.3085]` and the 13/14 upper bound 0.9982; and the `statistics` blocks of `runs/demo-stability/a` (n 14, pass 13, `[0.661316, 0.998193]`) and `runs/demo-f2` (n 8, pass 4, `[0.157013, 0.842987]`).
