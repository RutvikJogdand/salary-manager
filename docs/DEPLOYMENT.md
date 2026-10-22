# Deployment runbook

## Current state

No service has been created or paid plan purchased. Render installation is confirmed, but its deployment actions were not exposed to this session. Docker is also unavailable here, so the container build remains unverified. The production frontend and the Python API are independently built/tested; that is not a substitute for a deployed smoke test.

## Intended topology

One Docker web service serves the React assets and FastAPI API. One persistent disk is mounted at `/var/data`; SQLite uses `/var/data/acme.sqlite3`. The entrypoint creates ownership for UID 10001, drops privileges, optionally runs the explicit demo seed, then launches one worker. No real employee data is involved.

Render supports persistent disks on paid services. Its default filesystem is ephemeral. Review current cost before provisioning: [Render persistent disks](https://render.com/docs/disks), [pricing](https://render.com/pricing). The checked-in `render.yaml` selects `starter` and a 1 GB disk; it is a proposed configuration, not a purchase or confirmed deployment.

## Before deploying

1. Confirm the salary/currency/reporting scope with Incubyte.
2. Review the source and tests; push the complete Git history to your own Git repository. Do not upload a single flattened final commit.
3. Build and run the image in an environment with Docker:

```bash
docker build -t acme-compensation .
docker volume create acme-salary-data
docker run --rm -p 8000:8000 --mount source=acme-salary-data,target=/var/data -e SEED_DEMO=1 acme-compensation
```

This local container uses the public local demo password. For an internet deployment, use `APP_ENV=production`, a random private `ADMIN_PASSWORD` of at least 16 characters, and the exact canonical HTTPS `APP_ORIGIN` (no trailing slash). Keep the secret in the host's secret settings and give reviewer access separately, never in a public repository. `.env.example` is documentation; the application reads process environment variables and does not load this file automatically.

## Render

Create a Blueprint from the repository only after approving any service/disk cost. The [official Blueprint reference](https://render.com/docs/blueprint-spec) documents the checked-in fields. Set `APP_ORIGIN` to the actual Render service URL and `ADMIN_PASSWORD` to a newly generated private password. The service deliberately fails startup if production configuration is incomplete.

`SEED_DEMO=1` opts this assessment deployment into the 10,000-record seed. Reruns preserve edits. The seed never resets or replaces an existing marked dataset. Keep the service at one instance; its disk is not shared across independently scaled replicas.

## Required live verification

- Confirm `/health` returns `{"status":"ok"}` on the deployed URL.
- Sign in with the configured password; the directory must initially show exactly 10,000 employees, including inactive employees.
- Open an employee, change salary with a reason, reload, and verify the audit history and report update.
- Open the same employee in two tabs; save one; verify the other cannot silently overwrite it.
- Upload a CSV with one invalid row. No employees should be added. Correct it, preview and explicitly confirm.
- Change reporting currency and ensure unrelated monetary values are never added together.
- Restart/redeploy the same service and verify edits survive; seed must not restore the original values.
- Sign out and verify API data requires sign-in.
- Check desktop and narrow-screen layout and keyboard navigation, then record the demo.

Use uniquely identified fictional QA employees for create/import checks. Do not reset the database or bypass the immutable audit trail to clean up a live demonstration; deactivate QA records if necessary.

## Operations boundary

For real HR usage, replace the shared identity with individual SSO accounts and roles, configure trusted proxy/client-IP behavior for throttling, add monitoring and database-aware backups with a restore drill. Do not copy a live SQLite database file alone while WAL writes are in progress; use SQLite's backup API or an appropriate coordinated snapshot. Secrets rotation, audit export, retention policy and production security review are future work.
