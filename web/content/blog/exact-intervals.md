Thirteen successes in fourteen trials is 92.86%. That sentence is arithmetically true and statistically useless, because the useful question is not what the sample did but what it licenses you to say about the thing you sampled, and at n = 14 the answer is: much less than the percentage suggests.

The committed bundles store the interval, not just the point estimate. This piece is about why it is computed the way it is, what the numbers look like, and where the whole construction stops being valid.

## The problem with the obvious interval

The textbook Wald interval is the point estimate plus or minus 1.96 standard errors:

```
p_hat ± 1.96 * sqrt(p_hat * (1 - p_hat) / n)
```

For 13 of 14, p_hat = 0.928571 and the standard error is sqrt(0.928571 * 0.071429 / 14) = 0.06883. The interval comes out as 0.928571 ± 0.13491, that is [0.79366, 1.06348].

The upper bound is greater than one. A proportion cannot exceed one, so the number has to be clipped to 1.0, and the clipping is not harmless: it hides how little evidence the sample provides about the region near certainty. The Wald interval also collapses at the boundaries (at zero successes its width is zero, which is obviously wrong) and its coverage is poor exactly when n is small and p is near 0 or 1, which is the normal situation in evaluation.

## The exact interval

The Clopper-Pearson interval inverts the binomial test directly. The lower bound is the p for which the observed count is at the upper tail of the binomial distribution, and the upper bound is the p for which it is at the lower tail; both are found by solving tail equations, not by approximating a normal.

tieout's implementation is fifteen lines of bisection on the exact binomial CDF, with the pmf computed from `math.comb`. No scipy, no external statistics dependency, no floating-point approximation of the distribution itself. The tolerance on the bisection is 1e-12.

The results, computed by the shipped code:

| successes / n | point estimate | exact 95% interval |
|---------------|----------------|--------------------|
| 13 / 14 | 0.928571 | [0.661316, 0.998193] |
| 4 / 8 | 0.5 | [0.157013, 0.842987] |
| 27 / 30 | 0.9 | [0.734712, 0.978883] |
| 0 / 10 | 0.0 | [0.0, 0.308497] |
| 10 / 10 | 1.0 | [0.691503, 1.0] |
| 0 / 0 | undefined | [0.0, 1.0] |

Look at the first row against the Wald answer. The exact lower bound is 0.661, thirteen points lower than the clipped 0.794. The exact upper bound is 0.998, not 1.0, because fourteen trials cannot establish certainty. The interval is wide, asymmetric, and honest, and the point estimate sits inside it rather than at its centre.

## Why the asymmetry is the point

For a proportion near 1 the exact interval has a long left tail and a short right one. 13/14 is compatible with a true rate of 0.66, and that is not a quirk of the method, it is what fourteen observations can distinguish. Anyone who has shipped a check on twelve items and reported 92% has reported the centre of an interval that starts at two thirds.

The complement behaves symmetrically, and there is a test for it: the interval for 13/14 mirrors the interval for 1/14 about 0.5. If those two do not mirror, the implementation has a bug, and the test suite asserts the mirroring to within a thousandth.

## Reference values, checked against something outside the repository

Self-consistency is not enough for a statistics implementation. Two of the tests are pinned to documented external values:

- 0 successes in 10 trials gives [0, 0.3085], matching R's `binom.test(0, 10)`, the standard Clopper-Pearson reference case.
- 13 successes in 14 trials gives 0.6613 to 0.9982 to four decimal places, matching the published exact interval for that cell.

The remaining tests are structural: the interval always contains the sample proportion (for 0 < k < n), wider samples give narrower intervals, zero successes have a lower bound of exactly 0.0, all successes have an upper bound of exactly 1.0, an empty sample covers the whole space, and invalid arguments raise instead of returning a plausible number.

## Where the intervals live, and what a reader should do with them

Every F1/F2 manifest written at 0.3.0 carries a `statistics` array with one entry per family: `n`, `pass`, `fail`, `undetermined`, `pass_rate`, `ci95`, and the per-check breakdown. For the stability pair that is `n 14, pass 13, fail 1, pass_rate 0.928571, ci95 [0.661316, 0.998193]`; for the F2 matrix it is `n 8, pass 4, pass_rate 0.5, ci95 [0.157013, 0.842987]`.

A reader should use them the way the format intends. Read the interval first, the point estimate second. Compare two runs by comparing intervals, not percentages: two runs at 13/14 and 12/14 have point estimates three points apart and intervals that overlap almost completely, and treating the difference as signal is how eval tables become fiction.

The bundles written before 0.3.0 have `statistics: null`, because the field is additive and v1.1 readers must accept v1.0 bundles. `runs/demo` is exactly that case: a v1.0 bundle, still verifying, with no stored interval. Recomputing its interval is one call, `clopper_pearson(14, 13)`, and the honest way to read the old bundle is to notice the number is missing rather than to assume it agrees.

## The assumptions, stated plainly

Clopper-Pearson assumes the fourteen items are independent Bernoulli trials with a common probability. In an eval, that is a modelling assumption, not a fact. Items within a check family share prompts and detectors; a detector sensitive to one phrasing will be sensitive to the same phrasing in another item. The interval is therefore a statement about the sampling variability of this specific item set, not about the population of all possible attacks, which is not a random sample and has no defined size.

The rule for undetermined verdicts in this harness is a decision, not a theorem: an undetermined verdict counts against the pass rate. A check that could not decide is not a hold, and treating it as one would let an unparseable output improve the score. The interval is wider when there are undetermined items, which is the behaviour you want from a number that is supposed to express ignorance.

## Reproduce it

```
pip install -e .
python - <<'PY'
from tieout.stats import clopper_pearson
for n, k in [(14, 13), (8, 4), (30, 27), (10, 0), (10, 10), (0, 0)]:
    print(n, k, clopper_pearson(n, k))
PY
pytest tests/test_stats.py -q
```

The function is pure, the tests are pinned to external reference values, and the numbers in this article are the ones the code prints. If your run disagrees, the interval in the manifest is the one that belongs to the bundle, and this article is the thing that is wrong.
