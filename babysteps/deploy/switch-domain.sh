#!/usr/bin/env bash
# Move the live site to new domain(s) once you're happy with the subdomain.
#   ssh root@<VPS-IP> 'bash /root/switch-domain.sh babystepsbyguide.com www.babystepsbyguide.com'
# Point DNS (A records) for these names to the VPS first. Keeps the old subdomain working too.
set -euo pipefail
[ $# -ge 1 ] || { echo "Usage: switch-domain.sh domain [more domains…]"; exit 1; }
CURRENT=$(grep -m1 server_name /etc/nginx/sites-available/babysteps | sed 's/.*server_name //; s/;.*//')
ALL="$CURRENT $*"
sed -i "s/server_name .*;/server_name $ALL;/" /etc/nginx/sites-available/babysteps
nginx -t && systemctl reload nginx
sed -i "s|^CLIENT_ORIGIN=.*|CLIENT_ORIGIN=https://$1|" /var/www/babysteps/server/.env
sudo -u babysteps -H bash -lc 'pm2 reload babysteps --update-env' >/dev/null
CERT_ARGS=""; for d in $ALL; do CERT_ARGS="$CERT_ARGS -d $d"; done
certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email --expand $CERT_ARGS
echo "✅ Now live on: $ALL (HTTPS)"
