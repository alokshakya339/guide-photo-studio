#!/usr/bin/env bash
# Build on your Mac and publish to the VPS. Safe to run for every update.
#   DEPLOY_HOST=root@<VPS-IP> npm run deploy
# Never overwrites the server's .env or uploaded photos.
set -euo pipefail
: "${DEPLOY_HOST:?Set DEPLOY_HOST, e.g. DEPLOY_HOST=root@123.45.67.89 npm run deploy}"
APP=/var/www/babysteps
cd "$(dirname "$0")/.."

echo "==> Building website"
npm run build

echo "==> Uploading to $DEPLOY_HOST"
rsync -az --delete dist/ "$DEPLOY_HOST:$APP/dist/"
rsync -az --delete --exclude node_modules --exclude .env --exclude 'uploads/' --exclude '.gitignore' server/ "$DEPLOY_HOST:$APP/server/"

echo "==> Installing & restarting on the server"
ssh "$DEPLOY_HOST" "chown -R babysteps:babysteps $APP && sudo -u babysteps -H bash -lc '
  cd $APP/server &&
  npm ci --omit=dev --no-audit --no-fund &&
  npm run seed &&
  (pm2 describe babysteps >/dev/null 2>&1 && pm2 reload ecosystem.config.cjs --env production || pm2 start ecosystem.config.cjs --env production) &&
  pm2 save
'"

echo "==> Health check"
ssh "$DEPLOY_HOST" "sleep 2; curl -fsS http://127.0.0.1:5060/api/health && echo"
echo "✅ Deployed."
