#!/usr/bin/env bash
# Creates babysteps-hostinger.zip for Hostinger → Websites → Web Apps (Node.js) → upload.
# Includes the pre-built website (dist/) so it works even if the host skips the build step.
# Excludes dependencies, secrets and local uploads.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="babysteps-hostinger.zip"
rm -f "$OUT"
npm run build >/dev/null   # fresh build of the website into dist/
zip -rq "$OUT" . \
  -x "node_modules/*" "server/node_modules/*" ".env" "server/.env" "*.env.local" \
     "server/uploads/*" "babysteps-hostinger.zip" ".DS_Store" "*/.DS_Store" "public/_*"
echo "✅ Created $(pwd)/$OUT ($(du -h "$OUT" | cut -f1))"
