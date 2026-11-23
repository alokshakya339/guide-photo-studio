# Deploying BabySteps to a Hostinger VPS

Goes live first on **new.babystepsbyguide.com** (your current site keeps running), then you switch the main domain.
All commands run **on your Mac**, inside the `babysteps` folder, unless marked *(on the VPS)*.

## 1. Get the VPS
- Hostinger → **VPS** → choose a plan (KVM 1 is enough to start) → OS template **Ubuntu 24.04** (plain, no panel).
- Note the **VPS IP address** and set a **root password** (or add your SSH key).
- Test: `ssh root@<VPS-IP>` (type `yes`, then the password). Type `exit` to leave.

## 2. Set up the server (once, ~5–10 min)
```bash
scp deploy/*.sh root@<VPS-IP>:/root/
ssh root@<VPS-IP> 'bash /root/setup-vps.sh new.babystepsbyguide.com'
```
At the end it prints your **admin email and password** — save them.
It installs Node.js 20, MongoDB 8 (private to the server), Nginx, PM2, the firewall, SSL tools and daily backups.

## 3. Publish the website
```bash
DEPLOY_HOST=root@<VPS-IP> npm run deploy
```
Builds the site, uploads it, installs, creates the admin account and starts it. Ends with `{"ok":true}` and `✅ Deployed.`
Run the same command after every change you make.

## 4. Point the subdomain to the VPS
Hostinger hPanel → **Domains → babystepsbyguide.com → DNS / Nameservers → DNS records** → add:

| Type | Name | Points to | TTL |
|---|---|---|---|
| A | `new` | `<VPS-IP>` | 300 |

Wait 5–30 minutes. Check: `ping new.babystepsbyguide.com` shows your VPS IP.

## 5. Turn on HTTPS
```bash
ssh root@<VPS-IP> 'certbot --nginx --agree-tos --register-unsafely-without-email -d new.babystepsbyguide.com'
```
Certificates renew automatically. Open **https://new.babystepsbyguide.com** — and **/admin** to sign in.

## 6. Go live on babystepsbyguide.com (when you're happy)
⚠️ This replaces the current Hostinger Horizons site. Its client galleries / gift cards are **not** copied over —
re-create any active client galleries in the new admin first.

1. hPanel DNS: change the **A record for `@`** to `<VPS-IP>`, and set **`www`** to an A record → `<VPS-IP>`
   (remove any Horizons/CNAME records for `@` and `www`). Wait until `ping babystepsbyguide.com` shows the VPS IP.
2. ```bash
   ssh root@<VPS-IP> 'bash /root/switch-domain.sh babystepsbyguide.com www.babystepsbyguide.com'
   ```
   Adds both names to Nginx and HTTPS. `new.` keeps working too.

## Everyday
| Task | Command |
|---|---|
| Publish changes | `DEPLOY_HOST=root@<VPS-IP> npm run deploy` |
| See live logs | `ssh root@<VPS-IP> 'sudo -u babysteps pm2 logs babysteps --lines 50'` |
| Restart | `ssh root@<VPS-IP> 'sudo -u babysteps pm2 reload babysteps'` |
| Change admin password | edit `ADMIN_PASSWORD` in `/var/www/babysteps/server/.env`, then deploy again |
| Add demo galleries | `ssh root@<VPS-IP> "sudo -u babysteps -H bash -lc 'cd /var/www/babysteps/server && npm run seed -- --demo'"` |
| Backups | daily at 03:00 in `/var/backups/babysteps` (database + uploaded photos, 14 days). Download: `scp -r root@<VPS-IP>:/var/backups/babysteps ./backups` |

Tip: save the IP once with `export DEPLOY_HOST=root@<VPS-IP>` (or add it to `~/.zshrc`), then just run `npm run deploy`.
