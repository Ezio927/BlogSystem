#!/usr/bin/env bash
# An independent temporary HTTPS hostname; never exposes the writing manager.
set -euo pipefail
ssh shanghai bash -s <<'REMOTE'
set -euo pipefail
root="$HOME/apps/ezio-blog"
binary="$root/runtime/cloudflared-2026.11.0"
address=$(tailscale ip -4)
test -x "$binary" || { echo 'Install the verified cloudflared binary documented in docs/public-preview.md first.' >&2; exit 1; }
curl --noproxy '*' -fsS "http://$address:3400/" -o /dev/null
if ! tmux has-session -t ezio-blog-public-tunnel 2>/dev/null; then
  if [[ -f "$root/public-tunnel.log" ]]; then
    cp "$root/public-tunnel.log" "$root/public-tunnel.previous.log"
  fi
  : > "$root/public-tunnel.log"
  tmux new-session -d -s ezio-blog-public-tunnel -c "$root" \
    "exec '$binary' tunnel --config /dev/null --no-autoupdate --protocol http2 --edge-ip-version 4 --metrics 127.0.0.1:0 --url http://$address:3400 > '$root/public-tunnel.log' 2>&1"
fi
for attempt in {1..30}; do
  if grep -q 'Registered tunnel connection' "$root/public-tunnel.log"; then
    grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "$root/public-tunnel.log" | head -1
    exit 0
  fi
  sleep 1
done
echo 'Tunnel did not become ready; inspect ~/apps/ezio-blog/public-tunnel.log. No other service was changed.' >&2
exit 1
REMOTE
