/**
 * Admin CMS API (mounted at /api/admin/cms behind requireAdmin).
 *  - /media              upload (multipart) / add by URL / list / update alt / delete
 *  - /settings           get / replace the site settings
 *  - /babysteps          get / replace the BabySteps sub-brand content
 *  - /music/upload       upload an MP3/M4A for the music library (cloud storage, or /uploads when not configured)
 *  - /:collection        generic CRUD + reorder for films, reels, music, categories, packages, faqs, jobs, testimonials
 *  - /categories/:id/images   add / update / delete / reorder portfolio photos
 */
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { Award, BlogPost, Media, Setting, Film, Reel, MusicTrack, Category, Package, Faq, Job, Testimonial } from '../models/index.js';
import { DEFAULT_SITE, youtubeId } from '../cms/defaults.js';
import { normalizeImageUrl, resolveImageLinks } from '../cms/drive.js';
import { putMedia, deleteMedia, storageReady } from '../invites/storage.js';

export const UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const router = Router();

/* ---------------- Media library ---------------- */

const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif' };

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    // random name + extension from the verified mime type (never trust the client's filename)
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${IMAGE_TYPES[file.mimetype]}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024, files: 30 },
  fileFilter: (_req, file, cb) => (IMAGE_TYPES[file.mimetype] ? cb(null, true) : cb(new Error('Only JPG, PNG, WebP, GIF or AVIF images are allowed'))),
});

/** Minimal magic-byte check so a renamed non-image can't slip through. */
function looksLikeImage(file) {
  const fd = fs.openSync(file, 'r');
  const b = Buffer.alloc(12);
  fs.readSync(fd, b, 0, 12, 0);
  fs.closeSync(fd);
  const hex = b.toString('hex');
  return (
    hex.startsWith('ffd8ff') || // jpeg
    hex.startsWith('89504e47') || // png
    hex.startsWith('47494638') || // gif
    (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') ||
    b.toString('ascii', 4, 12).startsWith('ftypavi')
  );
}

router.get('/media', async (req, res) => {
  const q = req.query.q ? { $or: [{ originalName: new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { alt: new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }] } : {};
  res.json(await Media.find(q).sort('-createdAt').limit(1000).lean());
});

router.post('/media', (req, res, next) => {
  upload.array('files', 30)(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const saved = [];
      for (const f of req.files || []) {
        if (!looksLikeImage(f.path)) {
          fs.unlinkSync(f.path);
          continue;
        }
        const folder = String(req.body?.folder || 'general').slice(0, 40);
        // With cloud storage configured (production), keep the photo in R2 so redeploys can't wipe it.
        // Animated GIFs stay on disk (R2 storage converts images to WebP, which would flatten them).
        if (storageReady() && f.mimetype !== 'image/gif') {
          const r2 = await putMedia({ buffer: fs.readFileSync(f.path), mimetype: f.mimetype, folder: `media-${folder}` });
          fs.unlinkSync(f.path);
          saved.push(await Media.create({ url: r2.url, originalName: f.originalname.slice(0, 200), mime: 'image/webp', size: f.size, folder }));
          continue;
        }
        saved.push(await Media.create({
          url: `/uploads/${f.filename}`, filename: f.filename, originalName: f.originalname.slice(0, 200),
          mime: f.mimetype, size: f.size, folder,
        }));
      }
      if (!saved.length) return res.status(400).json({ error: 'No valid images were uploaded' });
      res.status(201).json(saved);
    } catch (e) {
      next(e);
    }
  });
});

/** Register an external image (e.g. a CDN or Google Photos link) in the library. */
router.post('/media/link', async (req, res) => {
  const raw = String(req.body?.url || '').trim();
  if (!/^https?:\/\/\S+$/i.test(raw) && !raw.startsWith('/')) return res.status(400).json({ error: 'Enter a full image URL' });
  const url = normalizeImageUrl(raw);
  const isDrive = url !== raw || url.includes('drive.google.com/thumbnail');
  res.status(201).json(await Media.create({
    url, originalName: isDrive ? 'Google Drive photo' : raw.split('/').pop().slice(0, 200), alt: req.body?.alt || '', folder: isDrive ? 'google-drive' : 'links',
  }));
});

