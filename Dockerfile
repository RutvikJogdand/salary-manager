FROM node:22-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim-bookworm AS runtime
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=/app/backend \
    DATABASE_PATH=/var/data/acme.sqlite3 FRONTEND_DIR=/app/frontend/dist PORT=8000
RUN apt-get update && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 acme && useradd --uid 10001 --gid acme --no-create-home acme \
    && mkdir -p /var/data && chown acme:acme /var/data
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/acme ./backend/acme
COPY --from=frontend /build/frontend/dist ./frontend/dist
COPY scripts/entrypoint.sh ./scripts/entrypoint.sh
RUN chmod 755 ./scripts/entrypoint.sh
EXPOSE 8000
# The entrypoint owns only the mounted data directory, then drops to UID 10001.
ENTRYPOINT ["/app/scripts/entrypoint.sh"]
