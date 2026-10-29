"""ASGI entrypoint for serverless hosts (Vercel services, and peers).

The same app `tieout serve` runs, minus uvicorn: the platform imports
`main:app` directly and calls it as an ASGI application. The runs
directory is the committed evidence inside the deployed bundle, so the
deployed UI browses exactly the records that are in git.

Two properties of the serverless environment, handled explicitly:

- the filesystem is ephemeral and read-only outside /tmp, so the verify
  endpoint's `verify_report.json` write is best-effort (see server.py);
  the report is always returned in the HTTP response, which is what the
  UI consumes
- there are no background workers or websockets: tieout has neither
"""
from pathlib import Path

from tieout.server import create_app

ROOT = Path(__file__).resolve().parent

app = create_app(ROOT / "runs")
