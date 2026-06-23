#!/usr/bin/env python3
"""Deprecated alias — use scripts/build_synthetic_proxy_labels.py."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

_TARGET = Path(__file__).resolve().parent / "build_synthetic_proxy_labels.py"
raise SystemExit(subprocess.call([sys.executable, str(_TARGET)]))