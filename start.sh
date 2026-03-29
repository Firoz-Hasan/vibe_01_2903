#!/usr/bin/env bash
# start.sh — bring the project up (Docker Compose), run migrations and verify health
# Usage: ./start.sh
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "[vibe] Starting Docker Compose (build if needed)..."
docker compose up --build -d

echo "[vibe] Waiting for Postgres to become ready..."
# Wait up to 60s
for i in $(seq 1 60); do
  if docker compose exec -T db pg_isready -U vibe >/dev/null 2>&1; then
    echo "[vibe] Postgres is ready"; break
  fi
  echo "[vibe] Postgres not ready yet ($i/60)..."; sleep 1
done

# Run migration (migration uses IF NOT EXISTS so it's safe to run multiple times)
echo "[vibe] Applying migrations (if any)..."
# Use -T to avoid issues with pseudo-tty allocation
if docker compose exec -T db psql -U vibe -d vibe_db -f /docker-entrypoint-initdb.d/migrate.sql >/dev/null 2>&1; then
  echo "[vibe] Migrations applied (or already present)."
else
  echo "[vibe] Migration command finished (check db logs if you see issues)."
fi

echo "[vibe] Waiting for backend to be ready..."
for i in $(seq 1 60); do
  if curl -sS http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "[vibe] Backend is responding"; break
  fi
  echo "[vibe] Backend not ready yet ($i/60)..."; sleep 1
done

echo "[vibe] Final health checks:"
curl -sS http://localhost:3000/api/health || true
echo
curl -sS http://localhost:3000/api/db-check || true
echo

echo "[vibe] Startup complete — open http://localhost:3000/registration.html"
