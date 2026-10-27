#!/bin/bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_DIR"

PORT="${DEPLOY_RUN_PORT:-5000}"

echo "Starting HTTP service on port ${PORT}..."
pnpm run start --port "${PORT}"
