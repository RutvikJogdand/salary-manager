# ACME Compensation

A Python/FastAPI + React/TypeScript salary workspace for an HR manager at a fictional multinational organization. SQLite stores employee records, current annual gross base salary and immutable application audit events. The explicit seed command creates **10,000 fictional employees**.

## Delivery status

Implemented and tested locally. **This is not yet a complete assessment submission:** a public Git repository, a verified live deployment, browser visual QA and a recorded video remain outstanding. No deployment or recording link is invented. See [delivery checklist](docs/DELIVERY_STATUS.md).

The assessment leaves compensation meaning and reporting scope open. [Requirements](docs/REQUIREMENTS.md) were committed before code; [clarification questions](docs/CLARIFICATIONS.md) remain unanswered. Annual base salary, reports by separate currencies and structured reporting are explicitly proposed choices, not confirmed employer requirements.

## What it does

- Search, filter, sort and paginate employee records on the server.
- Add employees, edit their profiles/pay and deactivate/reactivate them.
- Require a reason for updates; preserve old/new values; reject concurrent stale edits.
- Report headcount, total base salary, mean, median, minimum and maximum within one currency.
- Validate CSV imports before confirming; reject the entire batch if any row fails; revalidate at commit time.
- Export filtered employee records with spreadsheet formula protection.
- Require sign-in; use HttpOnly sessions, CSRF protection, login throttling and production-only secure cookies.

## Run locally

Use Python 3.12 and Node 22 or newer. Tested here with Python 3.12; frontend dependencies are pinned by `frontend/package-lock.json`.

### macOS / Linux

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements-dev.txt
npm --prefix frontend ci
npm --prefix frontend run build
export PYTHONPATH=backend
python -m acme.seed
python -m uvicorn acme.main:app --reload
```

### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
npm --prefix frontend ci
npm --prefix frontend run build
$env:PYTHONPATH = "backend"
python -m acme.seed
python -m uvicorn acme.main:app --reload
```

Open **http://127.0.0.1:8000**. Local-only workspace password: **`local-demo-only`**. This password is intentionally public for local fictional data; production refuses to use it. For interactive development, keep the API running and use `npm --prefix frontend run dev`; Vite proxies `/api` to port 8000. API documentation is at `/api/docs` locally and disabled in production.

The seed is explicit, deterministic and atomic. A rerun checks its marker and preserves all existing edits. It refuses to populate an unmarked nonempty database. The web server never seeds implicitly. The Docker assessment configuration opts in with `SEED_DEMO=1`.

## Tests and build

With the Python environment active:

```bash
python -m pytest --cov=acme --cov-report=term-missing
npm --prefix frontend test
npm --prefix frontend run build
python scripts/benchmark.py
```

Current validation: **51 Python tests and 5 React/formatting tests passed**, plus the TypeScript production build. The Python coverage report measures statement coverage; seed behavior has dedicated tests but the seed CLI is excluded from that percentage. See the actual scope and limitations in [validation notes](docs/VALIDATION.md). CI runs these tests/builds on push and pull requests when hosted on GitHub; CI itself has not yet run remotely.

## Deployment

[Deployment instructions](docs/DEPLOYMENT.md) describe the Docker service and Render Blueprint. Use one service instance and a persistent disk. SQLite must not live on an ephemeral filesystem. A real production installation also needs individual identity/SSO, database-aware backups with restore drills and monitoring; the single HR identity is an assessment boundary.

The Dockerfile and Render configuration are prepared but have not been built/deployed in this environment. Do not mistake a local preview or a checked-in Blueprint for a live deployment.

## Read the code in this order

1. [Requirements](docs/REQUIREMENTS.md) and [clarifications](docs/CLARIFICATIONS.md).
2. [Code walkthrough](docs/CODE_WALKTHROUGH.md): follows one salary change, then reporting, import and deployment.
3. [Architecture and trade-offs](docs/ARCHITECTURE.md).
4. [AI workflow](docs/AI_WORKFLOW.md) and the real incremental Git history.
5. [Demo recording script](docs/DEMO_SCRIPT.md), after verifying deployment.

All employee names and compensation records are synthetic. No employer data, candidate contact details, personal credentials or production database are committed.
