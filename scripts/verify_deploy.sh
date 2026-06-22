#!/usr/bin/env bash
# Verify GitHub repo + HF Space URLs from submission_metadata.yaml are live.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

python3 << 'PY'
import sys
import urllib.request
import yaml

meta = yaml.safe_load(open("submission_metadata.yaml"))
checks = [
    ("github_repo", meta.get("github_repo", "")),
    ("sandbox_link", meta.get("sandbox_link", "")),
]
failed = 0
for name, url in checks:
    if not url:
        print(f"FAIL {name}: empty")
        failed += 1
        continue
    try:
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=15) as r:
            ok = r.status < 400
    except Exception as e:
        ok = False
        print(f"FAIL {name}: {url} ({e})")
        failed += 1
        continue
    if ok:
        print(f"OK   {name}: {url}")
    else:
        print(f"FAIL {name}: {url}")
        failed += 1

sys.exit(1 if failed else 0)
PY