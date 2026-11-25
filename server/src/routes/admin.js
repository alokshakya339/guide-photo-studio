import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { trackedLimiter, listBlocks, clearBlock, limiterInfo } from '../rateLimits.js';
import { Admin, Inquiry, Testimonial, ClientGallery, Category, Package, Plan, Application } from '../models/index.js';
import { accessInfo, accessUntilOf, defaultAccessUntil, FREE_DAYS } from '../access.js';
import { normalizeImageUrl, resolveDriveImageLinks, resolveVideoLinks, resolveDriveImageFiles, fetchDriveFile } from '../cms/drive.js';
import { MAX_ORIGINAL, r2Ready, presignUploads, confirmUploads, resolveGallery, signedUrl, deletePhotoObjects, deleteGalleryObjects, isR2 } from '../galleryStorage.js';
import { requireAdmin, signToken } from '../middleware/auth.js';

const router = Router();

/**
 * Brute-force protection for the admin login: 10 WRONG passwords per 15 minutes, counted per address + email.
 * Correct logins don't count, so normal use never locks you out. Admin → Login security can unlock people;
 * if the admin themselves is locked out, restarting the app clears it.
 */
const loginLimiter = trackedLimiter({
  id: 'admin-login', label: 'Admin login', who: 'ip+email', limit: 10, skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}|${String(req.body?.email || '').trim().toLowerCase()}`,
  message: (mins) => `Too many wrong passwords. Please wait ${mins} minute${mins === 1 ? '' : 's'} and try again (or restart the app in Hostinger).`,
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  const admin = await Admin.findOne({ email: String(email || '').toLowerCase() });
  const ok = admin && (await bcrypt.compare(String(password || ''), admin.passwordHash));
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
  res.json({ token: signToken({ role: 'admin', id: admin._id, email: admin.email }, '12h') });
});

router.use(requireAdmin);

/* ---------- Login security: who is blocked by the login limits, and unlock them ---------- */
router.get('/security/blocks', (_req, res) => { res.set('Cache-Control', 'no-store'); res.json({ blocks: listBlocks(), limiters: limiterInfo() }); });
router.delete('/security/blocks', (req, res) => {
  const { limiter, key } = req.body || {};
  if (limiter && typeof key !== 'string') return res.status(400).json({ error: 'Missing key' });
  res.json({ cleared: clearBlock(limiter, key) });
});

/* ---------- Inquiries ---------- */
router.get('/inquiries', async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  res.json(await Inquiry.find(filter).sort('-createdAt').limit(500).lean());
});

router.patch('/inquiries/:id', async (req, res) => {
  const { status } = req.body || {};
  const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
  if (!inquiry) return res.status(404).json({ error: 'Not found' });
  res.json(inquiry);
});

router.delete('/inquiries/:id', async (req, res) => {
  await Inquiry.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

/* ---------- Job applications ---------- */
router.get('/applications', async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  res.json(await Application.find(filter).sort('-createdAt').limit(500).lean());
});

router.patch('/applications/:id', async (req, res) => {
  const a = await Application.findByIdAndUpdate(req.params.id, { status: req.body?.status }, { new: true, runValidators: true });
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json(a);
});

router.delete('/applications/:id', async (req, res) => {
  await Application.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

/* ---------- Testimonials ---------- */
router.get('/testimonials', async (_req, res) => {
  res.json(await Testimonial.find().sort('-createdAt').lean());
});

router.post('/testimonials', async (req, res) => {
  const { name, event, quote, photo, rating, published } = req.body || {};
  if (!name || !quote) return res.status(400).json({ error: 'Name and quote are required' });
  res.status(201).json(await Testimonial.create({ name, event, quote, photo, rating, published }));
});

router.patch('/testimonials/:id', async (req, res) => {
  const { name, event, quote, photo, rating, published } = req.body || {};
  const t = await Testimonial.findByIdAndUpdate(
    req.params.id,
    { name, event, quote, photo, rating, published },
    { new: true, runValidators: true }
  );
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});

router.delete('/testimonials/:id', async (req, res) => {
  await Testimonial.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

/* ---------- Packages ---------- */
router.patch('/packages/:id', async (req, res) => {
  const { title, startingPrice, unit, description, includes, highlight } = req.body || {};
  const p = await Package.findByIdAndUpdate(
    req.params.id,
    { title, startingPrice, unit, description, includes, highlight },
    { new: true, runValidators: true }
  );
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

/* ---------- Portfolio images ---------- */
router.post('/categories/:slug/images', async (req, res) => {
  const { src, alt, featured } = req.body || {};
  if (!src) return res.status(400).json({ error: 'Image URL is required' });
  const cat = await Category.findOneAndUpdate(
    { slug: req.params.slug },
    { $push: { images: { src, alt, featured } } },
    { new: true }
  );
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  res.status(201).json(cat);
});

/* ---------- Client galleries ---------- */
/** Brand filter: ?brand=babysteps → BabySteps only; default → Guide Photo Studio (incl. galleries with no brand). */
const brandFilter = (brand) => (brand === 'babysteps' ? { brand: 'babysteps' } : { brand: { $ne: 'babysteps' } });

router.get('/client-galleries', async (req, res) => {
  const galleries = await ClientGallery.find(brandFilter(req.query.brand)).sort('-createdAt').lean();
  const covers = await Promise.all(galleries.map((g) => signedUrl(g.cover)));
  res.json(
    galleries.map(({ photos, videos = [], ...g }, i) => ({
      ...g,
      cover: covers[i],
      access: accessInfo({ ...g, photos }),
      photoCount: photos.length,
      videoCount: videos.length,
      favoriteCount: photos.filter((p) => p.favorite).length,
    }))
  );
});

/** Gallery for the admin UI: R2 photos as signed URLs (each keeps its stored value in `ref`; cover's in `coverRef`). */
async function safeGallery(g) {
  const { passwordHash, ...safe } = g.toObject();
  return { ...(await resolveGallery(safe)), access: accessInfo(g) };
}

/** Easy-to-type gallery password, e.g. "riya-4827" (based on the client's first name). */
function makePassword(hint = '') {
  const word = String(hint).toLowerCase().normalize('NFKD').replace(/[^a-z]/g, '').slice(0, 8) || 'guide';
  return `${word}-${crypto.randomInt(1000, 10000)}`;
}

router.post('/client-galleries', async (req, res) => {
  const { slug, title, clientName, clientPhone, clientEmail, eventDate, driveLinks = '', selectionLimit, expiresAt, allowDownload, freeDays } = req.body || {};
  const brand = req.body?.brand === 'babysteps' ? 'babysteps' : 'guide';
  if (!slug || !title || !clientName) {
    return res.status(400).json({ error: 'Gallery name, title and client name are required' });
  }
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) return res.status(400).json({ error: 'Gallery name may only use a-z, 0-9 and dashes' });
  if (await ClientGallery.exists({ slug })) return res.status(409).json({ error: 'That gallery name is taken' });
  const password = String(req.body?.password || '').trim() || makePassword(String(clientName).split(/\s+/)[0]);
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  // Photos come only from Google Drive (file or shared-folder links).
  const drive = String(driveLinks).trim() ? await resolveDriveImageLinks(driveLinks) : { images: [], errors: [] };
  if (drive.errors.length && !drive.images.length) return res.status(400).json({ error: drive.errors.join(' ') });
  const srcs = drive.images.map((i) => i.url);
  const gallery = await ClientGallery.create({
    slug, brand, title, clientName, clientPhone, clientEmail, eventDate, selectionLimit, expiresAt, allowDownload,
    accessUntil: defaultAccessUntil(new Date(), Number(freeDays) > 0 ? Number(freeDays) : FREE_DAYS()),
    passwordHash: await bcrypt.hash(password, 10),
    passwordUpdatedAt: new Date(),
    cover: srcs[0] || '',
    photos: srcs.map((src) => ({ src })),
  });
  const { passwordHash, ...safe } = gallery.toObject();
  // The plain password is returned ONCE so the studio can share it; only the hash is stored.
  res.status(201).json({ ...safe, password, driveErrors: drive.errors });
});

/** Set a new password (generated if none given). Returned once so it can be shared; the old one stops working. */
router.post('/client-galleries/:slug/password', async (req, res) => {
  const g = await ClientGallery.findOne({ slug: req.params.slug });
  if (!g) return res.status(404).json({ error: 'Not found' });
  const password = String(req.body?.password || '').trim() || makePassword(String(g.clientName).split(/\s+/)[0]);
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  g.passwordHash = await bcrypt.hash(password, 10);
  g.passwordUpdatedAt = new Date();
  await g.save();
  res.json({ slug: g.slug, title: g.title, clientName: g.clientName, clientPhone: g.clientPhone, clientEmail: g.clientEmail, password });
});

/** Full gallery with photos, for the admin gallery manager. */
router.get('/client-galleries/:slug', async (req, res) => {
  const g = await ClientGallery.findOne({ slug: req.params.slug }).lean();
  if (!g) return res.status(404).json({ error: 'Not found' });
  const { passwordHash, ...safe } = g;
  res.json({ ...(await resolveGallery(safe)), access: accessInfo(g) });
});

/* ---------- Copy full size: Google Drive → Cloudflare R2 ----------
 * The browser can't download from Drive directly (no CORS), so it asks for the folder's file list, fetches each
 * photo through /client-galleries-drive/file/:id, makes web + thumbnail versions and uploads all three straight
 * to R2 with presigned URLs. Large galleries never pass through (or time out on) the Node host's upload limits. */
router.get('/client-galleries-storage', (_req, res) => res.json({ r2: r2Ready() }));

/** Step 1: presigned PUT URLs for up to 50 files. Body: { files: [{ name, type, size, webSize, thumbSize, previewType }] } */
router.post('/client-galleries/:slug/uploads', async (req, res) => {
  if (!r2Ready()) return res.status(503).json({ error: 'Cloud storage (R2) is not configured on the server.' });
  const files = Array.isArray(req.body?.files) ? req.body.files.slice(0, 50) : [];
  if (!files.length) return res.status(400).json({ error: 'No files' });
  if (!(await ClientGallery.exists({ slug: req.params.slug }))) return res.status(404).json({ error: 'Not found' });
  res.json({ uploads: await presignUploads(req.params.slug, files) });
});

/** Step 2: after the browser uploaded to R2, check the files exist and add them to the gallery. */
router.post('/client-galleries/:slug/uploads/complete', async (req, res) => {
  if (!r2Ready()) return res.status(503).json({ error: 'Cloud storage (R2) is not configured on the server.' });
  const items = Array.isArray(req.body?.uploads) ? req.body.uploads.slice(0, 50) : [];
  const { photos, errors } = await confirmUploads(req.params.slug, items);
  // $push keeps parallel batches from overwriting each other.
  const g = await ClientGallery.findOneAndUpdate({ slug: req.params.slug }, { $push: { photos: { $each: photos } } }, { new: true });
  if (!g) return res.status(404).json({ error: 'Not found' });
  if (!g.cover && photos[0]) { g.cover = photos[0].src; await g.save(); }
  res.status(201).json({ added: photos.length, errors });
});

/** Photo files ({ id, name }) inside pasted Drive folder / file links. */
router.post('/client-galleries-drive/list', async (req, res) => {
  const { files, errors } = await resolveDriveImageFiles(req.body?.text);
  if (!files.length) return res.status(400).json({ error: errors.join(' ') || 'No Google Drive photos found in those links' });
  res.json({ files: files.slice(0, 5000), errors });
});

/** Stream one full-size Drive photo to the admin's browser (which then uploads it to R2). */
router.get('/client-galleries-drive/file/:id', async (req, res) => {
  let r;
  try { r = await fetchDriveFile(req.params.id); } catch (e) { return res.status(e.status || 502).json({ error: e.message }); }
  const size = Number(r.headers.get('content-length')) || 0;
  if (size > MAX_ORIGINAL) {
    r.body?.cancel().catch(() => {});
    return res.status(413).json({ error: `File is over ${MAX_ORIGINAL / 1048576} MB` });
  }
  res.set({
    'Content-Type': r.headers.get('content-type') || 'application/octet-stream',
    'Cache-Control': 'no-store',
    ...(size ? { 'Content-Length': String(size) } : {}),
  });
  const name = /filename\*?=(?:UTF-8'')?"?([^";]+)/i.exec(r.headers.get('content-disposition') || '')?.[1];
  if (name) res.set('X-File-Name', encodeURIComponent(decodeURIComponent(name)));
  Readable.fromWeb(r.body).on('error', () => res.destroy()).pipe(res);
});

/** Add photos to a client gallery from pasted Google Drive links (files or shared folders) — Drive only. */
router.post('/client-galleries/:slug/photos', async (req, res) => {
  const { images, errors } = await resolveDriveImageLinks(req.body?.text);
  if (!images.length) return res.status(400).json({ error: errors.join(' ') || 'Paste a Google Drive folder or photo link' });
  const srcs = images.map((i) => i.url);
  const g = await ClientGallery.findOne({ slug: req.params.slug });
  if (!g) return res.status(404).json({ error: 'Not found' });
  const existing = new Set(g.photos.map((p) => p.src));
  const fresh = srcs.filter((s) => !existing.has(s));
  fresh.forEach((src) => g.photos.push({ src }));
  if (!g.cover && fresh[0]) g.cover = fresh[0];
  await g.save();
  res.status(201).json({ ...(await safeGallery(g)), added: fresh.length, skipped: srcs.length - fresh.length, errors });
});

router.delete('/client-galleries/:slug/photos/:photoId', async (req, res) => {
  const g = await ClientGallery.findOne({ slug: req.params.slug });
  if (!g) return res.status(404).json({ error: 'Not found' });
  const photo = g.photos.id(req.params.photoId);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  const wasCover = g.cover === photo.src;
  const removed = photo.toObject();
  photo.deleteOne();
  if (wasCover) g.cover = g.photos[0]?.src || '';
  await g.save();
  if (isR2(removed.src)) await deletePhotoObjects(removed); // full-size copies: free the R2 storage too
  res.json(await safeGallery(g));
});

/* ---- Films (videos) in a client gallery ---- */

/** Add videos from pasted links: Drive files / folders, YouTube, or direct video URLs. */
router.post('/client-galleries/:slug/videos', async (req, res) => {
  const { videos, errors } = await resolveVideoLinks(req.body?.text);
  if (!videos.length) return res.status(400).json({ error: errors.join(' ') || 'No video links found' });
  const g = await ClientGallery.findOne({ slug: req.params.slug });
  if (!g) return res.status(404).json({ error: 'Not found' });
  const have = new Set(g.videos.map((v) => v.kind + v.ref));
  const fresh = videos.filter((v) => !have.has(v.kind + v.ref));
  const n = g.videos.length;
  fresh.forEach((v, i) => g.videos.push({ ...v, title: v.title || `Film ${n + i + 1}` }));
  await g.save();
  res.status(201).json({ ...(await safeGallery(g)), added: fresh.length, skipped: videos.length - fresh.length, errors });
});

router.patch('/client-galleries/:slug/videos/:videoId', async (req, res) => {
  const g = await ClientGallery.findOne({ slug: req.params.slug });
  const v = g?.videos.id(req.params.videoId);
  if (!v) return res.status(404).json({ error: 'Video not found' });
  if (typeof req.body?.title === 'string') v.title = req.body.title.trim().slice(0, 160);
  if (typeof req.body?.poster === 'string') v.poster = normalizeImageUrl(req.body.poster);
  await g.save();
  res.json(await safeGallery(g));
});

router.put('/client-galleries/:slug/videos/order', async (req, res) => {
  const g = await ClientGallery.findOne({ slug: req.params.slug });
  if (!g) return res.status(404).json({ error: 'Not found' });
  const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).map(String);
  const rank = new Map(ids.map((id, i) => [id, i]));
  const sorted = [...g.videos].sort((a, b) => (rank.get(String(a._id)) ?? 1e9) - (rank.get(String(b._id)) ?? 1e9));
  g.videos = sorted.map((v) => v.toObject());
  await g.save();
  res.json(await safeGallery(g));
});

router.delete('/client-galleries/:slug/videos/:videoId', async (req, res) => {
  const g = await ClientGallery.findOne({ slug: req.params.slug });
  const v = g?.videos.id(req.params.videoId);
  if (!v) return res.status(404).json({ error: 'Video not found' });
  v.deleteOne();
  await g.save();
  res.json(await safeGallery(g));
});

/** Update the client's contact details. */
router.patch('/client-galleries/:slug', async (req, res) => {
  const { clientPhone, clientEmail, clientName, title, cover, selectionLimit, allowDownload } = req.body || {};
  const g = await ClientGallery.findOneAndUpdate(
    { slug: req.params.slug },
    // A signed R2 URL expires — covers must be stored as the photo's "r2:" ref (the admin UI sends `ref`).
    { clientPhone, clientEmail, clientName, title, cover: cover === undefined || !/^https:\/\/[^/]+\.r2\.cloudflarestorage\.com\//.test(cover) ? cover : undefined, selectionLimit, allowDownload },
    { new: true, runValidators: true }
  );
  if (!g) return res.status(404).json({ error: 'Not found' });
  const { passwordHash, ...safe } = g.toObject();
  res.json(safe);
});

/** Re-open a submitted selection so the client can change it. */
router.post('/client-galleries/:slug/reopen', async (req, res) => {
  const g = await ClientGallery.findOneAndUpdate({ slug: req.params.slug }, { $unset: { selectionSubmittedAt: 1 } }, { new: true });
  if (!g) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

/** Manually extend access, e.g. after a cash/UPI payment at the studio. */
router.post('/client-galleries/:slug/extend', async (req, res) => {
  const days = Math.min(Math.max(Number(req.body?.days) || 0, 1), 3650);
  const g = await ClientGallery.findOne({ slug: req.params.slug });
  if (!g) return res.status(404).json({ error: 'Not found' });
  const from = accessInfo(g).locked ? new Date() : accessUntilOf(g);
  g.accessUntil = new Date(from.getTime() + days * 86400000);
  await g.save();
  res.json({ ok: true, access: accessInfo(g) });
});

/* ---------- Hosting plans ---------- */
router.get('/plans', async (_req, res) => {
  res.json(await Plan.find().sort('order').lean());
});

router.patch('/plans/:code', async (req, res) => {
  const plan = await Plan.findOne({ code: req.params.code });
  if (!plan) return res.status(404).json({ error: 'Not found' });
  const { amount, active, name, description } = req.body || {};
  if (amount != null) {
    const paise = Math.round(Number(amount));
    if (!(paise >= 100)) return res.status(400).json({ error: 'Amount must be at least ₹1' });
    if (paise !== plan.amount) plan.razorpayPlanId = undefined; // Razorpay plans are immutable → new one on next subscribe
    plan.amount = paise;
  }
  if (typeof active === 'boolean') plan.active = active;
  if (name) plan.name = name;
  if (description != null) plan.description = description;
  await plan.save();
  res.json(plan);
});

router.delete('/client-galleries/:slug', async (req, res) => {
  const g = await ClientGallery.findOneAndDelete({ slug: req.params.slug });
  // Remove the gallery's R2 files too, so storage isn't paid for after a gallery is gone.
  if (g) await deleteGalleryObjects(g.slug).catch((e) => console.error('R2 cleanup failed:', e.message));
  res.status(204).end();
});

export default router;
