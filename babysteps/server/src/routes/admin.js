/** Admin login + client-gallery management (mounted at /api/admin). */
import crypto from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { ipKeyGenerator } from 'express-rate-limit';
import { trackedLimiter, listBlocks, clearBlock, limiterInfo } from '../rateLimits.js';
import mongoose from 'mongoose';
import { ZipArchive } from 'archiver';
import { Admin, ClientGallery, Inquiry, GiftCard, Setting, Media, Payment } from '../models.js';
import { emailEnabled, emailProvider, sendEmail } from '../mailer.js';
import { storageMode } from '../storage.js';
import { MAX_ORIGINAL, r2Ready, presignUploads, confirmUploads, resolveGallery, deletePhotoObjects, deleteGalleryObjects, isR2 } from '../r2.js';
import { accessInfo, accessUntilOf, defaultAccessUntil, FREE_DAYS } from '../access.js';
import { Readable } from 'node:stream';
import { normalizeImageUrl, resolveVideoLinks, resolveDriveImageFiles, fetchDriveFile } from '../drive.js';
import { giftCode } from '../giftCodes.js';
import { onlinePaymentsOn, setOnlinePayments, getCharges, setCharges, getMinAmount, setMinAmount } from '../paymentSettings.js';
import { ensureValid, checkAmount, checkName, checkPhone, checkEmail, checkText, checkSlug, checkPassword, checkInt, checkDate, formatPhone, squish } from '../validate.js';

const clientRules = {
  clientName: (v) => checkName(v, { label: 'the client’s name' }),
  title: (v) => checkText(v, { max: 120 }),
  clientPhone: (v) => checkPhone(v, { required: false }),
  clientEmail: (v) => checkEmail(v),
  selectionLimit: (v) => checkInt(v, { min: 0, max: 5000 }),
};
import { requireAdmin, signToken } from '../auth.js';

const router = Router();
/**
 * Admin login: 10 WRONG passwords per 15 minutes per address + email. Correct logins don't count.
 * Admin → Login security can unlock people; restarting the app clears every block.
 */
