import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import publicRoutes from './routes/public.js';
import clientGalleryRoutes from './routes/clientGalleries.js';
import adminRoutes from './routes/admin.js';
import webhookRoutes from './routes/webhooks.js';
import cmsRoutes, { UPLOAD_DIR } from './routes/cms.js';
import { requireAdmin } from './middleware/auth.js';
import { paymentMode } from './payments/razorpay.js';
import { publicGiftRoutes, adminGiftRoutes, giftWebhook } from './routes/giftCards.js';
import { publicInviteRoutes, adminInviteRoutes, adminInvitePackageRoutes, inviteHtml } from './invites/routes.js';
import accountRoutes from './account/routes.js';
import { runMigrations } from './migrations.js';
import { seoRoutes, setInternalOrigin } from './seo.js';

const { PORT = 5050, MONGO_URI, JWT_SECRET, CLIENT_ORIGIN = 'http://localhost:5173', NODE_ENV } = process.env;

if (!MONGO_URI || !JWT_SECRET) {
  console.error('MONGO_URI and JWT_SECRET must be set (copy server/.env.example to server/.env)');
  process.exit(1);
}

const app = express();
// Behind Hostinger's proxy, req.ip must come from X-Forwarded-For so rate limits apply per visitor (TRUST_PROXY=hops).
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? (NODE_ENV === 'production' ? 1 : 0)));
// YouTube embeds now refuse to play without a Referer (Error 153 / "Video unavailable"), so don't use helmet's
// default "no-referrer". strict-origin-when-cross-origin sends only the site's origin to other sites.
// Razorpay Checkout opens popups on desktop (card OTP / net-banking / wallets); helmet's default COOP "same-origin" breaks them.
app.use(compression()); // gzip pages, scripts, styles and API JSON (photos are already compressed)
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, referrerPolicy: { policy: 'strict-origin-when-cross-origin' } }));
app.use(cors({ origin: CLIENT_ORIGIN.split(',') }));
app.use('/api/webhooks', webhookRoutes); // before express.json(): webhooks need the raw body
app.post('/api/gift-cards/webhook', ...giftWebhook);
app.use(express.json({ limit: '1mb' }));
if (NODE_ENV !== 'test') app.use(morgan('dev'));

// Uploaded media (images only; random filenames). Long cache: files never change once written.
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true, index: false, dotfiles: 'deny' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));
app.use('/api/gift-cards', publicGiftRoutes);
app.use('/api/invites', publicInviteRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/admin/invites/packages', adminInvitePackageRoutes);
app.use('/api/admin/invites', adminInviteRoutes);
app.use('/api/admin/gift-cards', adminGiftRoutes);
app.use('/api', publicRoutes);
app.use('/api/client-galleries', clientGalleryRoutes);
app.use('/api/admin/cms', requireAdmin, cmsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// In production, serve the built React app from the same server.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(clientDist)) {
  // The service worker must always be re-checked, or visitors could stay on an old version for days.
  app.get(['/sw.js', '/offline.html'], (req, res) => res.set('Cache-Control', 'no-cache').sendFile(path.join(clientDist, req.path)));
  // Vite's /assets files have a content hash in their name, so they can be cached for a year.
  app.use('/assets', express.static(path.join(clientDist, 'assets'), { maxAge: '365d', immutable: true, index: false, fallthrough: false }));
  app.use(express.static(clientDist, { maxAge: '7d', index: false }));
  app.get('/invite/:slug', inviteHtml(clientDist)); // couple's names + photo in WhatsApp previews
  // robots.txt, sitemap.xml, web manifest, and every page's own title / description / canonical / social tags.
  app.use(seoRoutes(clientDist));
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: err.message });
  res.status(500).json({ error: 'Something went wrong' });
});

mongoose
  .connect(MONGO_URI)
  .then(() => runMigrations().catch((e) => console.error('[migrate] failed:', e.message)))
  .then(() => {
    // Production (Hostinger) must accept connections from the host's front server, like BabySteps does.
    const host = process.env.HOST || (NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
    app.listen(PORT, host, (err) => {
      if (err) {
        console.error(`Could not start API on ${host}:${PORT}:`, err.message);
        process.exit(1);
      }
      console.log(`API listening on http://${host}:${PORT}`);
      // Private loopback listener for server-side rendering to call this API (see setInternalOrigin in seo.js).
      const internal = app.listen(0, '127.0.0.1', () => setInternalOrigin(`http://127.0.0.1:${internal.address().port}`));
      internal.on('error', (e) => console.error('[ssr] internal listener failed:', e.message));
      const mode = paymentMode();
      if (mode !== 'razorpay') console.warn(`Payments: ${mode === 'mock' ? 'TEST MODE (no Razorpay keys set)' : 'DISABLED (set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)'}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
