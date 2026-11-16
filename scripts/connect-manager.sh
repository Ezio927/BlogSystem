#!/usr/bin/env bash
# The existing shanghai SSH alias uses the private Tailscale address.
set -euo pipefail
printf 'Connecting to the private writing console: http://127.0.0.1:3401\nKeep this terminal open; Ctrl+C disconnects without stopping the server.\n'
exec ssh -N -T -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
  -L 127.0.0.1:3401:127.0.0.1:3401 \
  -L 127.0.0.1:3402:127.0.0.1:3402 shanghai
