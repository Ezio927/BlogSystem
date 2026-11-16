#!/usr/bin/env bash
set -euo pipefail
project_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$project_root/my-blog-manager"
if [[ ${1:-} != --no-build ]]; then npm run build -- --webpack; fi
test -f .next/standalone/server.js
mkdir -p .next/standalone/.next
cp -a .next/static .next/standalone/.next/
cp -a public/. .next/standalone/public/
# Copy only Python application code, never local drafts or runtime configuration.
mkdir -p .next/standalone/cms_core
tar --exclude='__pycache__' --exclude='*.pyc' -cf - cms_core | tar -xf - -C .next/standalone
cp requirements-local.txt .next/standalone/requirements-local.txt
cp "$project_root/scripts/server-manager.py" .next/standalone/server-manager.py
python3 - <<'PY'
import json
from pathlib import Path
p = Path('.next/standalone/public/backend_config.json')
p.write_text(json.dumps({'api_port': 3402, 'mode': 'server', 'public_url': 'https://47.101.37.232/blog'}))
PY
