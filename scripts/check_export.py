#!/usr/bin/env python3
"""Site contract for the static export.

`npm run build` writes web/out. This script checks the things a build
will happily produce but a reader would notice: every route exported, the
author link on every page, twelve articles with a populated "verified
against" block, and the nested run pages that make the stability pair
reachable by URL.

Run after the frontend build; CI does exactly that.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

LINKEDIN = "linkedin.com/in/olusanya-timothy"
MIN_PAGES = 25
ARTICLES = 12
MIN_SOURCES = 3
MIN_ARTICLE_CHARS = 4000


def fail(msg: str) -> None:
    print(f"FAIL: {msg}")
    raise SystemExit(1)


def main(out_dir: str = "web/out") -> int:
    out = Path(out_dir)
    if not out.is_dir():
        fail(f"{out} does not exist: run `npm --prefix web run build` first")

    pages = sorted(out.rglob("index.html"))
    if len(pages) < MIN_PAGES:
        fail(f"only {len(pages)} exported pages, expected at least {MIN_PAGES}")

    missing_link = [p for p in pages if LINKEDIN not in p.read_text(encoding="utf-8", errors="replace")]
    if missing_link:
        fail(f"{len(missing_link)} page(s) carry no LinkedIn link, e.g. {missing_link[0]}")

    # required routes: the evidence path and every spec page
    required = [
        "",
        "runs",
        "compare",
        "families",
        "method",
        "format",
        "matrix",
        "harness",
        "blog",
        "run/demo",
        "run/demo-f2",
        "run/demo-stability/a",
        "run/demo-stability/b",
    ]
    missing = [r for r in required if not (out / r / "index.html").exists()]
    if missing:
        fail(f"missing routes: {missing}")

    articles = sorted(p for p in (out / "blog").iterdir() if p.is_dir())
    if len(articles) != ARTICLES:
        fail(f"{len(articles)} articles exported, expected {ARTICLES}")

    for a in articles:
        html = (a / "index.html").read_text(encoding="utf-8", errors="replace")
        text = re.sub(r"<[^>]+>", " ", html)
        if "verified against" not in text.lower():
            fail(f"{a.name}: no 'verified against' section")
        sources = len(re.findall(r"<li[^>]*>(?:(?!</li>).)*?</li>", html.split("verified-list", 1)[-1], re.S))
        if sources < MIN_SOURCES:
            fail(f"{a.name}: {sources} sources listed, expected at least {MIN_SOURCES}")
        if len(text) < MIN_ARTICLE_CHARS:
            fail(f"{a.name}: {len(text)} characters of text, expected at least {MIN_ARTICLE_CHARS}")

    print(
        f"OK: {len(pages)} pages exported, {len(articles)} articles, "
        f"author link on every page, all required routes present"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:]))
