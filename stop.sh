#!/usr/bin/env bash
# stop.sh — stop and remove containers for this project
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "[vibe] Stopping and removing containers..."
docker compose down

echo "[vibe] Done. Containers stopped."
