/**
 * Admin CMS (mounted at /api/admin/cms behind requireAdmin):
 *  - /media            upload (multipart) / add by link / list / update / delete
 *  - /resolve-links    turn pasted photo or Google Drive (file/folder) links into image URLs
 *  - /babysteps        get / replace the website content
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import multer from 'multer';
import { Media, Setting } from '../models.js';
import { normalizeImageUrl, resolveImageLinks } from '../drive.js';
import { saveImage, deleteImage } from '../storage.js';
import { clearSeoCache } from '../seo.js';

const router = Router();
const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif' };

const upload = multer({
  storage: multer.memoryStorage(), // saved to GridFS or disk by storage.js after validation
  limits: { fileSize: 20 * 1024 * 1024, files: 30 },
  fileFilter: (_req, file, cb) => (IMAGE_TYPES[file.mimetype] ? cb(null, true) : cb(new Error('Only JPG, PNG, WebP, GIF or AVIF images are allowed'))),
});

/** Magic-byte check so a renamed non-image can't slip through. */
function looksLikeImage(buffer) {
  const b = buffer.subarray(0, 12);
  const hex = b.toString('hex');
  return hex.startsWith('ffd8ff') || hex.startsWith('89504e47') || hex.startsWith('47494638')
    || (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP')
    || b.toString('ascii', 4, 12).startsWith('ftypavi');
}
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/media', async (req, res) => {
  const q = req.query.q ? { $or: [{ originalName: new RegExp(escapeRe(req.query.q), 'i') }, { alt: new RegExp(escapeRe(req.query.q), 'i') }] } : {};
  res.json(await Media.find(q).sort('-createdAt').limit(1000).lean());
});

router.post('/media', (req, res, next) => {
  upload.array('files', 30)(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const saved = [];
      for (const f of req.files || []) {
        if (!looksLikeImage(f.buffer)) continue;
        // random name + extension from the verified mime type (never trust the client's filename)
        const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${IMAGE_TYPES[f.mimetype]}`;
        const url = await saveImage(f.buffer, filename, f.mimetype);
        saved.push(await Media.create({
          url, filename, originalName: f.originalname.slice(0, 200),
          mime: f.mimetype, size: f.size, folder: String(req.body?.folder || 'general').slice(0, 40),
        }));
      }
      if (!saved.length) return res.status(400).json({ error: 'No valid images were uploaded' });
      res.status(201).json(saved);
    } catch (e) { next(e); }
  });
});

router.post('/media/link', async (req, res) => {
  const raw = String(req.body?.url || '').trim();
  if (!/^https?:\/\/\S+$/i.test(raw)) return res.status(400).json({ error: 'Enter a full image URL' });
  const url = normalizeImageUrl(raw);
  const isDrive = url.includes('drive.google.com/thumbnail');
  res.status(201).json(await Media.create({ url, originalName: isDrive ? 'Google Drive photo' : raw.split('/').pop().slice(0, 200), alt: req.body?.alt || '', folder: isDrive ? 'google-drive' : 'links' }));
});

router.post('/resolve-links', async (req, res) => {
  res.json(await resolveImageLinks(req.body?.text));
});

router.patch('/media/:id', async (req, res) => {
  const m = await Media.findByIdAndUpdate(req.params.id, { alt: req.body?.alt, folder: req.body?.folder }, { new: true });
  if (!m) return res.status(404).json({ error: 'Not found' });
  res.json(m);
});

router.delete('/media/:id', async (req, res) => {
  const m = await Media.findById(req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  if (m.filename) await deleteImage(m.filename);
  await m.deleteOne();
  res.status(204).end();
});

/* ---------- Website content ---------- */
const SECTIONS = ['hero', 'blog', 'studio', 'images', 'sessions', 'packages', 'gallery', 'reels', 'testimonials', 'faqs', 'features', 'steps'];

router.get('/babysteps', async (_req, res) => {
  const doc = await Setting.findOne({ key: 'babysteps' }).lean();
  res.json(doc?.data || {});
});

router.put('/babysteps', async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'Invalid content' });
  const data = {};
  for (const key of SECTIONS) {
    if (body[key] == null) continue;
    if (typeof body[key] !== 'object') return res.status(400).json({ error: `Invalid section: ${key}` });
    data[key] = body[key];
  }
  const doc = await Setting.findOneAndUpdate({ key: 'babysteps' }, { data }, { upsert: true, new: true });
  clearSeoCache();
  res.json(doc.data);
});

export default router;
