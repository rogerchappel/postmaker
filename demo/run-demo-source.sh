#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

out_dir="${TMPDIR:-/tmp}/postmaker-demo-source"
rm -rf "$out_dir"
mkdir -p "$out_dir"

node bin/postmaker.js from-repo examples/demo-source \
  --platform linkedin \
  --platform x \
  --platform caption \
  --out "$out_dir"

node bin/postmaker.js check "$out_dir/post-pack.json" --source examples/demo-source

test -s "$out_dir/post-pack.json"
grep -q '"platform": "linkedin"' "$out_dir/post-pack.json"
grep -q '"status": "sourced"' "$out_dir/post-pack.json"

echo "Generated post pack: $out_dir/post-pack.json"
