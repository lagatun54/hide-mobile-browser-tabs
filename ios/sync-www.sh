#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WWW="$ROOT/ios/FullscreenShell/FullscreenShell/www"
mkdir -p "$WWW"
rm -rf "${WWW:?}/"*
if [[ ! -d "$ROOT/dist" ]] || [[ ! -f "$ROOT/dist/app.html" ]]; then
  echo "dist/ нет или нет dist/app.html — сначала: npm run build" >&2
  exit 1
fi
cp -R "$ROOT/dist/"* "$WWW/"
echo "Скопировано в $WWW"
