# Validation performed

## Automated checks

- 51 Python tests passed: money precision/invalid inputs; odd/even/empty statistics; salary history; transaction rollback when audit creation fails; two concurrent editors with exactly one success; inactive exclusions; currency/filter correctness; unique identities; literal substring search; stable pagination; reopening the database; immutable audit events; 10,000 deterministic seed records and preservation on rerun; sign-in requirements; CSRF/origin checks; failed-login throttling; production settings; full API create/edit/report flow; malformed CSV; all-or-nothing import; revalidation after preview; export escaping; request-size limit; no-op/employee-ID edit rejection.
- 5 frontend tests passed: exact large monetary display; empty statistics; decimal-string/version/reason submission; retained input on a 409 conflict; no implicit FX conversion when country changes.
- TypeScript checks and Vite production build passed.
- Python statement coverage reported 96% in the latest local run (485 of 505 statements). This is not branch coverage, and the seed CLI is excluded; seed semantics have explicit tests. Coverage is supplementary evidence, not a quality claim on its own.
- A third-party Starlette warning reports that its current TestClient prefers `httpx2` over `httpx`. The pinned tests pass; the warning is retained rather than suppressed.

## Local workload measurements

`python scripts/benchmark.py` creates an isolated 10,000-employee database, then performs 30 repetitions per operation. One observed run:

| Operation | Median | Maximum |
| --- | ---: | ---: |
| First directory page | 0.49 ms | 1.39 ms |
| Page 400 (last page) | 0.71 ms | 1.07 ms |
| Name substring search | 4.89 ms | 5.65 ms |
| INR department report | 2.38 ms | 3.13 ms |

These measure Python service/database functions on this development machine, not HTTP, network, browser rendering, sustained traffic or cloud-host performance. Warm filesystem caches and machine characteristics matter. They establish that the chosen queries are practical for the supplied dataset, not a production SLA.

## Verification limits

- The managed browser preview runs in a different environment. Its first attempt could not execute the host virtual environment; the portable launcher then reached system Python, which lacked Uvicorn. The preview did not become healthy. No browser screenshots, visual QA or browser end-to-end success is claimed.
- Docker is not available here. Dockerfile/entrypoint/Render configuration are prepared and reviewed but not built or exercised on Render.
- Render is installed; no Render deployment actions are exposed in this session's tool inventory. No live URL has been verified.
- No external Git repository has been created/pushed, no remote CI result exists, and no video has been recorded.

The live checks in `DEPLOYMENT.md` are mandatory before calling the assessment ready to submit.
