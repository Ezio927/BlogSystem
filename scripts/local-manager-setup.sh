#!/usr/bin/env bash
set -euo pipefail
manager_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../my-blog-manager" && pwd)"
python3 -m venv "$manager_root/.venv"
"$manager_root/.venv/bin/python" -m pip install -r "$manager_root/requirements-local.txt"
cd "$manager_root"
npm ci --no-audit --no-fund
