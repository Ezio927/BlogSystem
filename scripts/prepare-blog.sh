#!/usr/bin/env bash
set -euo pipefail
project_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$project_root/XHBlogs"
if [[ ${1:-} != --no-build ]]; then npm run build; fi
test -f .next/standalone/server.js
mkdir -p .next/standalone/.next
cp -a .next/static .next/standalone/.next/
cp -a public/. .next/standalone/public/
for collection in posts chatters moments; do
  mkdir -p ".next/standalone/$collection"
  cp -a "$collection/." ".next/standalone/$collection/"
done
mkdir -p .next/standalone/app/about
cp app/about/about.md .next/standalone/app/about/about.md
cp "$project_root/LICENSE" .next/standalone/LICENSE
