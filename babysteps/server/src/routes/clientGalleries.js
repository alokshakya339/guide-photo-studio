/** Client-facing gallery API (mounted at /api/client-galleries). */
import { Router } from 'express';
import { checkSlug } from '../validate.js';
import bcrypt from 'bcryptjs';
import { ipKeyGenerator } from 'express-rate-limit';
import { trackedLimiter } from '../rateLimits.js';
import { ClientGallery } from '../models.js';
import { requireGalleryAccess, signToken } from '../auth.js';
import { accessInfo } from '../access.js';
import { resolveGallery, signedUrl } from '../r2.js';

const router = Router();
// Client gallery login: 20 wrong passwords per 15 minutes per address + gallery. Unlock in Admin → Login security.
const loginLimiter = trackedLimiter({
  id: 'gallery-login', label: 'Client gallery login', who: 'ip+email', limit: 20, skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}|gallery: ${String(req.params?.slug || '').toLowerCase()}`,
  message: (mins) => `Too many wrong passwords. Please wait ${mins} minute${mins === 1 ? '' : 's'} and try again, or message the studio on WhatsApp.`,
});
const isClosed = (g) => g.expiresAt && g.expiresAt < new Date();

router.post('/:slug/login', loginLimiter, async (req, res) => {
  const pw = String(req.body?.password || '');
  if (checkSlug(String(req.params.slug).toLowerCase()) || !pw || pw.length > 100) return res.status(401).json({ error: 'Gallery name or password is incorrect' });
  const gallery = await ClientGallery.findOne({ slug: String(req.params.slug).toLowerCase() }).select('+passwordHash');
  const ok = gallery && (await bcrypt.compare(String(req.body?.password || ''), gallery.passwordHash));
  if (!ok) return res.status(401).json({ error: 'Gallery name or password is incorrect' });
  if (isClosed(gallery)) return res.status(410).json({ error: 'This gallery has been closed. Please contact the studio.' });
  // Locked galleries still get a token so the client sees the renewal screen.
  res.json({ token: signToken({ role: 'client', gallery: gallery.slug }, '2d') });
});

router.get('/:slug', requireGalleryAccess, async (req, res) => {
  const g = await ClientGallery.findOne({ slug: req.params.slug }).lean();
  if (!g) return res.status(404).json({ error: 'Gallery not found' });
  if (isClosed(g) && req.viewer.role !== 'admin') return res.status(410).json({ error: 'This gallery has been closed' });
  const access = accessInfo(g);
  if (access.locked && req.viewer.role !== 'admin') {
    return res.status(402).json({
      error: 'Your free gallery period has ended.', locked: true, access, plans: [],
      gallery: { title: g.title, clientName: g.clientName, cover: await signedUrl(g.cover), photoCount: g.photos.length, videoCount: (g.videos || []).length, favoriteCount: g.photos.filter((p) => p.favorite).length },
    });
  }
  const { passwordHash, ...rest } = g;
  // R2 photos → signed URLs; download links only when the studio allows downloads.
  res.json({ ...(await resolveGallery(rest, { downloads: g.allowDownload !== false })), access, plans: [] });
});

async function loadOpen(req, res) {
  const g = await ClientGallery.findOne({ slug: req.params.slug });
  if (!g) { res.status(404).json({ error: 'Gallery not found' }); return null; }
  if (req.viewer.role !== 'admin' && accessInfo(g).locked) { res.status(402).json({ error: 'Your free gallery period has ended.', locked: true }); return null; }
  return g;
}

/** Toggle a favourite / album pick, or save a note on one photo. */
router.patch('/:slug/photos/:photoId', requireGalleryAccess, async (req, res) => {
  const g = await loadOpen(req, res); if (!g) return;
  if (g.selectionSubmittedAt && req.viewer.role !== 'admin') return res.status(409).json({ error: 'Your selection is already submitted. Contact the studio to make changes.' });
  const photo = g.photos.id(req.params.photoId);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  const { favorite, note } = req.body || {};
  if (typeof favorite === 'boolean') {
    const picked = g.photos.filter((p) => p.favorite).length;
    if (favorite && !photo.favorite && g.selectionLimit && picked >= g.selectionLimit) return res.status(409).json({ error: `You can select up to ${g.selectionLimit} photos` });
    photo.favorite = favorite;
  }
  if (typeof note === 'string') photo.note = note.slice(0, 500);
  await g.save();
  res.json(photo);
});

router.post('/:slug/submit', requireGalleryAccess, async (req, res) => {
  const g = await loadOpen(req, res); if (!g) return;
  if (!g.photos.some((p) => p.favorite)) return res.status(400).json({ error: 'Select at least one photo first' });
  g.selectionSubmittedAt = new Date();
  await g.save();
  res.json({ ok: true, submittedAt: g.selectionSubmittedAt });
});

export default router;