/** Resolve pasted links (Drive files/folders or normal URLs) into image URLs. Optionally save them to the library. */
router.post('/resolve-links', async (req, res) => {
  const { images, errors } = await resolveImageLinks(req.body?.text);
  if (req.body?.saveToLibrary && images.length) {
    const existing = new Set((await Media.find({ url: { $in: images.map((i) => i.url) } }, 'url').lean()).map((m) => m.url));
    const fresh = images.filter((i) => !existing.has(i.url));
    if (fresh.length) {
      await Media.insertMany(fresh.map((i) => ({ url: i.url, originalName: i.name || 'Google Drive photo', folder: i.url.includes('drive.google.com') ? 'google-drive' : 'links' })));
    }
  }
  res.json({ images, errors });
});

router.patch('/media/:id', async (req, res) => {
  const m = await Media.findByIdAndUpdate(req.params.id, { alt: req.body?.alt, folder: req.body?.folder }, { new: true });
  if (!m) return res.status(404).json({ error: 'Not found' });
  res.json(m);
});

router.delete('/media/:id', async (req, res) => {
  const m = await Media.findById(req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  if (m.filename) {
    const file = path.join(UPLOAD_DIR, path.basename(m.filename));
    if (file.startsWith(UPLOAD_DIR) && fs.existsSync(file)) fs.unlinkSync(file);
  } else if (m.url) {
    await deleteMedia(m.url); // only deletes files that are ours in R2; ignores links and Drive photos
  }
  await m.deleteOne();
  res.status(204).end();
});

/* ---------------- Site settings ---------------- */

router.get('/settings', async (_req, res) => {
  const doc = await Setting.findOne({ key: 'site' }).lean();
  res.json({ ...DEFAULT_SITE, ...(doc?.data || {}) });
});

router.put('/settings', async (req, res) => {
  const data = req.body || {};
  if (typeof data !== 'object' || Array.isArray(data)) return res.status(400).json({ error: 'Invalid settings' });
  const doc = await Setting.findOneAndUpdate({ key: 'site' }, { data }, { upsert: true, new: true });
  res.json({ ...DEFAULT_SITE, ...doc.data });
});

/* ---------------- BabySteps sub-brand content ---------------- */

const BABYSTEPS_SECTIONS = ['hero', 'blog', 'studio', 'images', 'sessions', 'packages', 'gallery', 'reels', 'testimonials', 'faqs', 'features', 'steps'];

router.get('/babysteps', async (_req, res) => {
  const doc = await Setting.findOne({ key: 'babysteps' }).lean();
  res.json(doc?.data || {});
});

/** Replace BabySteps content. Only known sections are kept; each must be an object or an array. */
router.put('/babysteps', async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'Invalid content' });
  const data = {};
  for (const key of BABYSTEPS_SECTIONS) {
    if (body[key] == null) continue;
    if (typeof body[key] !== 'object') return res.status(400).json({ error: `Invalid section: ${key}` });
    data[key] = body[key];
  }
  const doc = await Setting.findOneAndUpdate({ key: 'babysteps' }, { data }, { upsert: true, new: true });
  res.json(doc.data);
});

/* ---------------- Portfolio photos inside a category ---------------- */

router.post('/categories/:id/images', async (req, res) => {
  const items = (Array.isArray(req.body?.images) ? req.body.images : [req.body])
    .filter((i) => i && i.src)
    .map((i) => ({ src: normalizeImageUrl(i.src), alt: String(i.alt || ''), featured: !!i.featured }));
  if (!items.length) return res.status(400).json({ error: 'No images' });
  const cat = await Category.findByIdAndUpdate(req.params.id, { $push: { images: { $each: items } } }, { new: true });
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  res.status(201).json(cat);
});

router.patch('/categories/:id/images/:imageId', async (req, res) => {
  const cat = await Category.findById(req.params.id);
  const img = cat?.images.id(req.params.imageId);
  if (!img) return res.status(404).json({ error: 'Not found' });
  const { alt, featured, src } = req.body || {};
  if (alt != null) img.alt = String(alt);
  if (typeof featured === 'boolean') img.featured = featured;
  if (src) img.src = String(src);
  await cat.save();
  res.json(cat);
});

router.delete('/categories/:id/images/:imageId', async (req, res) => {
  const cat = await Category.findByIdAndUpdate(req.params.id, { $pull: { images: { _id: req.params.imageId } } }, { new: true });
  if (!cat) return res.status(404).json({ error: 'Not found' });
  res.json(cat);
});

router.put('/categories/:id/images/order', async (req, res) => {
  const ids = (req.body?.ids || []).map(String);
  const cat = await Category.findById(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Not found' });
  const byId = new Map(cat.images.map((i) => [String(i._id), i]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
  const rest = cat.images.filter((i) => !ids.includes(String(i._id)));
  cat.images = [...ordered, ...rest];
  await cat.save();
  res.json(cat);
});

/* ---------------- Music library uploads ---------------- */

const AUDIO_TYPES = { 'audio/mpeg': '.mp3', 'audio/mp3': '.mp3', 'audio/mp4': '.m4a', 'audio/x-m4a': '.m4a', 'audio/aac': '.aac', 'audio/ogg': '.ogg', 'audio/wav': '.wav', 'audio/x-wav': '.wav' };
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_AUDIO_BYTES, files: 1 } });

