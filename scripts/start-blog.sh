#!/usr/bin/env bash
set -euo pipefail
project_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
export XHBLOGS_CONTENT_ROOT="$project_root/XHBlogs"
export HOSTNAME=127.0.0.1
export PORT=${PORT:-3400}
# Next may normalize request.url to localhost; match the documented browser entry.
export CHAT_ALLOWED_ORIGIN=${CHAT_ALLOWED_ORIGIN:-http://127.0.0.1:$PORT}
exec node "$project_root/XHBlogs/.next/standalone/server.js"
