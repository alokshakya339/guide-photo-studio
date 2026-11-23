# BabySteps Guide Studio — website, admin CMS & client galleries

Standalone project (independent of Guide Photo Studio): its own server, database and admin account.

```
babysteps/
├─ src/, public/, index.html   React 18 + Vite website (+ /admin CMS)
└─ server/                     Express 5 + MongoDB API — also serves the built website in production
```

## Run locally

```bash
cd babysteps
npm install                          # website + server dependencies (one install)
cp server/.env.example server/.env   # set JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD (admin is created on start)
npm run seed                         # admin account + demo galleries (never deletes content)
npm run dev:all                      # API → http://127.0.0.1:5060, site → http://localhost:5180 (also on your LAN)
```

MongoDB must be running (`brew services start mongodb-community`). Database: `babysteps`.

Demo client galleries (password `babysteps2026`): `baby-aarav` (active) and `baby-expired` (renewal screen).

## Pages

| Route | What it does |
|---|---|
| `/` | Hero banner, booking cards, sessions, studio experience, logo story, featured work, reels, pricing, reviews, blog |
| `/portfolio`, `/portfolio/:slug` | Collections + filterable gallery; one page per session |
| `/services` | Sessions, packages & add-ons, process, gift cards, FAQ |
| `/about` | Tanya & Sarthak, logo story, studio |
| `/blog`, `/blog/:slug` | Journal with categories, article pages, sharing, related posts |
| `/contact` | Booking form → WhatsApp, contact details, map |
| `/gift-cards` | Buy (WhatsApp) or check a gift card; valid codes pre-fill the booking form |
| `/client` → `/client/:slug` | Private client galleries: favourites, album picks, submit, download, films |
| `/admin` | CMS: hero, blog, client galleries, studio details, photos, sessions, packages, gallery, reels, reviews, FAQs |

## SEO
`/sitemap.xml` and `/robots.txt` are generated from live content; each page gets its own title, description and
share image server-side (`server/src/seo.js`). Set `SITE_URL` in production.

## Admin CMS (`/admin`)
Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `server/.env` (re-run `npm run seed` after changing them).
Content is stored in MongoDB (`settings` → key `babysteps`); sections you never edit keep the defaults in
`src/data.js`. Images: upload / drag-and-drop / paste an image or Google Drive link (saved to `server/uploads/`).

## Client gallery storage (Cloudflare R2)
With `STORAGE_*` set in `server/.env`, **Upload photos** in a client gallery sends files straight from the browser to
Cloudflare R2 — nothing large passes through the Node host, so a whole shoot uploads in one go. For every photo R2 keeps
the untouched original (for downloads), a 2400px web version (lightbox) and a 700px thumbnail (grid), under
`babysteps-galleries/<gallery>/`. The bucket can stay private: the site hands out signed links that expire after a day.
Deleting a photo or a gallery deletes its files. Without `STORAGE_*`, uploads fall back to MongoDB / disk.

**One-time bucket setup** — Cloudflare dashboard → R2 → bucket → Settings → **CORS policy** → add:
```json
[{ "AllowedOrigins": ["https://babystepsbyguide.com", "https://www.babystepsbyguide.com", "http://localhost:5180"],
   "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["content-type"], "MaxAgeSeconds": 3600 }]
```
Without it the browser blocks the upload ("upload blocked (check R2 CORS)"). The API token needs *Object Read & Write*.
Cost: 10 GB free, then about $0.015/GB-month; downloads by clients are free.

## Deploy

**Hostinger Business plan (Node.js Web App): follow [deploy/HOSTINGER.md](deploy/HOSTINGER.md)** — `npm run package` makes the upload zip.

**Hostinger VPS: follow [deploy/DEPLOY.md](deploy/DEPLOY.md)** — scripts set up the server (`deploy/setup-vps.sh`),
publish updates (`npm run deploy`) and switch domains (`deploy/switch-domain.sh`).

### Generic Node host (one app serves everything)

1. **Database** — create a free MongoDB Atlas cluster (or use your host's MongoDB) and copy the connection string.
2. **Server env** (`server/.env` on the host, or the host's environment settings):
   ```
   NODE_ENV=production
   HOST=0.0.0.0
   PORT=<host's port, often provided as PORT>
   MONGO_URI=<Atlas connection string>
   JWT_SECRET=<openssl rand -hex 32>
   ADMIN_EMAIL=...   ADMIN_PASSWORD=...
   ```
3. **Build & start**
   ```bash
   npm run setup && npm run build && npm run seed && npm start
   ```
   The server serves the website from `dist/`, the API under `/api`, and uploads under `/uploads` — all on one
   domain, so no CORS or `VITE_API_URL` is needed.
4. Point `babystepsbyguide.com` at the app (Hostinger Node.js app / VPS with Nginx reverse proxy, Render, Railway…).
   Keep `server/uploads/` on persistent storage so uploaded photos survive redeploys.

Splitting front and back (e.g. site on Netlify, API elsewhere)? Build with `VITE_API_URL=https://api.your-domain`,
add the site's origin to `CLIENT_ORIGIN`, and add an SPA rewrite (`public/.htaccess` covers Apache/Hostinger).

## Design
Brand: copper-rose `#A4664F`, blush/ivory backgrounds, cocoa `#4A3029`. Fonts: Cinzel (titles), Allura (script),
Cormorant Garamond (quotes), Montserrat (text). Styles: `src/brand.css` (+ `styles.css`, `theme.css`, `pages.css`).

## Server-side rendering & search (SSR / SEO / GEO)
- `npm run build` makes two bundles: `dist/` (browser) and `dist-ssr/` (server renderer). The server pre-renders every
  public page to full HTML and the browser hydrates it. Admin and client-gallery screens are browser-only.
  If the renderer is missing or a page errors, that page silently falls back to browser rendering. `SSR=off` disables it.
- Page titles/descriptions (keywords): `src/seoMeta.js`. JSON-LD, robots.txt, sitemap, `/llms.txt`: `server/src/seo.js`.
- Studio PIN code, map pin and opening hours: /admin → Studio details. Add extra profile links (Google Business Profile,
  Facebook, YouTube) as `STUDIO_SAMEAS=url1,url2` in the server env.
