#!/usr/bin/env bash
# github_push_helper.sh
# Helper to create a PRIVATE GitHub repo and push the current project.
# Usage (recommended):
#   1) Install and authenticate GitHub CLI: brew install gh && gh auth login
#   2) Run: ./github_push_helper.sh your-repo-name
#
# Alternate (no gh): set environment variable GITHUB_TOKEN with a personal access token
# (repo scope) and run: GITHUB_TOKEN=ghp_... ./github_push_helper.sh your-repo-name

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <github-repo-name> [--private]"
  exit 1
fi

REPO_NAME="$1"
PRIVATE_FLAG="true"
if [ "${2:-}" = "--public" ]; then
  PRIVATE_FLAG="false"
fi

echo "Preparing to create repo '$REPO_NAME' (private=${PRIVATE_FLAG}) and push the current repo..."

if ! command -v git >/dev/null 2>&1; then
  echo "git is not installed. Please install git and re-run this script." >&2
  exit 1
fi

if command -v gh >/dev/null 2>&1; then
  echo "Found gh (GitHub CLI) — using it to create the repo. If you are not authenticated, gh will prompt you."
  if ! gh auth status >/dev/null 2>&1; then
    echo "gh is not authenticated. Running 'gh auth login' now..."
    gh auth login
  fi
  echo "Creating repo via gh..."
  gh repo create "$REPO_NAME" --"$( [ "$PRIVATE_FLAG" = "true" ] && echo private || echo public )" --confirm
  REMOTE_URL="git@github.com:$(gh api user --jq .login):$REPO_NAME.git"
else
  if [ -z "${GITHUB_TOKEN:-}" ]; then
    echo "gh not found. To proceed without gh, set the GITHUB_TOKEN env var (a personal access token with 'repo' scope) and re-run." >&2
    echo "Example: export GITHUB_TOKEN=ghp_xxx && ./github_push_helper.sh $REPO_NAME" >&2
    exit 1
  fi
  echo "Using GitHub API with GITHUB_TOKEN to create the repo..."
  USERNAME=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | jq -r .login)
  if [ -z "$USERNAME" ] || [ "$USERNAME" = "null" ]; then
    echo "Failed to determine GitHub username from token. Check GITHUB_TOKEN." >&2
    exit 1
  fi
  echo "Creating repo under user $USERNAME..."
  curl -s -H "Authorization: token $GITHUB_TOKEN" \
    -d "{\"name\": \"$REPO_NAME\", \"private\": $PRIVATE_FLAG}" \
    https://api.github.com/user/repos | jq -r '.ssh_url'
  REMOTE_URL="git@github.com:$USERNAME:$REPO_NAME.git"
fi

echo "Setting remote origin to: $REMOTE_URL"
git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE_URL"

echo "Pushing main branch (creating if needed)..."
git branch -M main || true
git push -u origin main

echo "Done. Repository created and pushed: $REMOTE_URL"
