PY ?= python3

.PHONY: install lint test selftest demo verify ui site serve clean

install:
	pip install -e ".[dev]"

lint:
	ruff check .

test:
	pytest

selftest:
	$(PY) -m tieout selftest

demo:
	$(PY) -m tieout demo

verify:
	$(PY) -m tieout verify runs/demo

ui:
	cd web && npm install && npm run build

site:
	cd web && npm ci && npm run build
	$(PY) scripts/check_export.py web/out

serve:
	$(PY) -m tieout serve --port 8000 --runs-dir runs

clean:
	rm -rf web/.next web/out .pytest_cache .ruff_cache
	find . -name __pycache__ -type d -not -path "./web/*" -not -path "./.venv/*" -exec rm -rf {} +