const loginLimiter = trackedLimiter({
  id: 'admin-login', label: 'Admin login', who: 'ip+email', limit: 10, skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}|${String(req.body?.email || '').trim().toLowerCase()}`,
  message: (mins) => `Too many wrong passwords. Please wait ${mins} minute${mins === 1 ? '' : 's'} and try again (or restart the app in Hostinger).`,
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (checkEmail(email, { required: true }) || !password || String(password).length > 200) return res.status(401).json({ error: 'Invalid email or password' });
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

const plain = (g) => { const { passwordHash, ...rest } = g.toObject ? g.toObject() : g; return { ...rest, access: accessInfo(g) }; };
/** Gallery for the admin UI: R2 photos turned into signed URLs (each keeps its stored value in `ref`). */
const safe = (g) => resolveGallery(plain(g));
/** Easy-to-type password, e.g. "priya-4827". */
const makePassword = (hint = '') => `${String(hint).toLowerCase().normalize('NFKD').replace(/[^a-z]/g, '').slice(0, 8) || 'baby'}-${crypto.randomInt(1000, 10000)}`;
const find = async (req, res) => {
  const g = await ClientGallery.findOne({ slug: req.params.slug });
  if (!g) res.status(404).json({ error: 'Not found' });
  return g;
};

/* ---------- Dashboard: one request with everything the overview page shows ---------- */
router.get('/dashboard', async (_req, res) => {
  const DAY = 24 * 3600 * 1000;
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY);
  const [inqCounts, inqDaily, recent, galleries, gifts, paid] = await Promise.all([
    Inquiry.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Inquiry.aggregate([
      { $match: { createdAt: { $gte: since30 } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, n: { $sum: 1 } } },
    ]),
    Inquiry.find().sort('-createdAt').limit(5).select('name phone session status createdAt').lean(),
    ClientGallery.find().select('slug title clientName createdAt accessUntil expiresAt selectionSubmittedAt photos.favorite').lean(),
    GiftCard.aggregate([{ $group: { _id: '$status', n: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { status: 'paid', createdAt: { $gte: since30 } } }, { $group: { _id: null, n: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
  ]);

  // Last 30 days, oldest first, in studio time (IST), including days with no enquiries.
  const byDay = Object.fromEntries(inqDaily.map((d) => [d._id, d.n]));
  const ist = (t) => new Date(t + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  const daily = Array.from({ length: 30 }, (_, k) => { const day = ist(now - (29 - k) * DAY); return { day, n: byDay[day] || 0 }; });

  let photos = 0, active = 0, expired = 0;
  const expiring = [], picks = [];
  for (const g of galleries) {
    photos += g.photos?.length || 0;
    const a = accessInfo(g);
    if (a.locked) expired += 1; else active += 1;
    if (!a.locked && a.daysLeft <= 14) expiring.push({ slug: g.slug, title: g.title, clientName: g.clientName, daysLeft: a.daysLeft, until: a.until });
    if (g.selectionSubmittedAt && g.selectionSubmittedAt > since30) picks.push({ slug: g.slug, title: g.title, clientName: g.clientName, at: g.selectionSubmittedAt, favorites: (g.photos || []).filter((p) => p.favorite).length });
  }
  expiring.sort((a, b) => a.daysLeft - b.daysLeft);
  picks.sort((a, b) => b.at - a.at);

  const counts = Object.fromEntries(inqCounts.map((c) => [c._id, c.n]));
  const giftBy = Object.fromEntries(gifts.map((c) => [c._id, c]));
  res.set('Cache-Control', 'no-store');
  res.json({
    enquiries: {
      counts, total: inqCounts.reduce((t, c) => t + c.n, 0),
      last7: daily.slice(-7).reduce((t, d) => t + d.n, 0), last30: daily.reduce((t, d) => t + d.n, 0),
      daily, recent,
    },
    galleries: { total: galleries.length, active, expired, photos, expiring: expiring.slice(0, 6), picks: picks.slice(0, 6) },
    giftCards: {
      active: giftBy.active?.n || 0, activeValue: giftBy.active?.amount || 0,
      redeemed: giftBy.redeemed?.n || 0, onlineSales30: paid[0]?.n || 0, onlineValue30: paid[0]?.amount || 0,
    },
  });
});

router.get('/client-galleries', async (_req, res) => {
  const galleries = await ClientGallery.find().sort('-createdAt').lean();
  res.json(await Promise.all(galleries.map(async ({ photos, videos = [], ...g }) => ({
    ...g, cover: (await resolveGallery({ ...g, photos: [] })).cover,
    access: accessInfo(g), photoCount: photos.length, videoCount: videos.length, favoriteCount: photos.filter((p) => p.favorite).length,
  }))));
});

/* ---------- Direct-to-R2 photo uploads ---------- */
router.get('/client-galleries-storage', (_req, res) => res.json({ r2: r2Ready() }));

/** Step 1: presigned PUT URLs for up to 50 files. Body: { files: [{ name, type, size, webSize, thumbSize }] } */
router.post('/client-galleries/:slug/uploads', async (req, res) => {
  if (!r2Ready()) return res.status(503).json({ error: 'Cloud storage (R2) is not configured on the server.' });
  const files = Array.isArray(req.body?.files) ? req.body.files.slice(0, 50) : [];
  if (!files.length) return res.status(400).json({ error: 'No files' });
  if (!(await ClientGallery.exists({ slug: req.params.slug }))) return res.status(404).json({ error: 'Not found' });
  res.json({ uploads: await presignUploads(req.params.slug, files) });
});

/** Step 2: after the browser uploaded to R2, check the files and add them to the gallery. Body: { uploads: [{ id, type, name }] } */
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

/* ---------- Copy full-size photos from Google Drive into R2 ----------
 * The browser can't download from Drive directly (no CORS), so it asks for the file list, then fetches each
 * photo through /drive/file/:id, makes the web/thumb versions and uploads all three to R2 like a normal upload. */
router.post('/client-galleries-drive/list', async (req, res) => {
  const { files, errors } = await resolveDriveImageFiles(req.body?.text);
  if (!files.length) return res.status(400).json({ error: errors.join(' ') || 'No Google Drive photos found in those links' });
  res.json({ files: files.slice(0, 5000), errors });
});

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

router.post('/client-galleries', async (req, res) => {
  const { slug, title, clientName, clientPhone, clientEmail, eventDate, photos = [], selectionLimit, expiresAt, allowDownload, freeDays } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Gallery title is required' });
  if (!ensureValid(res, req.body, {
    ...clientRules,
    slug: (v) => checkSlug(v),
    password: (v) => checkPassword(v, { required: false, min: 6, max: 60 }),
    eventDate: (v) => checkDate(v ? String(v).slice(0, 10) : '', { maxYears: 3 }),
    freeDays: (v) => checkInt(v, { min: 1, max: 3650 }),
  })) return;
  if (await ClientGallery.exists({ slug })) return res.status(409).json({ error: 'That gallery name is taken' });
  const password = String(req.body?.password || '').trim() || makePassword(String(clientName).split(/\s+/)[0]);
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const srcs = (Array.isArray(photos) ? photos : []).map((s) => normalizeImageUrl(s)).filter(Boolean);
  const gallery = await ClientGallery.create({
    slug, title: squish(title), clientName: squish(clientName), clientPhone: clientPhone ? formatPhone(clientPhone) : '', clientEmail: String(clientEmail || '').trim().toLowerCase(),
    eventDate, selectionLimit, expiresAt, allowDownload,
    accessUntil: defaultAccessUntil(new Date(), Number(freeDays) > 0 ? Number(freeDays) : FREE_DAYS()),
    passwordHash: await bcrypt.hash(password, 10), passwordUpdatedAt: new Date(),
    cover: srcs[0] || '', photos: srcs.map((src) => ({ src })),
  });
  // The plain password is returned ONCE so the studio can share it; only the hash is stored.
  res.status(201).json({ ...(await safe(gallery)), password });
});

router.post('/client-galleries/:slug/password', async (req, res) => {
  const g = await find(req, res); if (!g) return;
  const password = String(req.body?.password || '').trim() || makePassword(String(g.clientName).split(/\s+/)[0]);
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  g.passwordHash = await bcrypt.hash(password, 10);
  g.passwordUpdatedAt = new Date();
  await g.save();
  res.json({ slug: g.slug, title: g.title, clientName: g.clientName, clientPhone: g.clientPhone, clientEmail: g.clientEmail, password });
});

router.get('/client-galleries/:slug', async (req, res) => {
  const g = await ClientGallery.findOne({ slug: req.params.slug }).lean();
  if (!g) return res.status(404).json({ error: 'Not found' });
  res.json(await safe(g));
});

router.post('/client-galleries/:slug/photos', async (req, res) => {
  const srcs = (Array.isArray(req.body?.photos) ? req.body.photos : []).map((s) => normalizeImageUrl(s)).filter(Boolean);
  if (!srcs.length) return res.status(400).json({ error: 'No photos to add' });
  const g = await find(req, res); if (!g) return;
  const existing = new Set(g.photos.map((p) => p.src));
  const fresh = srcs.filter((s) => !existing.has(s));
  fresh.forEach((src) => g.photos.push({ src }));
  if (!g.cover && fresh[0]) g.cover = fresh[0];
  await g.save();
  res.status(201).json({ ...(await safe(g)), added: fresh.length, skipped: srcs.length - fresh.length });
});

router.delete('/client-galleries/:slug/photos/:photoId', async (req, res) => {
  const g = await find(req, res); if (!g) return;
  const photo = g.photos.id(req.params.photoId);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  const wasCover = g.cover === photo.src;
  const removed = photo.toObject();
  photo.deleteOne();
  if (wasCover) g.cover = g.photos[0]?.src || '';
  await g.save();
  if (isR2(removed.src)) await deletePhotoObjects(removed);
  res.json(await safe(g));
});

router.post('/client-galleries/:slug/videos', async (req, res) => {
  const { videos, errors } = await resolveVideoLinks(req.body?.text);
  if (!videos.length) return res.status(400).json({ error: errors.join(' ') || 'No video links found' });
  const g = await find(req, res); if (!g) return;
  const have = new Set(g.videos.map((v) => v.kind + v.ref));
  const fresh = videos.filter((v) => !have.has(v.kind + v.ref));
  const n = g.videos.length;
  fresh.forEach((v, i) => g.videos.push({ ...v, title: v.title || `Film ${n + i + 1}` }));
  await g.save();
  res.status(201).json({ ...(await safe(g)), added: fresh.length, skipped: videos.length - fresh.length, errors });
});

router.patch('/client-galleries/:slug/videos/:videoId', async (req, res) => {
  const g = await find(req, res); if (!g) return;
  const v = g.videos.id(req.params.videoId);
  if (!v) return res.status(404).json({ error: 'Video not found' });
  if (typeof req.body?.title === 'string') v.title = req.body.title.trim().slice(0, 160);
  if (typeof req.body?.poster === 'string') v.poster = normalizeImageUrl(req.body.poster);
  await g.save();
  res.json(await safe(g));
});

router.delete('/client-galleries/:slug/videos/:videoId', async (req, res) => {
  const g = await find(req, res); if (!g) return;
  const v = g.videos.id(req.params.videoId);
  if (!v) return res.status(404).json({ error: 'Video not found' });
  v.deleteOne();
  await g.save();
  res.json(await safe(g));
});

router.patch('/client-galleries/:slug', async (req, res) => {
  const { clientPhone, clientEmail, clientName, title, cover, selectionLimit, allowDownload } = req.body || {};
  const present = Object.fromEntries(Object.entries(clientRules).filter(([k]) => req.body?.[k] !== undefined));
  if (!ensureValid(res, req.body, present)) return;
  const g = await ClientGallery.findOneAndUpdate(
    { slug: req.params.slug },
    {
      clientPhone: clientPhone === undefined ? undefined : clientPhone ? formatPhone(clientPhone) : '',
      clientEmail: clientEmail === undefined ? undefined : String(clientEmail).trim().toLowerCase(),
      clientName: clientName === undefined ? undefined : squish(clientName),
      title: title === undefined ? undefined : squish(title),
      cover: cover === undefined || !/^https:\/\/[^/]+\.r2\.cloudflarestorage\.com\//.test(cover) ? cover : undefined, selectionLimit, allowDownload,
    },
    { new: true, runValidators: true },
  );
  if (!g) return res.status(404).json({ error: 'Not found' });
  res.json(await safe(g));
});

router.post('/client-galleries/:slug/reopen', async (req, res) => {
  const g = await ClientGallery.findOneAndUpdate({ slug: req.params.slug }, { $unset: { selectionSubmittedAt: 1 } }, { new: true });
  if (!g) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

router.post('/client-galleries/:slug/extend', async (req, res) => {
  const days = Math.min(Math.max(Number(req.body?.days) || 0, 1), 3650);
  const g = await find(req, res); if (!g) return;
  const from = accessInfo(g).locked ? new Date() : accessUntilOf(g);
  g.accessUntil = new Date(from.getTime() + days * 86400000);
  await g.save();
  res.json({ ok: true, access: accessInfo(g) });
});

router.delete('/client-galleries/:slug', async (req, res) => {
  const g = await ClientGallery.findOneAndDelete({ slug: req.params.slug });
  // Remove the gallery's R2 files too, so storage isn't paid for after a gallery is gone.
  if (g) await deleteGalleryObjects(g.slug).catch((e) => console.error('R2 cleanup failed:', e.message));
  res.status(204).end();
});

/* ---------- Enquiries ---------- */
router.get('/inquiries', async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const [items, counts] = await Promise.all([
    Inquiry.find(filter).sort('-createdAt').limit(1000).lean(),
    Inquiry.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  res.json({ items, counts: Object.fromEntries(counts.map((c) => [c._id, c.n])), emailAlerts: emailEnabled(), emailProvider: emailProvider(), notifyEmail: emailEnabled() ? (process.env.NOTIFY_EMAIL || process.env.EMAIL_FROM || process.env.SMTP_USER) : null });
});
router.post('/email/test', async (_req, res) => {
  if (!emailEnabled()) return res.status(400).json({ error: 'Email is not configured on the server.' });
  try {
    await sendEmail({ subject: 'BabySteps test email ✓', text: 'Email alerts are working. New website enquiries will arrive here.', html: '<p style="font-family:Arial,sans-serif">✅ Email alerts are working. New website enquiries from <b>BabySteps</b> will arrive here.</p>' });
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: `Sending failed: ${e.message}` });
  }
});
router.patch('/inquiries/:id', async (req, res) => {
  const { status, notes } = req.body || {};
  const q = await Inquiry.findByIdAndUpdate(req.params.id, { ...(status ? { status } : {}), ...(typeof notes === 'string' ? { notes } : {}) }, { new: true, runValidators: true });
  if (!q) return res.status(404).json({ error: 'Not found' });
  res.json(q);
});
router.delete('/inquiries/:id', async (req, res) => {
  await Inquiry.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

/* ---------- Online payments switch ---------- */
const razorpayKeysSet = () => Boolean((process.env.RAZORPAY_KEY_ID || '').trim() && (process.env.RAZORPAY_KEY_SECRET || '').trim());
const paymentSettings = async () => ({ razorpayEnabled: await onlinePaymentsOn(), keysSet: razorpayKeysSet(), testMode: (process.env.RAZORPAY_KEY_ID || '').startsWith('rzp_test_'), charges: await getCharges(), minAmount: await getMinAmount() });
router.get('/payment-settings', async (_req, res) => res.json(await paymentSettings()));
router.put('/payment-settings', async (req, res) => {
  if (typeof req.body?.razorpayEnabled === 'boolean') await setOnlinePayments(req.body.razorpayEnabled);
  if (req.body?.charges && typeof req.body.charges === 'object') await setCharges(req.body.charges);
  if (req.body?.minAmount !== undefined) await setMinAmount(req.body.minAmount);
  res.json(await paymentSettings());
});

/* ---------- Gift cards ---------- */
const giftView = (g) => { const o = g.toObject ? g.toObject() : g; const expired = o.status === 'active' && o.expiresAt && new Date(o.expiresAt) < new Date(); return { ...o, displayStatus: expired ? 'expired' : o.status }; };

router.get('/gift-cards', async (_req, res) => {
  res.json((await GiftCard.find().sort('-createdAt').lean()).map(giftView));
});
router.post('/gift-cards', async (req, res) => {
  const b = req.body || {};
  if (!ensureValid(res, b, {
    amount: (v) => checkAmount(v, { min: 100, max: 500000 }),
    recipientName: (v) => checkName(v, { required: false, label: 'the recipient’s name' }),
    recipientPhone: (v) => checkPhone(v, { required: false }),
    recipientEmail: (v) => checkEmail(v),
    senderName: (v) => checkName(v, { required: false, label: 'the buyer’s name' }),
    message: (v) => checkText(v, { max: 600 }),
    validMonths: (v) => checkInt(v, { min: 1, max: 60 }),
  })) return;
  const amount = Number(String(b.amount).replace(/[₹,\s]/g, ''));
  let code = giftCode();
  while (await GiftCard.exists({ code })) code = giftCode();
  const months = Number(b.validMonths) || 12;
  const g = await GiftCard.create({
    code, amount, recipientName: squish(b.recipientName), recipientPhone: b.recipientPhone ? formatPhone(b.recipientPhone) : '',
    recipientEmail: String(b.recipientEmail || '').trim().toLowerCase(), senderName: squish(b.senderName), message: String(b.message || '').trim().slice(0, 600), expiresAt: new Date(Date.now() + months * 30.44 * 86400000),
  });
  res.status(201).json(giftView(g));
});
router.patch('/gift-cards/:id', async (req, res) => {
  const { status, redeemedNote } = req.body || {};
  const update = {};
  if (status) { update.status = status; update.redeemedAt = status === 'redeemed' ? new Date() : undefined; }
  if (typeof redeemedNote === 'string') update.redeemedNote = redeemedNote;
  const g = await GiftCard.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!g) return res.status(404).json({ error: 'Not found' });
  res.json(giftView(g));
});
router.delete('/gift-cards/:id', async (req, res) => {
  await GiftCard.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

/* ---------- Storage & backups ---------- */
const FREE_TIER_BYTES = 512 * 1024 * 1024;
router.get('/storage', async (_req, res) => {
  const db = mongoose.connection.db;
  const stats = await db.stats();
  const files = await db.collection('uploads.files').aggregate([{ $group: { _id: null, n: { $sum: 1 }, bytes: { $sum: '$length' } } }]).toArray();
  res.json({
    mode: storageMode(),
    dataBytes: stats.dataSize + stats.indexSize,
    storageBytes: stats.storageSize + stats.indexSize,
    photos: files[0]?.n || 0, photoBytes: files[0]?.bytes || 0,
    limitBytes: Number(process.env.DB_LIMIT_MB) > 0 ? Number(process.env.DB_LIMIT_MB) * 1024 * 1024 : FREE_TIER_BYTES,
  });
});

/** Everything except photo files, as one JSON file (galleries include password hashes so a restore keeps logins working). */
router.get('/backup', async (_req, res) => {
  const [settings, galleries, inquiries, giftCards, media] = await Promise.all([
    Setting.find().lean(), ClientGallery.find().select('+passwordHash').lean(), Inquiry.find().lean(), GiftCard.find().lean(), Media.find().lean(),
  ]);
  const stamp = new Date().toISOString().slice(0, 10);
  res.set('Content-Disposition', `attachment; filename="babysteps-backup-${stamp}.json"`);
  res.json({ app: 'babysteps', version: 1, createdAt: new Date(), settings, galleries, inquiries, giftCards, media });
});

/** All uploaded photos as a zip (GridFS and/or disk). */
router.get('/backup/photos', async (_req, res, next) => {
  try {
    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
    const stamp = new Date().toISOString().slice(0, 10);
    res.attachment(`babysteps-photos-${stamp}.zip`);
    const zip = new ZipArchive({ zlib: { level: 0 } }); // photos are already compressed
    zip.on('error', next);
    zip.pipe(res);
    for await (const f of db.collection('uploads.files').find()) zip.append(bucket.openDownloadStream(f._id), { name: f.filename });
    await zip.finalize();
  } catch (e) { next(e); }
});

/** Restore from a JSON backup: upserts by _id (adds missing, overwrites matching). Photos are restored separately. */
router.post('/restore', async (req, res) => {
  const b = req.body || {};
  if (b.app !== 'babysteps') return res.status(400).json({ error: 'This is not a BabySteps backup file' });
  const upsert = async (Model, docs = []) => {
    if (!Array.isArray(docs) || !docs.length) return 0;
    await Model.bulkWrite(docs.map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })));
    return docs.length;
  };
  const result = {
    settings: await upsert(Setting, b.settings), galleries: await upsert(ClientGallery, b.galleries),
    inquiries: await upsert(Inquiry, b.inquiries), giftCards: await upsert(GiftCard, b.giftCards), media: await upsert(Media, b.media),
  };
  res.json({ ok: true, restored: result });
});

export default router;
