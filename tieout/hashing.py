"""Canonical hashing and the verdict-event hash chain (P1 / P5).

The chain is the unit of re-derivation. Each record line carries the
sha256 of its canonical payload, including the previous line's hash.
A stranger with the bundle file and the check definition can re-walk
the chain, re-hash the manifest, and re-run the detectors on the
stored raw outputs: no model, no key, no network.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

GENESIS = "0" * 64


def canonical(obj: object) -> str:
    """Canonical JSON: sorted keys, compact separators, no key reordering.

    One record must be one physical line, always: the bundle is a
    line-delimited hash chain that a stranger reads with a text editor.
    U+2028 (LINE SEPARATOR) and U+2029 (PARAGRAPH SEPARATOR) are legal
    unescaped inside a JSON string, but line-based readers (Python's
    str.splitlines and friends) treat them as line breaks. json.dumps
    never escapes them, so we do, here, once, for every record. Both
    forms parse back to the same character, so this is lossless.
    """
    text = json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return text.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def sha256_file(path: str | Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def record_hash(payload: dict) -> str:
    """Hash of one record line.

    The caller passes the record dict with its own hash field removed
    and prev_hash already set. verify() recomputes exactly this.
    """
    h = {k: v for k, v in payload.items() if k != "record_hash"}
    return sha256_text(canonical(h))
