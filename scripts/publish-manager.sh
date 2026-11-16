#!/usr/bin/env bash
# Deploy the private console only; never upload or replace its persistent content.
set -euo pipefail
project_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$project_root"
test -f my-blog-manager/.next/standalone/server-manager.py || { echo 'Run bash scripts/prepare-manager.sh first.' >&2; exit 1; }
release=$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)
archive=$(mktemp /tmp/ezio-manager-release.XXXXXX.tar.gz)
trap 'rm -f "$archive"' EXIT
tar --exclude='.env*' --exclude='manager_data' --exclude='./posts' --exclude='./chatters' --exclude='./moments' \
    -czf "$archive" -C my-blog-manager/.next/standalone .
ssh shanghai 'mkdir -p "$HOME/apps/ezio-blog/manager-releases" "$HOME/apps/ezio-blog/runtime"'
scp -q "$(readlink -f "$(command -v node)")" "shanghai:apps/ezio-blog/runtime/manager-node-$release"
scp -q "$archive" "shanghai:apps/ezio-blog/manager-releases/$release.tar.gz"
ssh shanghai bash -s -- "$release" <<'REMOTE'
set -euo pipefail
release=$1
root="$HOME/apps/ezio-blog"
test -d "$root/content/posts"
test -x "$root/manager-venv/bin/python"
mkdir "$root/manager-releases/$release"
tar -xzf "$root/manager-releases/$release.tar.gz" -C "$root/manager-releases/$release"
chmod 700 "$root/runtime/manager-node-$release"
"$root/manager-venv/bin/python" -m pip install --no-index --find-links "$root/manager-wheels" -r "$root/manager-releases/$release/requirements-local.txt" > "$root/manager-releases/$release/pip-install.log" 2>&1
previous=$(readlink "$root/manager-current" || true)
if tmux has-session -t ezio-blog-manager 2>/dev/null; then
  test -f "$root/managed-manager" || { echo 'Unowned manager session; refusing to stop it.' >&2; exit 1; }
  # Ctrl+C reaches the Python supervisor, which stops both process groups.
  tmux send-keys -t ezio-blog-manager C-c
  for attempt in {1..80}; do
    if ! ss -ltnH | awk '{print $4}' | grep -Eq ':340[12]$'; then break; fi
    sleep 0.2
  done
fi
if ss -ltnH | awk '{print $4}' | grep -Eq ':340[12]$'; then
  echo 'An authoring port is occupied; no unrelated process was stopped.' >&2; exit 1
fi
if tmux has-session -t ezio-blog-manager 2>/dev/null; then tmux kill-session -t ezio-blog-manager; fi
ln -sfn "$root/manager-releases/$release" "$root/manager-current"
printf '%s\n' "$previous" > "$root/previous-manager-release"
printf '%s\n' "$release" > "$root/managed-manager"
tmux new-session -d -s ezio-blog-manager -c "$root/manager-current" "exec env EZIO_MANAGER_NODE='$root/runtime/manager-node-$release' '$root/manager-venv/bin/python' '$root/manager-current/server-manager.py' >> '$root/manager.log' 2>&1"
for attempt in {1..30}; do
  if curl --noproxy '*' -fsS http://127.0.0.1:3402/api/status -o /dev/null 2>/dev/null && \
     curl --noproxy '*' -fsS http://127.0.0.1:3401/drafts -o /dev/null 2>/dev/null; then
    printf 'Private manager ready. Use bash scripts/connect-manager.sh then http://127.0.0.1:3401\nRelease: %s\n' "$release"
    exit 0
  fi
  sleep 1
done
echo 'Manager health check failed; previous-manager-release retained.' >&2
exit 1
REMOTE