router.post('/music/upload', (req, res) => {
  audioUpload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Music files must be under 12 MB.' : err.message });
    const f = req.file;
    if (!f) return res.status(400).json({ error: 'Choose an MP3 or M4A file.' });
    const ext = AUDIO_TYPES[f.mimetype];
    if (!ext) return res.status(400).json({ error: 'Only MP3, M4A, AAC, OGG or WAV audio files are allowed.' });
    try {
      if (storageReady()) {
        const r2 = await putMedia({ buffer: f.buffer, mimetype: f.mimetype, folder: 'music-library' });
        return res.status(201).json({ url: r2.url, name: f.originalname });
      }
      const filename = `music-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), f.buffer);
      res.status(201).json({ url: `/uploads/${filename}`, name: f.originalname });
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message || 'Upload failed' });
    }
  });
});

/* ---------------- Generic collections ---------------- */

/** Save a Short's vertical thumbnail into /uploads so the site doesn't depend on YouTube for it. */
async function fetchReelThumb(id) {
  for (const name of ['oar2', 'oardefault', 'hq720', 'hqdefault']) {
    try {
      const r = await fetch(`https://i.ytimg.com/vi/${id}/${name}.jpg`);
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 2000) continue;
      if (storageReady()) {
        const r2 = await putMedia({ buffer: buf, mimetype: 'image/jpeg', folder: 'reels' });
        await Media.create({ url: r2.url, originalName: `${id} (${name})`, mime: 'image/webp', size: buf.length, folder: 'reels' });
        return r2.url;
      }
      const filename = `reel-${id}-${name}.jpg`;
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), buf);
      await Media.create({ url: `/uploads/${filename}`, filename, originalName: `${id} (${name})`, mime: 'image/jpeg', size: buf.length, folder: 'reels' });
      return `/uploads/${filename}`;
    } catch {
      /* try next size */
    }
  }
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Shortcode from an Instagram reel / post link (instagram.com/reel/ABC…, /reels/, /p/, /tv/, with or without a username). */
function instagramReelId(input) {
  const m = String(input || '').trim().match(/instagram\.com\/(?:[\w.]+\/)?(?:reels?|p|tv)\/([A-Za-z0-9_-]{5,40})/i);
  return m ? m[1] : null;
}

const toList = (v) => (Array.isArray(v) ? v : String(v || '').split(/\n|,/)).map((s) => String(s).trim()).filter(Boolean);

