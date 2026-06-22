#!/usr/bin/env bash
# Apply Alembic migrations (idempotent — skips existing tables).
set -euo pipefail
cd "$(dirname "$0")/../backend"
alembic upgrade head
echo "Alembic migrations applied."