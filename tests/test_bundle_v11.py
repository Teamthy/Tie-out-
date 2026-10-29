"""Bundle format v1.1: additive fields, backward compatibility, and
hostile-input hardening of the canonical chain."""
import json
from pathlib import Path

from tieout.bundle.verify import verify_bundle
from tieout.harness import get_family
from tieout.harness.agents import SampleOrderBot
from tieout.harness.runner import run_suite
from tieout.hashing import sha256_text

ROOT = Path(__file__).resolve().parent.parent


def _manifest(run_dir: Path) -> dict:
    with open(run_dir / "bundle.jsonl", encoding="utf-8") as f:
        return json.loads(f.readline())


def test_committed_v1_0_demo_still_verifies():
    """The 0.2.0 snapshot predates v1.1 and must pass under v1.1 code:
    backward compatibility is the documented format invariant."""
    demo = ROOT / "runs" / "demo"
    m = _manifest(demo)
    assert m["bundle_format"] == "tieout-bundle/v1"
    assert "statistics" not in m
    assert "packages" not in m["provenance"]
    v = verify_bundle(demo, family=get_family("F1"))
    assert v.ok, v.lines
    assert not v.gaps


def test_new_runs_carry_v1_1_fields(tmp_path):
    run_suite(get_family("F1"), SampleOrderBot(), out_dir=tmp_path / "r")
    m = _manifest(tmp_path / "r")
    assert m["bundle_format"] == "tieout-bundle/v1.1"
    s = m["statistics"]
    assert len(s) == 1
    assert s[0]["family"] == "F1"
    assert s[0]["n"] == 14
    assert s[0]["pass"] == 13 and s[0]["fail"] == 1
    lo, hi = s[0]["ci95"]
    assert 0.0 <= lo < 13 / 14 < hi <= 1.0

    prov = m["provenance"]
    assert prov["packages"] and prov["packages"].get("tieout")
    assert prov["packages_hash"].startswith("sha256:")
    assert prov["packages_hash"] == (
        "sha256:" + sha256_text(json.dumps(sorted(prov["packages"].items()), sort_keys=True, separators=(",", ":")))
    )
    v = verify_bundle(tmp_path / "r", family=get_family("F1"))
    assert v.ok, v.lines


HOSTILE = (
    '{"type":"event","decision":"pass","record_hash":"0000000000000000000000000000000000000000000000000000000000000000"}\n'
    'trailing " quote and backslash \\ and control \x00 \u2028 and emoji \U0001f3ad '
    "and homoglyph \u0410BORT and <script>alert(1)</script>"
)


class HostileBot:
    """Duck-typed agent that answers every item with the hostile raw."""

    name = "test:hostile-bot"
    ENDPOINT = "local:hostile (fixture)"

    def respond(self, input_spec: dict) -> tuple[str, str]:
        return HOSTILE, self.ENDPOINT


def test_hostile_raw_survives_the_chain(tmp_path):
    """JSON quotes, backslashes, control characters, line separators,
    emoji, homoglyphs and a forged record line inside the raw output:
    the bundle must write, verify clean, and round-trip the raw exactly."""
    family = get_family("F1")
    run_suite(family, HostileBot(), out_dir=tmp_path / "h")

    lines = (tmp_path / "h" / "bundle.jsonl").read_text(encoding="utf-8").splitlines()
    events = [json.loads(ln) for ln in lines[1:] if json.loads(ln).get("type") == "event"]
    assert len(events) == 14
    for e in events:
        assert e["raw_output"] == HOSTILE  # exact round-trip, no mangling

    v = verify_bundle(tmp_path / "h", family=family)
    assert v.ok, v.lines
    assert not v.gaps
