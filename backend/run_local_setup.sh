#!/usr/bin/env bash
# run_local_setup.sh
# Helper script to perform the common local setup steps for the Vibe backend on macOS/Linux.
# This script attempts to:
#  - copy .env.example -> .env (if missing)
#  - check for required tools (node, npm, psql)
#  - optionally create a local Postgres user and database (vibe / vibe_pass / vibe_db)
#  - run the DB migration
#  - install npm dependencies
#  - start the backend in the background and tail the log

set -euo pipefail
cd "$(dirname "$0")"
ROOT_DIR=$(pwd)
ENV_FILE="$ROOT_DIR/.env"
EXAMPLE_ENV="$ROOT_DIR/.env.example"
MIGRATE_SQL="$ROOT_DIR/migrate.sql"
LOGFILE="$ROOT_DIR/backend.log"

echo "Vibe backend local setup helper"

# 1) copy .env.example -> .env if not present
if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$EXAMPLE_ENV" ]; then
    cp "$EXAMPLE_ENV" "$ENV_FILE"
    echo ".env created from .env.example. Please edit $ENV_FILE to set DATABASE_URL and JWT_SECRET before proceeding (open it in an editor)."
    echo "After editing, re-run this script.
Example DATABASE_URL format: postgresql://vibe:vibe_pass@localhost:5432/vibe_db"
    exit 0
  else
    echo "Error: $EXAMPLE_ENV not found. Aborting."; exit 1
  fi
else
  echo ".env exists. Continuing."
fi

# 2) check for required commands
missing=()
for cmd in node npm psql; do
  if ! command -v $cmd >/dev/null 2>&1; then
    missing+=("$cmd")
  fi
done
if [ ${#missing[@]} -gt 0 ]; then
  echo "Missing required commands: ${missing[*]}"
  echo "Install Node (with npm) and/or psql (Postgres client) and re-run."
  echo "On macOS, you can install with Homebrew: brew install node postgresql"
  exit 1
fi

# 3) show current DATABASE_URL from .env (redacted)
DBURL_LINE=$(grep -E '^DATABASE_URL=' "$ENV_FILE" || true)
if [ -z "$DBURL_LINE" ]; then
  echo "DATABASE_URL not set in $ENV_FILE. Please edit it and re-run."; exit 1
else
  echo "Found DATABASE_URL in .env (redacted):"
  echo "$DBURL_LINE" | sed -E 's#(postgresql://)[^:]+:[^@]+@#\1<user>:<pass>@#'
fi

# 4) attempt to create DB (best-effort). This requires that the current user can run psql and has privileges
read -p "Attempt to create database 'vibe_db' and user 'vibe' with password 'vibe_pass' if they don't exist? [y/N] " create_db
if [[ "$create_db" =~ ^[Yy]$ ]]; then
  echo "Creating DB and user (may prompt for psql password if required)..."
  # create role and db if not exists
  psql -v ON_ERROR_STOP=1 <<'PSQL'
DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vibe') THEN
      CREATE ROLE vibe LOGIN PASSWORD 'vibe_pass';
   END IF;
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vibe_db') THEN
      PERFORM dblink_exec('dbname=postgres', 'CREATE DATABASE vibe_db OWNER vibe');
   END IF;
END
$$;
PSQL
  # If dblink not available or above fails, fallback to simple commands (some hosts require superuser)
  echo "Attempted to create user and database. If psql called failed due to permissions, create them manually and re-run the script."
fi

# 5) run migration
echo "Running migration: $MIGRATE_SQL"
psql "$DBURL_LINE" -f "$MIGRATE_SQL" || {
  echo "Migration failed. Verify DATABASE_URL and DB permissions."; exit 1
}

# 6) install dependencies and start backend
echo "Installing npm dependencies (production)..."
npm install --prefix "$ROOT_DIR" || { echo "npm install failed"; exit 1; }

echo "Starting backend with 'node server.js' in background... logs -> $LOGFILE"
# kill previous server if running
pkill -f 'node .*server.js' || true
nohup node server.js > "$LOGFILE" 2>&1 &
sleep 1
if pgrep -f 'node .*server.js' >/dev/null; then
  echo "Backend started. Tailing logs (press Ctrl+C to stop tail):"
  tail -n +1 -f "$LOGFILE"
else
  echo "Backend failed to start. Check $LOGFILE for details."; exit 1
fi
