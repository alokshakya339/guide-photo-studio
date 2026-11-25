/**
 * BabySteps Guide Studio — API + website server.
 * Dev:  API on PORT (default 5060); the Vite dev server (5180) proxies /api and /uploads here.
 * Prod: NODE_ENV=production also serves the built website from ../dist on the same port.
 */
import './env.js'; // must stay first
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import compression from 'compression';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import clientGalleryRoutes from './routes/clientGalleries.js';
import { publicRouter as newsletterPublic, adminRouter as newsletterAdmin } from './routes/newsletter.js';
import { resumeBroadcasts } from './newsletter.js';
import cmsRoutes from './routes/cms.js';
import { serveUpload, storageMode } from './storage.js';
import aiRoutes from './routes/ai.js';
import paymentRoutes from './routes/payments.js';
import { htmlHandler, robots, sitemap, llms, llmsFull } from './seo.js';
import { requireAdmin } from './auth.js';
import bcrypt from 'bcryptjs';
import { Admin } from './models.js';

const { PORT = 5060, HOST = '0.0.0.0', MONGO_URI = 'mongodb://127.0.0.1:27017/babysteps', JWT_SECRET, CLIENT_ORIGIN = 'http://localhost:5180', NODE_ENV } = process.env;
if (!JWT_SECRET) console.error('⚠️  JWT_SECRET is not set — admin and client logins will fail until it is added.');
console.log(`Starting BabySteps (node ${process.version}, PORT=${PORT}, NODE_ENV=${NODE_ENV || 'development'}, MONGO_URI ${process.env.MONGO_URI ? 'set' : 'NOT set — using local default'})`);

const app = express();
app.set('trust proxy', 1); // behind Hostinger / Render / Nginx: correct client IPs for rate limiting

// One address for Google: send babystepsbyguide.com → www.babystepsbyguide.com (301, page visits only —
// API calls and payment webhooks are left alone so nothing posting to the bare domain breaks).
const CANONICAL_HOST = process.env.CANONICAL_HOST || (NODE_ENV === 'production' ? 'www.babystepsbyguide.com' : '');
if (CANONICAL_HOST) {
  const bare = CANONICAL_HOST.replace(/^www\./, '');
  app.use((req, res, next) => {
    if ((req.method === 'GET' || req.method === 'HEAD') && req.hostname === bare && !req.path.startsWith('/api')) {
      return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
    }
    next();
  });
}
// One address per page: /blog/ → /blog (301, page visits only; query string kept). Leading slashes are
// collapsed too, so "//evil.com/" can never become a redirect to another site.
app.use((req, res, next) => {
  if ((req.method === 'GET' || req.method === 'HEAD') && req.path.length > 1 && req.path.endsWith('/')
    && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    const i = req.originalUrl.indexOf('?');
    return res.redirect(301, `/${req.path.replace(/^\/+|\/+$/g, '')}${i >= 0 ? req.originalUrl.slice(i) : ''}`);
  }
  next();
});
// YouTube/Instagram embeds need a Referer, so use strict-origin-when-cross-origin instead of helmet's "no-referrer".
app.use(compression()); // gzip pages, scripts and styles (Hostinger may also compress; this is a safety net)
// Razorpay Checkout opens popups on desktop (card OTP / net-banking / wallets); helmet's default COOP "same-origin" breaks them.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, crossOriginResourcePolicy: { policy: 'cross-origin' }, referrerPolicy: { policy: 'strict-origin-when-cross-origin' } }));
app.use(cors({ origin: CLIENT_ORIGIN.split(',').map((s) => s.trim()) }));
app.use('/api/admin/restore', express.json({ limit: '50mb' })); // backup files can be large
app.use('/api/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' })); // Razorpay signs the raw body
app.use(express.json({ limit: '2mb' }));
if (NODE_ENV !== 'test') app.use(morgan(NODE_ENV === 'production' ? 'tiny' : 'dev'));

app.get('/uploads/:name', serveUpload);
app.get('/robots.txt', robots);
app.get('/sitemap.xml', sitemap);
app.get('/llms.txt', llms);
app.get('/llms-full.txt', llmsFull);
app.use('/api/payments', paymentRoutes);
app.use('/api/newsletter', newsletterPublic);
app.use('/api', publicRoutes);
app.use('/api/client-galleries', clientGalleryRoutes);
app.use('/api/admin/cms', requireAdmin, cmsRoutes);
app.use('/api/admin/ai', requireAdmin, aiRoutes);
app.use('/api/admin/newsletter', requireAdmin, newsletterAdmin);
app.use('/api/admin', adminRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Serve the built React site when it exists (production, or `npm run build` locally); other paths → index.html.
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');
if (fs.existsSync(path.join(dist, 'index.html'))) {
  // The service worker must always be re-checked, or visitors could stay on an old version for days.
  app.get(['/sw.js', '/offline.html', '/site.webmanifest'], (req, res) => res.set('Cache-Control', 'no-cache').sendFile(path.join(dist, req.path)));
  app.use(express.static(dist, { maxAge: '7d', index: false }));
  app.get(/^(?!\/api|\/uploads).*/, htmlHandler(dist)); // per-page title/description/share image
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: NODE_ENV === 'production' ? 'Something went wrong' : err.message });
});

/** The admin login always matches ADMIN_EMAIL / ADMIN_PASSWORD (so hosts without a shell need no seed step). */
async function ensureAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set — admin login unavailable');
  const email = ADMIN_EMAIL.toLowerCase();
  const existing = await Admin.findOne({ email });
  if (existing && await bcrypt.compare(ADMIN_PASSWORD, existing.passwordHash)) return;
  await Admin.findOneAndUpdate({ email }, { email, passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10) }, { upsert: true });
  console.log(`Admin account ready: ${email}`);
}

// Start serving immediately (the website works from its built-in content even before the database is ready),
// then connect to MongoDB and keep retrying — a slow or misconfigured database never takes the site down.
const onListen = () => console.log(`BabySteps server on ${/^\d+$/.test(String(PORT)) ? `http://${HOST}:${PORT}` : PORT} (${NODE_ENV || 'development'}, uploads: ${storageMode()})`);
// Hosts like Hostinger/LiteSpeed may pass a socket path instead of a port number: listen on it as-is.
if (/^\d+$/.test(String(PORT))) app.listen(Number(PORT), HOST, onListen); else app.listen(PORT, onListen);

async function connectDb(attempt = 1) {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    console.log('MongoDB connected');
    await ensureAdmin();
    resumeBroadcasts().catch((e) => console.error('Broadcast resume failed:', e.message));
  } catch (e) {
    console.error(`MongoDB connection failed (attempt ${attempt}): ${e.message.split('\n')[0]}`);
    console.error('  → Check MONGO_URI and that MongoDB Atlas → Network Access allows 0.0.0.0/0. Retrying in 20s…');
    setTimeout(() => connectDb(attempt + 1), 20000);
  }
}
connectDb();
