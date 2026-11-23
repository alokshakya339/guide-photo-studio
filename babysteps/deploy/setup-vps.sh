#!/usr/bin/env bash
# One-time setup of a fresh Hostinger VPS (Ubuntu 22.04 / 24.04) for BabySteps.
# From your Mac (in babysteps/):
#   scp deploy/*.sh root@<VPS-IP>:/root/
#   ssh root@<VPS-IP> 'bash /root/setup-vps.sh new.babystepsbyguide.com'
# Installs Node.js 20, MongoDB 8, Nginx, PM2, firewall, Certbot, daily backups; writes server/.env.
set -euo pipefail
DOMAIN="${1:-new.babystepsbyguide.com}"
APP=/var/www/babysteps
export DEBIAN_FRONTEND=noninteractive

echo "==> System packages"
apt-get update -y && apt-get upgrade -y
apt-get install -y curl gnupg ca-certificates lsb-release nginx ufw rsync certbot python3-certbot-nginx

echo "==> Node.js 20 + PM2"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
npm install -g pm2

echo "==> MongoDB 8 (local only, bound to 127.0.0.1)"
if ! command -v mongod >/dev/null; then
  curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/8.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-8.0.list
  apt-get update -y && apt-get install -y mongodb-org
fi
systemctl enable --now mongod

echo "==> App user and folders"
id -u babysteps >/dev/null 2>&1 || adduser --disabled-password --gecos "" babysteps
mkdir -p "$APP/server/uploads" "$APP/dist"
if [ ! -f "$APP/server/.env" ]; then
  ADMIN_PW="baby-$(openssl rand -hex 5)"
  cat > "$APP/server/.env" <<ENV
NODE_ENV=production
HOST=127.0.0.1
PORT=5060
MONGO_URI=mongodb://127.0.0.1:27017/babysteps
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_EMAIL=admin@babystepsbyguide.com
ADMIN_PASSWORD=$ADMIN_PW
CLIENT_ORIGIN=https://$DOMAIN
GALLERY_FREE_DAYS=90
GOOGLE_API_KEY=
ENV
  chmod 600 "$APP/server/.env"
  echo ""
  echo "  ┌──────────────────────────────────────────────────────────┐"
  echo "  │ Admin login:  admin@babystepsbyguide.com                 │"
  echo "  │ Password:     $ADMIN_PW                         │"
  echo "  │ (stored in $APP/server/.env — change it there anytime)  │"
  echo "  └──────────────────────────────────────────────────────────┘"
  echo ""
fi
chown -R babysteps:babysteps "$APP"

echo "==> Nginx for $DOMAIN"
bash -s -- "$DOMAIN" <<'NGINX'
DOMAINS="$*"
cat > /etc/nginx/sites-available/babysteps <<CONF
server {
    listen 80;
    server_name $DOMAINS;
    client_max_body_size 30m;            # photo uploads (up to 20 MB each)
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    location / {
        proxy_pass http://127.0.0.1:5060;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
CONF
ln -sf /etc/nginx/sites-available/babysteps /etc/nginx/sites-enabled/babysteps
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
NGINX

echo "==> Firewall (SSH + web only; MongoDB stays private)"
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable

echo "==> PM2 starts on boot"
env PATH="$PATH:/usr/bin" pm2 startup systemd -u babysteps --hp /home/babysteps >/dev/null

echo "==> Daily backups at 03:00 (database + uploads, kept 14 days) → /var/backups/babysteps"
mkdir -p /var/backups/babysteps
cat > /etc/cron.daily/babysteps-backup <<'CRON'
#!/bin/sh
D=/var/backups/babysteps; T=$(date +%F)
mongodump --quiet --db babysteps --archive="$D/db-$T.gz" --gzip
tar -czf "$D/uploads-$T.tgz" -C /var/www/babysteps/server uploads
find "$D" -type f -mtime +14 -delete
CRON
chmod +x /etc/cron.daily/babysteps-backup

echo ""
echo "✅ VPS ready. Next (from your Mac):  DEPLOY_HOST=root@<VPS-IP> npm run deploy"
echo "   Then point DNS for $DOMAIN to this server and run (on the VPS):"
echo "     certbot --nginx --agree-tos --register-unsafely-without-email -d $DOMAIN"
