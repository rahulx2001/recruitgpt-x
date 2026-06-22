#!/usr/bin/env bash
# Seed demo candidates and sample job into the configured database.
set -euo pipefail
cd "$(dirname "$0")/../backend"
python -m app.data.seed