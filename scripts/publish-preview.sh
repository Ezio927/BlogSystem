#!/usr/bin/env bash
# Deploy this app only, behind the existing Nginx /blog/ route.
set -euo pipefail
project_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$project_root"
test -f XHBlogs/.next/standalone/server.js || { echo 'Run bash scripts/prepare-blog.sh first.' >&2; exit 1; }
release=$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)
archive=$(mktemp /tmp/ezio-blog-release.XXXXXX.tar.gz)
trap 'rm -f "$archive"' EXIT
tar -czf "$archive" -C XHBlogs/.next/standalone .
ssh shanghai 'mkdir -p "$HOME/apps/ezio-blog/releases" "$HOME/apps/ezio-blog/runtime"'
# Use the already validated Linux Node runtime, isolated from the server's system Node.
scp -q "$(readlink -f "$(command -v node)")" "shanghai:apps/ezio-blog/runtime/node-$release"
scp -q "$archive" "shanghai:apps/ezio-blog/releases/$release.tar.gz"
ssh shanghai bash -s -- "$release" <<'REMOTE'
set -euo pipefail
release=$1
root="$HOME/apps/ezio-blog"
address=$(tailscale ip -4)
[[ $address == 100.* ]] || { echo 'Expected private Tailscale address' >&2; exit 1; }
mkdir "$root/releases/$release"
tar -xzf "$root/releases/$release.tar.gz" -C "$root/releases/$release"
chmod 700 "$root/runtime/node-$release"
"$root/runtime/node-$release" --version
previous=$(readlink "$root/current" || true)
# Never stop or replace another project's service.
if tmux has-session -t ezio-blog-preview 2>/dev/null; then
  test -f "$root/managed-preview" || { echo 'Unowned tmux session; refusing to replace' >&2; exit 1; }
  tmux kill-session -t ezio-blog-preview
  # Next.js exits gracefully; wait for its listener instead of racing shutdown.
  for attempt in {1..50}; do
    if ! ss -ltnH | awk '{print $4}' | grep -q ':3400$'; then break; fi
    sleep 0.2
  done
fi
if ss -ltnH | awk '{print $4}' | grep -q ':3400$'; then
  echo 'Port 3400 already occupied; no unrelated process was stopped.' >&2; exit 1
fi
ln -sfn "$root/releases/$release" "$root/current"
printf '%s\n' "$previous" > "$root/previous-release"
printf '%s\n' "$release" > "$root/managed-preview"
tmux new-session -d -s ezio-blog-preview -c "$root/current" "exec env HOSTNAME=$address PORT=3400 '$root/runtime/node-$release' --env-file-if-exists='$root/private/chat.env' '$root/current/server.js' >> '$root/preview.log' 2>&1"
for attempt in {1..20}; do
  if curl --noproxy '*' -fsS "http://$address:3400/blog" -o /dev/null 2>/dev/null; then
    printf 'Blog origin: http://%s:3400/blog\nPublic URL: https://47.101.37.232/blog\nRelease: %s\n' "$address" "$release"
    exit 0
  fi
  sleep 1
done
echo 'Preview health check failed; previous-release retained for rollback.' >&2
exit 1
REMOTE
