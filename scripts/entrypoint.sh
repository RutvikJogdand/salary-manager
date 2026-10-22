#!/bin/sh
set -eu
if [ "$(id -u)" = "0" ]; then
  mkdir -p /var/data
  chown acme:acme /var/data
  exec gosu acme /app/scripts/entrypoint.sh
fi
if [ "${SEED_DEMO:-0}" = "1" ]; then
  python -m acme.seed
fi
exec python -m uvicorn acme.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 1
