export type Discipline =
  | "red teaming"
  | "security"
  | "research engineering"
  | "evaluation"
  | "software engineering";

export const DISCIPLINES: Discipline[] = [
  "red teaming",
  "security",
  "research engineering",
  "evaluation",
  "software engineering",
];

export interface PostMeta {
  slug: string;
  title: string;
  dek: string;
  discipline: Discipline;
  /** reading order, 1..12 */
  order: number;
  /** ISO date; the articles are written against 0.3.0 evidence */
  date: string;
  minutes: number;
  /** the artifacts this piece's numbers were taken from */
  sources: string[];
}

/**
 * The blog's registry. Bodies live in web/content/blog/<slug>.md and are
 * read at build time, so every article is a static page inside the
 * bundle: no API round trip, no CMS, nothing to go down.
 */
export const POSTS: PostMeta[] = [
  {
    slug: "prompt-is-not-a-wall",
    title: "A prompt is not a wall",
    dek: "Five failure checks against an agent, and what the run actually recorded: 13 passes, one failure, eight controls, and a receipt for each.",
    discipline: "red teaming",
    order: 1,
    date: "2026-10-30",
    minutes: 9,
    sources: [
      "runs/demo/bundle.jsonl (committed): manifest, 14 verdict events, 8 negative controls, judge audit",
      "runs/demo/manifest.sha256 (committed): the bundle file hash",
      "tieout verify runs/demo: 22 records, chain intact, 14/14 re-derived",
      "tieout selftest, point 3: T1 0 of 3, T2 0 of 3, T3 0 of 2, T4 1 of 6",
    ],
  },
  {
    slug: "same-suite-twice",
    title: "The same suite, twice",
    dek: "Ten transcripts changed and no verdict did. The stability pair is the record, not the claim: 14 items aligned by id, 0 flips, stability 1.000.",
    discipline: "red teaming",
    order: 2,
    date: "2026-10-30",
    minutes: 8,
    sources: [
      "runs/demo-stability/a/bundle.jsonl, /b/bundle.jsonl (committed), seeds 0 and 7",
      "runs/demo-stability/diff_report.json (committed): aligned 14, verdict_flips 0, transcript_drift 10, stability 1.0",
      "tieout diff runs/demo-stability/a runs/demo-stability/b",
      "tieout selftest, point 8: aligned=14 flips=0 drift=10 stability=1.0",
    ],
  },
  {
    slug: "matrix-executable",
    title: "The failure-mode matrix, executable",
    dek: "Four rows of a research matrix (E, P, R, V) turned into eight runnable items with their own controls. Half of them are supposed to fail.",
    discipline: "red teaming",
    order: 3,
    date: "2026-10-30",
    minutes: 9,
    sources: [
      "runs/demo-f2/bundle.jsonl (committed): 8 events, 8 controls, statistics, packages",
      "docs/failure-mode-matrix.md (the matrix the family executes)",
      "tieout verify runs/demo-f2: 16 records, 8/8 re-derived, 0 FP / 0 FN",
      "GET /api/families (server.py): F2 items, checks and actions",
    ],
  },
  {
    slug: "verify-dont-trust",
    title: "Verify, don't trust",
    dek: "A hash chain a stranger can walk: canonical JSON, a genesis of zeros, a tail pinned in the manifest, and what a one-character edit costs.",
    discipline: "security",
    order: 4,
    date: "2026-10-30",
    minutes: 11,
    sources: [
      "tieout/hashing.py: canonical(), record_hash(), GENESIS",
      "tieout/bundle/verify.py: the five checks and the six gap codes",
      "tieout selftest, points 5 and 6: one-character tamper G-HASH; dropped line G-HASH,G-MISSING",
      "tieout verify runs/demo and runs/demo-f2 (committed output reproduced in CI)",
    ],
  },
  {
    slug: "the-negative-control",
    title: "The negative control",
    dek: "A check that cannot grade itself: eight crafted items per run, four that must fire and four that must not, and FP/FN written into the manifest.",
    discipline: "security",
    order: 5,
    date: "2026-10-30",
    minutes: 8,
    sources: [
      "runs/demo/bundle.jsonl and runs/demo-f2/bundle.jsonl: control records (control_id, kind, expected_fire, fired, record_hash)",
      "manifest fields controls_fp and controls_fn (0 and 0 in both committed runs)",
      "tieout selftest, point 4: negative controls clean (0 FP / 0 FN)",
      "tieout verify: \"controls: 8 re-derived, 0 FP / 0 FN\" for both runs",
    ],
  },
  {
    slug: "auditing-the-judge",
    title: "Auditing the judge",
    dek: "Anchor agreement 1.0, three paraphrase flips, a 0.4167 disagreement rate against the naive tell, and a marker that does not move the verdict.",
    discipline: "research engineering",
    order: 6,
    date: "2026-10-30",
    minutes: 10,
    sources: [
      "tieout/calibration/audit.py: the four audit measures and the perturbation functions",
      "judge_audit records in runs/demo, runs/demo-stability/a and runs/demo-stability/b (anchors 14, agreement 1.0, flips paraphrase 3, disagreement 0.0714)",
      "judge_audit record in runs/demo-f2 (anchors 12, agreement 1.0, flips 0/0/0, disagreement 0.4167)",
      "tieout selftest, point 7: anchors=14 agreement=1.0 flips={'reformat': 0, 'paraphrase': 3, 'verbosity': 0}",
    ],
  },
  {
    slug: "exact-intervals",
    title: "Exact intervals for small evals",
    dek: "Why 13 of 14 is not 93 percent: the Wald interval runs past 1, so the record stores the Clopper-Pearson interval, [0.661316, 0.998193], computed in code.",
    discipline: "research engineering",
    order: 7,
    date: "2026-10-30",
    minutes: 8,
    sources: [
      "tieout/stats.py: clopper_pearson(), bisection on the exact binomial CDF, math.comb, no scipy",
      "tests/test_stats.py: documented reference binom.test(0,10) -> [0, 0.3085]; 13/14 -> 0.6613..0.9982; complement symmetry",
      "manifest statistics: runs/demo-stability/a (n 14, pass 13, pass_rate 0.928571, ci95 [0.661316, 0.998193])",
      "manifest statistics: runs/demo-f2 (n 8, pass 4, pass_rate 0.5, ci95 [0.157013, 0.842987])",
    ],
  },
  {
    slug: "the-empty-layer",
    title: "The empty layer",
    dek: "Attacks are commoditized, scoring is commoditized, taxonomy is standardized. The artifact a stranger can re-derive is the part nobody ships.",
    discipline: "evaluation",
    order: 8,
    date: "2026-10-30",
    minutes: 9,
    sources: [
      "docs/method-note.md: the gap paragraph and the six pillars as doctrine",
      "README.md: the six pillars, all in code",
      "docs/harness-spec.md: the standing named gaps (G-ASI-MAPPING, G-WAL, G-ISSUANCE)",
      "runs/demo and runs/demo-f2: verified artifacts used as the worked examples",
    ],
  },
  {
    slug: "provenance-is-part-of-the-claim",
    title: "Provenance is part of the claim",
    dek: "A verdict is only as good as the environment that emitted it: pinned packages, a hash of the watched set, and an environment snapshot per run.",
    discipline: "evaluation",
    order: 9,
    date: "2026-10-30",
    minutes: 8,
    sources: [
      "provenance blocks in runs/demo-f2, runs/demo-stability/a and /b (packages, packages_hash, env, seed, dataset_hash)",
      "tieout/provenance.py: WATCHED_PACKAGES and package_snapshot()",
      "runs/demo (format v1.0): the same record without the packages block, still verifying",
      ".python-version and uv.lock (committed): the site's own pin",
    ],
  },
  {
    slug: "a-schema-for-verdicts",
    title: "A record schema for verdicts",
    dek: "One line per decision, chained: the event field map, the manifest, the canonicalization invariants, and why v1.1 readers still accept v1.0 bundles.",
    discipline: "software engineering",
    order: 10,
    date: "2026-10-30",
    minutes: 10,
    sources: [
      "docs/bundle-format-v1.md: the published schema",
      "runs/demo/bundle.jsonl (tieout-bundle/v1) and runs/demo-f2/bundle.jsonl (tieout-bundle/v1.1)",
      "tieout/hashing.py: the canonical form and the one-record-one-line rule",
      "tieout/bundle/verify.py: which fields verify actually reads",
    ],
  },
  {
    slug: "exit-codes",
    title: "Exit codes a CI can trust",
    dek: "0, 1, 2 as a contract: verified, failed, could not evaluate. Plus the stability gate that runs on every push, and one command that is not a gate.",
    discipline: "software engineering",
    order: 11,
    date: "2026-10-30",
    minutes: 7,
    sources: [
      "tieout/cli.py: cmd_verify, cmd_selftest, cmd_diff, cmd_gaps, cmd_judge_audit return values",
      ".github/workflows/ci.yml: four verify commands, the selftest, and the stability gate",
      "tests/test_cli.py: the CLI contract as tests",
      "tieout diff runs/demo-stability/a runs/demo-stability/b output (the string the gate greps)",
    ],
  },
  {
    slug: "stateless-by-design",
    title: "Stateless by design",
    dek: "Deploying an evidence site to serverless: two services, a static export, a read-only filesystem, a Python pin the runtime actually has.",
    discipline: "software engineering",
    order: 12,
    date: "2026-10-30",
    minutes: 9,
    sources: [
      "vercel.json (committed): services web and api, the three rewrites",
      "main.py (committed): the ASGI entry the platform imports",
      ".python-version (3.12) and uv.lock (committed): the deploy's environment pin",
      "tieout/server.py: create_app, best-effort verify_report write, {run_id:path} routes",
      "tests/test_deployment.py: the deployment contract as tests",
      "Vercel build log, production deployment of 4b04034: two services, ~30s build",
    ],
  },
];

export function getPost(slug: string): PostMeta | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function postsByDiscipline(d: Discipline): PostMeta[] {
  return POSTS.filter((p) => p.discipline === d).sort((a, b) => a.order - b.order);
}

/** "2026-10-02" -> "02 oct 2026", in UTC, no locale dependency. */
export function formatDate(iso: string): string {
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const [y, m, d] = iso.split("-");
  return `${d} ${months[Number(m) - 1]} ${y}`;
}
