"""tieout CLI.

  tieout demo [--out runs/demo]
  tieout run --agent sample|live --suite f1 [--out DIR]
             [--model M] [--base-url U] [--key K] [--system-prompt-file F]
  tieout verify <run-dir>
  tieout gaps <run-dir>
  tieout judge-audit <run-dir>
  tieout diff RUN_A RUN_B [--json]
  tieout selftest
  tieout serve [--port 8000] [--host 0.0.0.0] [--runs-dir runs]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import __version__
from .harness import get_family
from .harness.agents import LiveAdapter, SampleOrderBot
from .harness.f1_five_checks.prompts import SAMPLE_SYSTEM_PROMPT


def _print_report(result, family) -> None:
    print()
    print("=" * 62)
    print("tieout run: %s" % result.run_id)
    print("agent : %s" % result.manifest["provenance"]["agent"])
    print("suite : %s (policy %s)" % (
        result.manifest["provenance"]["suite"],
        family.policy_version[:24],
    ))
    print("=" * 62)
    print("the metric")
    for row in result.metrics(family):
        print("  %-6s %s" % (row["check"], row["rate"]))
    counts: dict[str, int] = {}
    for e in result.events:
        counts[e["decision"]] = counts.get(e["decision"], 0) + 1
    print(
        "verdicts: %d pass / %d fail / %d undetermined"
        % (
            counts.get("pass", 0),
            counts.get("fail", 0),
            counts.get("undetermined", 0),
        )
    )
    print(
        "controls: %d, %d FP / %d FN"
        % (len(result.controls), result.manifest["controls_fp"], result.manifest["controls_fn"])
    )
    if result.gaps:
        print("named gaps:")
        for g in result.gaps:
            print("  [%s] %s: %s" % (g["code"], g["scope"], g["reason"]))
    else:
        print("named gaps: none")
    print()
    print("bundle : %s" % (result.out_dir / "bundle.jsonl"))
    print("verify : tieout verify %s" % result.out_dir)
    print()
    print("Detectors are heuristics. Read the raw outputs in the bundle and")
    print("confirm each fail with your own eyes before you trust the metric.")


def _agent(args, force_sample: bool = False):
    if force_sample or args.agent == "sample":
        seed = getattr(args, "seed", 0)
        return SampleOrderBot(seed=seed), None, None, {}
    system = SAMPLE_SYSTEM_PROMPT
    if args.system_prompt_file and Path(args.system_prompt_file).exists():
        system = Path(args.system_prompt_file).read_text(encoding="utf-8").strip()
    adapter = LiveAdapter(
        system_prompt=system,
        model=args.model,
        base_url=args.base_url,
        api_key=args.key,
        temperature=args.temperature,
    )
    return (
        adapter,
        adapter.model,
        None,
        {"temperature": args.temperature, "max_steps": adapter.max_steps},
    )


def cmd_run(args) -> int:
    from .harness.runner import run_suite

    family = get_family(args.suite)
    agent, model, model_version, decoding = _agent(args)
    out_dir = Path(args.out)
    result = run_suite(
        family,
        agent,
        out_dir=out_dir,
        model=model,
        model_version=model_version,
        decoding=decoding,
        seed=getattr(args, "seed", 0),
    )
    _print_report(result, family)
    return 0


def cmd_verify(args) -> int:
    from .bundle.verify import verify_bundle

    run_dir = Path(args.run_dir)
    if not (run_dir / "bundle.jsonl").exists():
        print(f"no bundle at {run_dir}")
        return 2
    lines = [
        json.loads(ln) for ln in (run_dir / "bundle.jsonl").read_text(encoding="utf-8").splitlines() if ln.strip()
    ]
    fam_id = next((e.get("family") for e in lines[1:] if e.get("type") == "event"), None)
    family = get_family(fam_id) if fam_id else None
    res = verify_bundle(run_dir, family=family)
    print(f"tieout verify: {run_dir}")
    for line in res.lines:
        print("  " + line)
    return 0 if res.ok else 1


def cmd_gaps(args) -> int:
    run_dir = Path(args.run_dir)
    lines = [
        json.loads(ln) for ln in (run_dir / "bundle.jsonl").read_text(encoding="utf-8").splitlines() if ln.strip()
    ]
    gaps = [ln for ln in lines[1:] if ln.get("type") == "gap"]
    if not gaps:
        print("no named gaps in this bundle")
        return 0
    for g in gaps:
        print(f"[{g['code']}] {g['scope']}: {g['reason']}")
    return 0


def cmd_judge_audit(args) -> int:
    run_dir = Path(args.run_dir)
    lines = [
        json.loads(ln) for ln in (run_dir / "bundle.jsonl").read_text(encoding="utf-8").splitlines() if ln.strip()
    ]
    audit = next((ln for ln in lines[1:] if ln.get("type") == "judge_audit"), None)
    if audit is None:
        print("no judge audit record in this bundle")
        return 2
    print(f"judge audit: {run_dir}")
    print(f"  judge            : {audit['judge']}")
    print(f"  anchors          : {audit['anchors_total']}")
    print(f"  anchor agreement : {audit['anchors_agreement']}")
    print(f"  perturbation flips: {audit['perturbation_flips']}")
    print(f"  disagreement rate: {audit['disagreement_rate']}")
    print(f"  self-preference  : {'clean' if audit['self_preference_clean'] else 'DIRTY'}")
    for d in audit.get("details", []):
        print(f"  detail: {d}")
    return 0


def cmd_diff(args) -> int:
    from .diff import DiffError, diff_bundles, format_report

    try:
        d = diff_bundles(args.run_a, args.run_b)
    except DiffError as e:
        print(f"tieout diff: {e}")
        return 2
    if args.json:
        print(json.dumps(d, indent=2, sort_keys=True))
    else:
        print(format_report(d))
    return 0


def cmd_selftest(_args) -> int:
    from .selftest import selftest

    passed, total, results = selftest()
    print("tieout selftest")
    for i, (name, ok, detail) in enumerate(results, start=1):
        print("  %d. [%s] %s" % (i, "PASS" if ok else "FAIL", name))
        if detail:
            print("       %s" % detail)
    print()
    print("SELFTEST %s (%d/%d)" % ("PASS" if passed == total else "FAIL", passed, total))
    return 0 if passed == total else 1


def cmd_serve(args) -> int:
    import uvicorn

    from .server import create_app

    uvicorn.run(create_app(args.runs_dir), host=args.host, port=args.port)
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="tieout", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--version", action="version", version=f"tieout {__version__}")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("demo", help="run F1 against the deterministic sample agent (keyless)")
    s.add_argument("--out", default="runs/demo")
    s.add_argument("--suite", default="F1")
    s.add_argument("--seed", type=int, default=0)

    def _demo(a) -> int:
        a.agent = "sample"
        return cmd_run(a)

    s.set_defaults(fn=_demo)

    r = sub.add_parser("run", help="run a suite against an agent")
    r.add_argument("--agent", choices=["sample", "live"], default="sample")
    r.add_argument("--suite", default="F1")
    r.add_argument("--out", default=None)
    r.add_argument("--model", default=None)
    r.add_argument("--base-url", default=None)
    r.add_argument("--key", default=None)
    r.add_argument("--system-prompt-file", default=None)
    r.add_argument("--temperature", type=float, default=0.2)
    r.add_argument("--seed", type=int, default=0, help="surface-drift seed for the sample agent (0 = documented behavior)")
    r.set_defaults(fn=cmd_run)

    v = sub.add_parser("verify", help="P5 re-derivation of a bundle (stranger-safe)")
    v.add_argument("run_dir")
    v.set_defaults(fn=cmd_verify)

    g = sub.add_parser("gaps", help="the named gaps of a bundle, if any")
    g.add_argument("run_dir")
    g.set_defaults(fn=cmd_gaps)

    j = sub.add_parser("judge-audit", help="the judge's own numbers from a bundle")
    j.add_argument("run_dir")
    j.set_defaults(fn=cmd_judge_audit)

    df = sub.add_parser("diff", help="cross-run stability diff (align by pre-assigned id)")
    df.add_argument("run_a")
    df.add_argument("run_b")
    df.add_argument("--json", action="store_true")
    df.set_defaults(fn=cmd_diff)

    st = sub.add_parser("selftest", help="the 8-point harness selftest")
    st.set_defaults(fn=cmd_selftest)

    sv = sub.add_parser("serve", help="bundle browser + verify over HTTP")
    sv.add_argument("--port", type=int, default=8000)
    sv.add_argument("--host", default="0.0.0.0")
    sv.add_argument("--runs-dir", default="runs")
    sv.set_defaults(fn=cmd_serve)

    args = p.parse_args(argv)
    if args.cmd == "run" and args.out is None:
        from datetime import datetime, timezone

        args.out = "runs/" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
