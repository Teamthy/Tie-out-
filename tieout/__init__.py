"""tieout: the evidence-grade agent evaluation harness.

A report is a claim. A bundle is a record a stranger can re-derive
without trusting the tool, the judge, or the team that ran it.

Six pillars, all enforced in code:
  P1 verdict event    one record per check result, four-part binding
  P2 provenance       exact harness, model, dataset, environment, decoding
  P3 negative controls every suite carries items it does not generate
  P4 named gaps       anything unverifiable is recorded, never dropped
  P5 re-derivation    verify re-walks the chain and re-runs detectors
  P6 judge audit      the judge's own reliability numbers, every run
"""

__version__ = "0.3.0"
