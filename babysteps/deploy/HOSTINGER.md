# Deploy BabySteps on your Hostinger Business plan (Node.js Web App)

Goes live first on **new.babystepsbyguide.com** — your current site keeps running until you switch.
Hostinger's menu labels can differ slightly; the steps stay the same.

## 1. Free database — MongoDB Atlas (10 min, one time)
1. Sign up at **mongodb.com/cloud/atlas** → **Create** a cluster → choose **M0 Free** → region **Mumbai (ap-south-1)**.
2. **Database Access** → *Add New Database User* → username `babysteps`, a strong password (letters + numbers is
   easiest — avoid `@ : / ?`) → role *Read and write to any database*.
3. **Network Access** → *Add IP Address* → **Allow access from anywhere** (`0.0.0.0/0`).
   Hostinger web apps don't have a fixed IP; access is still protected by the username/password.
4. **Database → Connect → Drivers** → copy the connection string and add the database name `babysteps`:
   ```
   mongodb+srv://babysteps:<PASSWORD>@cluster0.xxxxx.mongodb.net/babysteps?retryWrites=true&w=majority
   ```

## 2. Make the upload package (on your Mac)
```bash
cd "/Users/alokkushwaha/Desktop/photograper /babysteps"
npm run package
```
Creates **`babysteps-hostinger.zip`** (no secrets or dependencies inside).

## 3. Create the web app in Hostinger
hPanel → **Websites → Web Apps** (Node.js) → **Create / Add web app** → **Upload files** → choose the zip.

| Setting | Value |
|---|---|
| Domain | **new.babystepsbyguide.com** (create the subdomain if asked) |
| Framework / preset | Express (or "Other") |
| Node.js version | **22** (Vite 7 needs Node 20.19+; 22 is safest) |
| Install | npm (detected from `package-lock.json`) |
| Build command | runs `npm run build` automatically |
| Entry file | `server/start.cjs` |

**Environment variables** (add each one):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | your Atlas connection string from step 1 |
| `JWT_SECRET` | a long random string (keep it secret, never change it later) |
| `ADMIN_EMAIL` | `admin@babystepsbyguide.com` (or your email) |
| `ADMIN_PASSWORD` | the password you'll use for /admin |
| `UPLOAD_STORAGE` | `mongo` |
| `GALLERY_FREE_DAYS` | `90` |

**Optional extras** (add any time → Apply → restart):

| Key | Value | Turns on |
|---|---|---|
| `SITE_URL` | `https://new.babystepsbyguide.com` (later the main domain) | Correct links in share previews & sitemap |
| `BREVO_API_KEY` | your Brevo SMTP key (`xsmtpsib-…`) or API key (`xkeysib-…`) | Email alert for every new enquiry |
| `BREVO_SMTP_LOGIN` | Brevo → SMTP & API → SMTP tab (only for `xsmtpsib-` keys) | |
| `EMAIL_FROM` | a sender verified in Brevo → Senders | |
| `NOTIFY_EMAIL` | where alerts go (optional, defaults to `EMAIL_FROM`) | |
| `STORAGE_BUCKET` | `aaspaas-uploads` | Client-gallery photos upload straight to Cloudflare R2 (recommended — README → "Client gallery storage") |
| `STORAGE_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` | |
| `STORAGE_REGION` | `auto` | |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | R2 API token with *Object Read & Write* | |
| `STORAGE_PREFIX` | `babysteps-galleries` | |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay → API keys (`rzp_live_…` for real payments) | Online gift-card payments (GST & platform fee: Admin → Gift cards) |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay → Webhooks → `https://<domain>/api/payments/webhook`, events `payment.captured`, `order.paid` | Card still created if the buyer closes the tab mid-payment |

R2 also needs a **CORS rule** on the bucket allowing `PUT` and `GET` from your site's domain (README → "Client gallery
storage"); without it the browser blocks photo uploads from the admin.

In Brevo → **Security → Authorized IPs**, turn **off** IP blocking — Hostinger's sending IPs change, so blocked IPs
would stop every alert ("525 Unauthorized IP address"). Then use **Admin → Enquiries → Send test email**.
(Alternatives: `RESEND_API_KEY`, or a Hostinger mailbox via `SMTP_HOST=smtp.hostinger.com`, `SMTP_PORT=465`,
`SMTP_USER`, `SMTP_PASS`.)
| `ANTHROPIC_API_KEY` | from console.anthropic.com → API keys | ✨ Write with AI in the blog editor |

Click **Deploy**. When it finishes, **Runtime logs** should show `Admin account ready` and `BabySteps server on …`.

## 4. Check it
- **https://new.babystepsbyguide.com** — the website
- **/admin** — sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- Create a test client gallery, upload a photo, open it at **/client**.

Not loading? Open **Runtime logs** — usually a typo in `MONGO_URI`, Atlas Network Access not set to anywhere, or a
missing variable.

## Updating the site later
Change code → `npm run package` → in the web app click **Redeploy / Upload new files** with the new zip.
Your content, blog posts, client galleries and uploaded photos live in the database, so redeploys never touch them.
To change the admin password: edit `ADMIN_PASSWORD` in Environment variables → **Apply** → restart.

## Going live on babystepsbyguide.com
⚠️ This replaces the current AI Builder (Horizons) site, and its client galleries / gift cards are **not** copied.
Re-create any active client galleries in the new admin first. Then in the web app's settings, connect the main domain
**babystepsbyguide.com** (Hostinger will move it off the AI Builder site and issue SSL). Keep `new.` as a backup.

## Good to know
- **Search engines:** once live, submit `https://<your-domain>/sitemap.xml` in Google Search Console.
- **Backups:** Admin → Backup & storage → download the data backup and photos zip every month.
- Uploaded photos are stored in the database (Atlas free tier = 512 MB). That's plenty for website images; for big
  client galleries use **Google Drive links** in the gallery admin (paste a shared folder link) to save space.
- Atlas takes automatic snapshots on paid tiers only — export important galleries occasionally, or upgrade later.
