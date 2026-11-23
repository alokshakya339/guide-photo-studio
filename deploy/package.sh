#!/usr/bin/env bash
# Builds guide-photo-studio-hostinger.zip for Hostinger → Websites → Web Apps (Node.js) → upload.
#   - fresh production build of the website (client/dist) is included, so the host needn't build it
#   - one package.json at the root with the server's dependencies (+ lock file), entry file server/start.cjs
#   - excludes node_modules, .env files (secrets) and anything not needed to run
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
OUT="$ROOT/guide-photo-studio-hostinger.zip"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

echo "• Building the website…"
npm run build --prefix client >/dev/null

echo "• Staging files…"
mkdir -p "$STAGE/client" "$STAGE/server"
cp -R client/dist "$STAGE/client/dist"
cp -R server/src "$STAGE/server/src"
cp server/start.cjs server/package.json "$STAGE/server/"
mkdir -p "$STAGE/server/uploads"
# Media uploaded before cloud storage was set up (small). New uploads go to Cloudflare R2.
[ -d server/uploads ] && cp -R server/uploads/. "$STAGE/server/uploads/" || true
cp server/.env.example "$STAGE/server/.env.example"

node -e '
  const s = require("./server/package.json");
  const pkg = {
    name: "guide-photo-studio", version: s.version || "1.0.0", private: true,
    description: "Guide Photo Studio website + API (Express serves client/dist and /api on one port)",
    main: "server/start.cjs",
    scripts: { start: "node server/start.cjs", build: "echo \"Website is pre-built (client/dist)\"", "db:copy": "node server/src/seed/copy-db.js", "seed:invite-demos": "node server/src/seed/invite-demos.js", "seed:music": "node server/src/seed/music.js" },
    engines: { node: ">=20" },
    dependencies: s.dependencies,
  };
  require("fs").writeFileSync(process.argv[1] + "/package.json", JSON.stringify(pkg, null, 2) + "\n");
' "$STAGE"

echo "• Locking dependency versions…"
(cd "$STAGE" && npm install --package-lock-only --ignore-scripts --no-audit --no-fund >/dev/null)

rm -f "$OUT"
(cd "$STAGE" && zip -rq "$OUT" . -x "*.DS_Store" "*/.env" ".env")
echo "✅ Created $OUT ($(du -h "$OUT" | cut -f1))"