const COLLECTIONS = {
  films: {
    model: Film,
    prepare: async (b) => {
      if (b.youtube != null || b.youtubeId != null) {
        const id = youtubeId(b.youtube ?? b.youtubeId);
        if (!id) throw Object.assign(new Error('Paste a valid YouTube link or video ID'), { status: 400 });
        b.youtubeId = id;
        if (!b.poster) b.poster = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
      }
      if (b.tags != null) b.tags = toList(b.tags);
      delete b.youtube;
      return b;
    },
  },
  reels: {
    model: Reel,
    // One link field for both: a YouTube Shorts link/ID or an Instagram reel link.
    prepare: async (b, existing) => {
      const raw = b.link ?? b.youtube ?? (b.youtubeId != null ? b.youtubeId : null);
      if (raw != null) {
        const ig = instagramReelId(raw);
        if (ig) {
          b.platform = 'instagram'; b.instagramId = ig; b.youtubeId = '';
          const cover = b.thumbnail ?? (existing?.platform === 'instagram' ? existing.thumbnail : '');
          if (!cover) throw Object.assign(new Error('Instagram doesn’t share reel thumbnails — please add a vertical cover image.'), { status: 400 });
        } else {
          const id = youtubeId(raw);
          if (!id) throw Object.assign(new Error('Paste a YouTube Shorts link or an Instagram reel link'), { status: 400 });
          const changed = !existing || existing.youtubeId !== id;
          b.platform = 'youtube'; b.youtubeId = id; b.instagramId = '';
          if (!b.thumbnail && changed) b.thumbnail = await fetchReelThumb(id);
        }
      }
      delete b.youtube; delete b.link;
      return b;
    },
  },
  music: {
    model: MusicTrack,
    prepare: async (b) => {
      if (b.url != null) {
        b.url = String(b.url).trim();
        if (!/^https?:\/\/\S+$/i.test(b.url) && !/^\/uploads\/[\w.-]+$/.test(b.url)) {
          throw Object.assign(new Error('Upload an audio file or paste a link that starts with https://'), { status: 400 });
        }
      }
      return b;
    },
  },
  categories: {
    model: Category,
    prepare: async (b) => {
      if (b.slug != null || b.title != null) {
        b.slug = String(b.slug || b.title).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      delete b.images; // photos are managed through /categories/:id/images
      return b;
    },
    listProjection: (c) => ({ ...c, imageCount: c.images?.length || 0, images: undefined }),
  },
  packages: {
    model: Package,
    prepare: async (b) => {
      if (b.includes != null) b.includes = toList(b.includes);
      if (b.startingPrice === '' || b.startingPrice === null) b.startingPrice = null;
      else if (b.startingPrice != null) b.startingPrice = Number(b.startingPrice);
      return b;
    },
  },
  faqs: { model: Faq },
  jobs: {
    model: Job,
    prepare: async (b) => {
      if (b.duties != null) b.duties = toList(b.duties);
      if (b.skills != null) b.skills = toList(b.skills);
      if (b.title && !b.slug) b.slug = String(b.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return b;
    },
  },
  testimonials: { model: Testimonial },
  blog: {
    model: BlogPost,
    prepare: async (b, existing) => {
      // URL name: typed one, else made from the title. Editing only the title keeps the old URL (links don't break).
      if (b.slug != null || (b.title != null && !existing)) {
        const from = String(b.slug || '').trim() || String(b.title ?? existing?.title ?? '');
        b.slug = String(from).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
        if (!b.slug) throw Object.assign(new Error('Add a title (or a URL name) for the post'), { status: 400 });
      }
      if (b.tags != null) b.tags = toList(b.tags).map((t) => t.replace(/^#/, '')).slice(0, 20);
      if (b.cover != null) b.cover = normalizeImageUrl(b.cover);
      if (b.date === '') b.date = new Date();
      return b;
    },
    // No listProjection: the admin editor fills its form from these rows, so they must include `body`.
    sort: { date: -1, createdAt: -1 }, // newest first, like the website
  },
  awards: {
    model: Award,
    prepare: async (b) => {
      if (b.image != null) b.image = normalizeImageUrl(b.image);
      if (b.link && !/^https?:\/\//i.test(b.link)) b.link = `https://${b.link}`;
      return b;
    },
  },
};

function collection(req, res) {
  const c = COLLECTIONS[req.params.collection];
  if (!c) res.status(404).json({ error: 'Unknown collection' });
  return c;
}

const clean = (body) => {
  const { _id, __v, createdAt, updatedAt, ...rest } = body || {};
  return rest;
};

router.get('/:collection', async (req, res) => {
  const c = collection(req, res);
  if (!c) return;
  const rows = await c.model.find().sort(c.sort || { order: 1, createdAt: 1 }).lean();
  res.json(c.listProjection ? rows.map(c.listProjection) : rows);
});

router.get('/:collection/:id', async (req, res) => {
  const c = collection(req, res);
  if (!c) return;
  const row = await c.model.findById(req.params.id).lean();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/:collection', async (req, res) => {
  const c = collection(req, res);
  if (!c) return;
  try {
    let body = clean(req.body);
    if (c.prepare) body = await c.prepare(body, null);
    if (body.order == null) body.order = (await c.model.countDocuments()) + 1;
    res.status(201).json(await c.model.create(body));
  } catch (e) {
    res.status(e.status || 400).json({ error: e.code === 11000 ? 'That name / slug is already used' : e.message });
  }
});

router.patch('/:collection/:id', async (req, res) => {
  const c = collection(req, res);
  if (!c) return;
  try {
    const existing = await c.model.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    let body = clean(req.body);
    if (c.prepare) body = await c.prepare(body, existing);
    Object.entries(body).forEach(([k, v]) => v !== undefined && existing.set(k, v));
    await existing.save();
    res.json(existing);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.code === 11000 ? 'That name / slug is already used' : e.message });
  }
});

router.delete('/:collection/:id', async (req, res) => {
  const c = collection(req, res);
  if (!c) return;
  await c.model.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

router.put('/:collection/order', async (req, res) => {
  const c = collection(req, res);
  if (!c) return;
  const ids = (req.body?.ids || []).map(String);
  await Promise.all(ids.map((id, i) => c.model.updateOne({ _id: id }, { order: i + 1 })));
  res.json({ ok: true });
});

export default router;
