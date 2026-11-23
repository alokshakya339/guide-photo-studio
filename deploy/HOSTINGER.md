# Deploy Guide Photo Studio on Hostinger (Node.js Web App)

Same recipe as BabySteps: one zip, a free MongoDB Atlas database, and environment variables in hPanel.
Go live first on a test address (e.g. **new.guidephotostudio.com**) and switch the main domain once you've checked it.

## 1. Database — MongoDB Atlas (free, one time)
Use the same Atlas account as BabySteps (a separate database name keeps the two apart).
1. Atlas → your cluster → **Database Access** → *Add New Database User* → e.g. `guide`, a strong password using only
   letters and numbers → role *Read and write to any database*.
2. **Network Access** → make sure `0.0.0.0/0` (*Allow access from anywhere*) is listed.
3. **Connect → Drivers** → copy the connection string and put the database name `guide-photo-studio` in it:
   ```
   mongodb+srv://guide:<PASSWORD>@cluster0.xxxxx.mongodb.net/guide-photo-studio?retryWrites=true&w=majority
   ```

## 2. Copy your content into Atlas (from this computer)
Your portfolio, packages, testimonials, site settings, invitations, gift cards and customer accounts are in the
local database. Copy them across once (nothing is deleted locally):
```bash
cd "photograper /server"
SOURCE_URI="mongodb://127.0.0.1:27017/guide-photo-studio" \
TARGET_URI="<your Atlas connection string from step 1>" \
npm run db:copy
```
It stops without changing anything if the Atlas database already has data; add `-- --replace` to overwrite.
(Prefer a clean start instead? Skip this step; the site starts empty and you fill it in from /admin.)

## 3. Make the upload package
```bash
cd "photograper "
npm run package
```
Creates **`guide-photo-studio-hostinger.zip`** — the built website + server. No secrets or `node_modules` inside.

## 4. Create the web app in Hostinger
hPanel → **Websites → Web Apps** (Node.js) → **Add web app** → **Upload files** → choose the zip.

| Setting | Value |
|---|---|
| Domain | **new.guidephotostudio.com** (create the subdomain if asked) |
| Framework / preset | Express (or "Other") |
| Node.js version | **22** (20 also works) |
| Install | npm (uses `package-lock.json`) |
| Build command | leave the default — the website is already built |
| Entry file | `server/start.cjs` |

**Environment variables** (required):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | the Atlas connection string from step 1 |
| `JWT_SECRET` | a long random string (40+ characters). Keep it secret and never change it — changing it signs everyone out |
| `ADMIN_EMAIL` | the email you log in to /admin with |
| `ADMIN_PASSWORD` | your admin password (change it here + restart to reset it) |
| `SITE_URL` | `https://new.guidephotostudio.com` (later `https://guidephotostudio.com`) |
| `CLIENT_ORIGIN` | the same address as `SITE_URL` |

**Strongly recommended:**

| Key | Value | Why |
|---|---|---|
| `STORAGE_BUCKET`, `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_PUBLIC_URL`, `STORAGE_PREFIX` | copy from `server/.env` (Cloudflare R2) | Photos uploaded in admin (media library, invitations) are stored in R2. **Without it, uploads are saved on the server and are lost on every redeploy.** |
| `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `NOTIFY_EMAIL` | copy from `server/.env` | Enquiry alerts, gift-card emails, account emails (confirm email, reset password) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | your **live** keys (`rzp_live_…`) | Online gift-card payments. Test keys (`rzp_test_…`) only accept test cards |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay → Webhooks → URL `https://<your domain>/api/gift-cards/webhook`, events `payment.captured`, `order.paid` | Gift cards and invitation purchases still complete if the buyer closes the tab mid-payment |
| `GALLERY_FREE_DAYS` | e.g. `90` | Free period for client galleries |
| `GOOGLE_API_KEY` | optional | Google Drive folder import in admin |

`TRUST_PROXY` can stay unset (it defaults to 1 in production, which is right behind Hostinger's proxy).

In Brevo → **Security → Authorized IPs**, turn IP blocking **off** (Hostinger's sending IPs change).
In Cloudflare R2, the bucket's **CORS** must allow your new domain.

Click **Deploy**. **Runtime logs** should show `[admin] Admin account ready` (first start) and `API listening`.

## 5. Check it
- The site loads at your address; Portfolio, Services, Gift cards, Invites open.
- **/admin** — log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`; upload a test photo in the Media library — its link
  should start with your R2 address, not `/uploads/`.
- **/account/register** — create an account; the confirmation email arrives.
- Gift card: with live keys, a ₹500 real purchase (refund it in Razorpay) confirms payments end to end.
- Demo invitations for the /invites page: run once on this computer with the Atlas address
  `MONGO_URI="<Atlas URI>" npm run seed:invite-demos --prefix "photograper /server"` (skip if you copied the database).
- Music library (6 public-domain tracks for invitations, files already in R2): run once the same way —
  `MONGO_URI="<Atlas URI>" npm run seed:music --prefix "photograper /server"`. It only fills an empty library
  (skip if you copied the database). Add your own tracks any time in **/admin → Music library**.

Not loading? Open **Runtime logs** — usually a typo in `MONGO_URI`, Atlas Network Access, or a missing variable.

## 6. Get found on Google (SEO)
Built in and automatic once `SITE_URL` is your real domain:
- **`https://<your domain>/robots.txt`** — lets Google crawl the site, keeps admin / accounts / client galleries out.
- **`https://<your domain>/sitemap.xml`** — every page and portfolio collection, with their photos; updates itself
  when you add or hide categories and photos in admin.
- Every page has its own title, description, canonical address, WhatsApp/Facebook preview and Google structured
  data (studio address & hours, FAQs on Services, breadcrumbs, photo galleries).

Then, once:
1. **Google Search Console** (search.google.com/search-console) → *Add property* → **Domain** → your domain →
   verify with the DNS TXT record it shows (hPanel → Domains → DNS / Nameservers → add TXT record).
2. Search Console → **Sitemaps** → enter `sitemap.xml` → Submit.
3. **Google Business Profile** for the studio: set the website to your domain (this matters most for "photographer
   near me" searches).
4. Optional: **Bing Webmaster Tools** → *Import from Google Search Console*.

## Updating the site later
Change code → `npm run package` → in the web app **Redeploy / Upload new files** with the new zip. Content lives
in the database and photos in R2, so redeploys don't touch them. One-off data changes (like hiding categories that
moved to BabySteps) run automatically on start-up, once.

## Switching guidephotostudio.com to the new site
When you're happy with the test address: in the web app add **guidephotostudio.com** (and `www`) as the domain,
update `SITE_URL` / `CLIENT_ORIGIN` to `https://guidephotostudio.com`, update the Razorpay webhook URL and R2 CORS,
then restart. Whatever currently runs on guidephotostudio.com is replaced — keep a copy of anything from it you need.
