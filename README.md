# Guide Photo Studio — MERN website

Portfolio, booking and client-proofing site for **Guide Photo Studio, Noida**.
Built with **MongoDB · Express 5 · React 18 (Vite) · Node.js**.

The UI uses the *Profile Card* Figma design (stacked + frosted-overlay card variants, verified badge, pill button)
re-themed to the studio logo: black / white with **#CF0000** red, Poppins + Inter.

## Quick start

```bash
# prerequisites: Node 20+, MongoDB running locally (brew services start mongodb-community)
npm install && npm run install:all
cp server/.env.example server/.env      # then set JWT_SECRET and ADMIN_PASSWORD
npm run seed                             # loads portfolio, packages, FAQs, demo gallery, admin user
npm run dev                              # API → http://127.0.0.1:5050, site → http://localhost:5173
```

Production: `npm run build && npm start` (Express serves `client/dist` and the API on one port;
set `HOST=0.0.0.0`, `MONGO_URI` (e.g. Atlas) and `CLIENT_ORIGIN` in the environment).

> Port 5000 is avoided on purpose — macOS uses it for AirPlay Receiver.

## Pages

| Route | What it does |
|---|---|
| `/` | Hero slideshow, portfolio cards, photographers, featured gallery, film, prices, enquiry form |
| `/portfolio`, `/portfolio/:slug` | Collections (Weddings, Pre-Wedding, Maternity, Baby, Birthday, Head Shots) with lightbox |
| `/films` | Click-to-load YouTube wedding films |
| `/services` | Packages with starting prices, 5-step process, FAQ |
| `/about` | Story, team cards, studio interior photos, Google map |
| `/contact` | Enquiry form (date, type, budget, venue) + call / WhatsApp / email / Instagram |
| `/client` → `/client/:slug` | Password-protected client gallery: favourite photos, album-pick limit, submit selection, download |
| `/admin` | Enquiries (status pipeline), client galleries (create / re-open / delete), testimonials |

Demo client gallery: name `demo-wedding`, password `guide2026`.

## API

Public: `GET /api/categories`, `/api/categories/:slug`, `/api/featured`, `/api/packages`, `/api/testimonials`, `/api/faqs`,
`POST /api/inquiries` (validated, rate-limited, honeypot).
Client: `POST /api/client-galleries/:slug/login`, `GET /:slug`, `PATCH /:slug/photos/:id`, `POST /:slug/submit` (JWT).
Admin (JWT): `/api/admin/login`, `/inquiries`, `/testimonials`, `/packages/:id`, `/categories/:slug/images`, `/client-galleries`.

## Client gallery hosting subscription

* Every new gallery is **free for `GALLERY_FREE_DAYS` (default 90)** — set per gallery in Admin.
* After that the gallery **locks**: the client can still sign in but sees a paywall with the plans
  (seeded: Monthly ₹299, Yearly ₹2,499 — placeholders, edit in **Admin → Hosting plans**).
* Subscribing during the free period sets up the mandate now; **the first charge happens when the free period ends**.
* Payments use **Razorpay Subscriptions** (UPI AutoPay, cards, netbanking). Checkout signature is verified server-side,
  and renewals arrive via webhook and extend access each cycle. Cancelling stops renewal; access lasts to the end of the paid period.
* Admin can **extend access manually** (e.g. cash payment) and sees each gallery's hosting status.

Setup:
1. Razorpay Dashboard → API Keys → put `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in `server/.env` (use test keys first).
2. Dashboard → Webhooks → URL `https://<domain>/api/webhooks/razorpay`, secret = `RAZORPAY_WEBHOOK_SECRET`,
   events `subscription.*` (authenticated, activated, charged, pending, halted, cancelled, completed).
3. Razorpay plans are created automatically on first subscribe (and re-created when you change a price).

Without keys, development runs in **test payment mode** (a "Simulate payment" dialog); in production without keys,
subscribing is disabled. Demo: gallery `demo-expired` / `guide2026` shows the paywall.

> Photos are served from public URLs, so locking hides them in the app but doesn't make the files private.
> For real protection, move client photos to private storage (S3 / Cloudinary) with short-lived signed URLs.

## CMS (Admin → Content)

Everything on the site is editable at **/admin** — no code changes needed:

| Section | What you can do |
|---|---|
| Site settings | Studio name, tagline, phone/WhatsApp/email, hours, address, map, social links, Home hero text + slideshow, team members, studio photos, menu promo card |
| Media library | Drag-and-drop upload (JPG/PNG/WebP/GIF/AVIF, 20 MB), add image by URL, search, alt text, copy link, delete |
| Portfolio | Add/rename/reorder categories, set cover; per category add photos from the library, drag to reorder, ★ feature, alt text, remove |
| Films | Paste any YouTube link; title, venue, blurb, tags, poster, background-preview timing; show/hide; reorder |
| Reels | Paste a Shorts link — the vertical thumbnail is fetched automatically; label, custom cover, show/hide, reorder |
| Packages · FAQs · Careers · Testimonials | Full add / edit / reorder / delete |

**Google Drive photos:** in a client gallery, a portfolio category or the media library, use **Import from Google Drive**
and paste Drive photo links (one per line). Links are converted to direct image URLs automatically. Share the files as
*Anyone with the link can view*. To import a whole **folder** at once, add `GOOGLE_API_KEY` (Google Cloud → APIs &
Services → enable *Google Drive API* → Credentials → API key) to `server/.env` and restart the API.

**Awards:** Admin → **Awards** (award, awarded by, year, label such as Winner/Finalist, optional badge image and link).
The "Awards & recognition" section shows on the Home and Our Studio pages only when at least one award is live.

**Client films (videos):** in a client gallery's admin page, the **Films** panel takes Google Drive video links, a Drive
folder link (adds every video inside), YouTube links (unlisted works) or direct `.mp4/.webm/.mov` URLs. Videos stream
from Drive's own player — nothing is uploaded to this server, so there's no size limit. Clients see a "Your films"
section above their photos; the download button follows the gallery's *allow download* setting (not for YouTube).
API: `POST/PATCH/DELETE /api/admin/client-galleries/:slug/videos[/:id]`, `PUT …/videos/order`.

Uploads are stored in `server/uploads/` and served at `/uploads/…` — on a production host, put this folder on a
persistent disk (or swap the storage for S3/Cloudinary). `npm run seed` no longer overwrites CMS edits;
use `npm run seed -- --reset` to restore the original content.

## Editing content

* Studio details (phone, address, hero slides, team, films): `client/src/site.js`
* Portfolio, prices, FAQs: `server/src/seed/seed.js` → `npm run seed`
* Images live in `client/public/images/` (downloaded from guidephotostudio.com)

## Before going live

* Replace the team-card images in `site.js` with real portraits of Sandeep and Sarthak.
* Confirm +91 92051 28749 is on WhatsApp, and re-check the prices (taken from the current site FAQ).
* Add real testimonials from the admin panel (none were published on the old site).
* Photo uploads currently use URLs; for large client deliveries, add Cloudinary / S3 upload.
