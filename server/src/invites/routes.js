/**
 * Invites by Guide Studio — API.
 *
 * Public (/api/invites):
 *   GET  /packages                     packages for the landing page
 *   GET  /:slug[?preview=TOKEN]        invitation data (published, or any status with the preview token)
 *   POST /:slug/unlock                 password-protected invitations → short-lived guest token
 *   POST /:slug/rsvp                   guest RSVP
 *   GET  /:slug/wishes · POST          approved blessings · submit a blessing (held for moderation)
 * Admin (/api/admin/invites, admin JWT):
 *   list · create · get · update · delete · upload media · RSVPs (+CSV) · wishes moderation · packages · stats
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requireAdmin } from '../middleware/auth.js';
import { Invitation, InviteRsvp, InviteWish, InvitePackage, DEFAULT_PACKAGES, featuresOf, MAX_GALLERY } from './models.js';
import { putMedia, storageReady } from './storage.js';
import { MusicTrack } from '../models/index.js';
import { sendEmail, emailEnabled } from '../mailer.js';
import { invitePublishedEmail } from '../account/emails.js';

const clip = (v, n) => String(v ?? '').trim().slice(0, n);
const squish = (v, n = 120) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
export const SLUG_RX = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/;
const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;
const NAME_RX = /^[\p{L}\p{M}][\p{L}\p{M} .'’&-]*$/u;
export const isPhone = (v) => { const p = String(v || '').replace(/[\s().-]/g, ''); return /^(?:\+?91|0)?[6-9]\d{9}$/.test(p) || /^\+(?!91)[1-9]\d{7,14}$/.test(p); };
const ytId = (v) => { const s = String(v || '').trim(); const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : /^[A-Za-z0-9_-]{11}$/.test(s) ? s : ''; };
const isUrl = (v) => !v || /^https?:\/\/\S+$/i.test(String(v).trim());

async function ensurePackages() {
  if (!(await InvitePackage.estimatedDocumentCount())) await InvitePackage.insertMany(DEFAULT_PACKAGES);
}

/** Fields guests may see. */
function publicView(inv) {
  const o = inv.toObject ? inv.toObject() : inv;
  const f = featuresOf(o);
  return {
    slug: o.slug, template: o.template, status: o.status,
    partner1: o.partner1, partner2: o.partner2, families: o.families, headline: o.headline,
    weddingDate: o.weddingDate, city: o.city, story: o.story,
    coverPhoto: o.coverPhoto, couplePhoto: o.couplePhoto,
    gallery: f.media ? (o.gallery || []).slice(0, MAX_GALLERY) : [], videoId: f.media ? o.videoId : '',
    music: f.music ? o.music : '', musicTitle: f.music ? o.musicTitle : '',
    events: (o.events || []).map(({ _id, ...e }) => e),
    theme: f.customTheme ? o.theme || {} : {},
    rsvpEnabled: f.rsvp && o.rsvpEnabled, rsvpDeadline: o.rsvpDeadline, wishesEnabled: f.wishes && o.wishesEnabled,
    showStudioCta: o.showStudioCta, hashtag: o.hashtag || '',
    couple: o.couple || {}, timeline: o.timeline || [], family: o.family || [], contacts: o.contacts || [],
    features: { envelope: f.envelope, countdown: f.countdown, animations: f.animations },
  };
}

const guestToken = (slug) => jwt.sign({ role: 'invite-guest', slug }, process.env.JWT_SECRET, { expiresIn: '30d' });
function hasGuestToken(req, slug) {
  try { const p = jwt.verify(String(req.get('x-invite-token') || ''), process.env.JWT_SECRET); return p.role === 'invite-guest' && p.slug === slug; } catch { return false; }
}

/** Find an invitation the visitor may see (published, or preview token). */
async function loadVisible(req, { withPassword = false } = {}) {
  const slug = String(req.params.slug || '').toLowerCase();
  if (!SLUG_RX.test(slug)) return { err: [404, 'Invitation not found'] };
  const inv = await Invitation.findOne({ slug }).select(withPassword ? '+passwordHash' : '');
  if (!inv) return { err: [404, 'Invitation not found'] };
  if (withPassword && !featuresOf(inv).password) inv.passwordHash = ''; // password is a Luxury feature
  const preview = req.query.preview && crypto.timingSafeEqual(Buffer.from(String(req.query.preview).padEnd(48).slice(0, 48)), Buffer.from(inv.previewToken.padEnd(48).slice(0, 48)));
  if (inv.status !== 'published' && !preview) return { err: [404, inv.status === 'archived' ? 'This invitation is no longer available.' : 'This invitation isn’t published yet.'] };
  return { inv, preview: Boolean(preview) };
}

/**
 * A preview link of an invitation that isn't published yet is for looking only: RSVPs and blessings are
 * refused, so an unpaid / unpublished preview can't be used as the real invitation.
 */
const isDraftPreview = (inv, preview) => preview && inv.status !== 'published';
const DRAFT_MSG = 'This is a preview — RSVPs and blessings open once the invitation is published.';

/* ===================== Public ===================== */
export const publicInviteRoutes = Router();
const guestLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts — please try again in a few minutes.' } });

publicInviteRoutes.get('/packages', async (_req, res) => {
  await ensurePackages();
  res.json(await InvitePackage.find({ active: true }).sort('order').lean());
});

/** Published music-library tracks, offered in the invitation editor. */
publicInviteRoutes.get('/music', async (_req, res) => {
  const rows = await MusicTrack.find({ published: true }).sort({ order: 1, createdAt: 1 }).select('title artist mood url').lean();
  res.set('Cache-Control', 'no-store').json(rows);
});

publicInviteRoutes.get('/:slug', async (req, res) => {
  const { inv, preview, err } = await loadVisible(req, { withPassword: true });
  if (err) return res.status(err[0]).json({ error: err[1] });
  res.set('Cache-Control', 'no-store');
  if (inv.passwordHash && !preview && !hasGuestToken(req, inv.slug)) {
    return res.json({ locked: true, slug: inv.slug, partner1: inv.partner1, partner2: inv.partner2, coverPhoto: inv.coverPhoto, template: inv.template, theme: featuresOf(inv).customTheme ? inv.theme : {} });
  }
  if (!preview) Invitation.updateOne({ _id: inv._id }, { $inc: { views: 1 } }).catch(() => {});
  res.json({ ...publicView(inv), preview });
});

publicInviteRoutes.post('/:slug/unlock', guestLimiter, async (req, res) => {
  const { inv, err } = await loadVisible(req, { withPassword: true });
  if (err) return res.status(err[0]).json({ error: err[1] });
  const ok = inv.passwordHash && (await bcrypt.compare(String(req.body?.password || '').slice(0, 100), inv.passwordHash));
  if (!ok) return res.status(401).json({ error: 'That password isn’t right. Please check the message from the couple.' });
  res.json({ token: guestToken(inv.slug) });
});

publicInviteRoutes.post('/:slug/rsvp', guestLimiter, async (req, res) => {
  const { inv, preview, err } = await loadVisible(req, { withPassword: true });
  if (err) return res.status(err[0]).json({ error: err[1] });
  if (inv.passwordHash && !preview && !hasGuestToken(req, inv.slug)) return res.status(401).json({ error: 'Please unlock the invitation first.' });
  if (isDraftPreview(inv, preview)) return res.status(403).json({ error: DRAFT_MSG });
  if (!inv.rsvpEnabled || !featuresOf(inv).rsvp) return res.status(400).json({ error: 'RSVP is closed for this invitation.' });
  const b = req.body || {};
  const fields = {};
  const name = squish(b.name, 80);
  if (name.length < 2 || !NAME_RX.test(name)) fields.name = 'Please enter your name (letters only).';
  if (b.phone && !isPhone(b.phone)) fields.phone = 'Please enter a valid mobile number.';
  if (!['yes', 'no', 'maybe'].includes(b.attending)) fields.attending = 'Will you be joining?';
  const guests = Number(b.guests || 1);
  if (!(Number.isInteger(guests) && guests >= 1 && guests <= 20)) fields.guests = 'Guests must be between 1 and 20.';
  if (Object.keys(fields).length) return res.status(400).json({ error: Object.values(fields)[0], fields });
  const eventNames = new Set(inv.events.map((e) => e.name));
  await InviteRsvp.create({
    invitation: inv._id, name, phone: clip(b.phone, 30), attending: b.attending, guests: b.attending === 'no' ? 1 : guests,
    events: (Array.isArray(b.events) ? b.events : []).filter((e) => eventNames.has(e)).slice(0, 12),
    message: clip(b.message, 600), marketingConsent: b.marketingConsent === true,
  });
  res.status(201).json({ ok: true });
});

publicInviteRoutes.get('/:slug/wishes', async (req, res) => {
  const { inv, err } = await loadVisible(req);
  if (err) return res.status(err[0]).json({ error: err[1] });
  res.json((await InviteWish.find({ invitation: inv._id, approved: true }).sort('-createdAt').limit(60).lean()).map((w) => ({ name: w.name, message: w.message, at: w.createdAt })));
});

publicInviteRoutes.post('/:slug/wishes', guestLimiter, async (req, res) => {
  const { inv, preview, err } = await loadVisible(req);
  if (err) return res.status(err[0]).json({ error: err[1] });
  if (isDraftPreview(inv, preview)) return res.status(403).json({ error: DRAFT_MSG });
  if (!inv.wishesEnabled || !featuresOf(inv).wishes) return res.status(400).json({ error: 'Blessings are closed for this invitation.' });
  const name = squish(req.body?.name, 80);
  const message = clip(req.body?.message, 500);
  if (name.length < 2 || !NAME_RX.test(name)) return res.status(400).json({ error: 'Please enter your name (letters only).', fields: { name: 'Please enter your name.' } });
  if (message.length < 3) return res.status(400).json({ error: 'Please write a short message.', fields: { message: 'Please write a short message.' } });
  await InviteWish.create({ invitation: inv._id, name, message });
  res.status(201).json({ ok: true, pending: true });
});

/* ===================== Admin ===================== */
export const adminInviteRoutes = Router();
adminInviteRoutes.use(requireAdmin);
export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 20 } });

export const EDITABLE = ['template', 'partner1', 'partner2', 'families', 'headline', 'weddingDate', 'city', 'story', 'coverPhoto', 'couplePhoto', 'gallery', 'music', 'musicTitle', 'events', 'theme', 'rsvpEnabled', 'rsvpDeadline', 'wishesEnabled', 'showStudioCta', 'hashtag', 'couple', 'timeline', 'family', 'contacts', 'package', 'client', 'paymentStatus', 'notes'];

export function validateInvite(b, { partial = false } = {}) {
  const f = {};
  if (!partial || b.partner1 !== undefined) if (!squish(b.partner1) || !NAME_RX.test(squish(b.partner1))) f.partner1 = 'Enter the first partner’s name.';
  if (!partial || b.partner2 !== undefined) if (!squish(b.partner2) || !NAME_RX.test(squish(b.partner2))) f.partner2 = 'Enter the second partner’s name.';
  if (b.weddingDate && !DATE_RX.test(b.weddingDate)) f.weddingDate = 'Pick a valid date.';
  if (b.rsvpDeadline && !DATE_RX.test(b.rsvpDeadline)) f.rsvpDeadline = 'Pick a valid date.';
  if (b.videoId && !ytId(b.videoId)) f.videoId = 'Paste a YouTube link or video ID.';
  if (b.client?.phone && !isPhone(b.client.phone)) f.clientPhone = 'Enter a valid mobile number.';
  if (b.client?.email && !/^\S+@\S+\.\S+$/.test(b.client.email)) f.clientEmail = 'Enter a valid email.';
  (Array.isArray(b.contacts) ? b.contacts : []).forEach((c, i) => { if (c?.phone && !isPhone(c.phone)) f[`contact${i}`] = `Contact ${i + 1}: enter a valid mobile number.`; });
  (Array.isArray(b.events) ? b.events : []).forEach((e, i) => {
    if (!squish(e?.name, 60)) f[`event${i}`] = `Event ${i + 1}: add a name (e.g. Haldi).`;
    if (e?.date && !DATE_RX.test(e.date)) f[`event${i}`] = `Event ${i + 1}: pick a valid date.`;
    if (e?.mapUrl && !isUrl(e.mapUrl)) f[`event${i}`] = `Event ${i + 1}: the map link must start with https://`;
  });
  return f;
}

export function pick(b, fields = EDITABLE) {
  const out = {};
  for (const k of fields) if (b[k] !== undefined) out[k] = b[k];
  if (out.partner1) out.partner1 = squish(out.partner1, 60);
  if (out.partner2) out.partner2 = squish(out.partner2, 60);
  if (b.videoId !== undefined) out.videoId = ytId(b.videoId);
  if (out.gallery) out.gallery = out.gallery.filter((u) => /^https?:\/\//.test(u) || u.startsWith('/')).slice(0, MAX_GALLERY);
  if (out.events) out.events = out.events.slice(0, 12).map((e) => ({ name: squish(e.name, 60), date: clip(e.date, 10), time: squish(e.time, 40), venue: squish(e.venue, 120), address: squish(e.address, 240), mapUrl: clip(e.mapUrl, 500), dressCode: squish(e.dressCode, 120), note: clip(e.note, 400), colors: (Array.isArray(e.colors) ? e.colors : []).filter((c) => /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 5) }));
  const media = (u) => (typeof u === 'string' && (/^https?:\/\//.test(u) || u.startsWith('/')) ? u.slice(0, 500) : '');
  if (out.hashtag !== undefined) out.hashtag = squish(out.hashtag, 60);
  if (out.couple) { const c = out.couple || {}; out.couple = { p1Parents: squish(c.p1Parents, 160), p1Bio: clip(c.p1Bio, 300), p1Photo: media(c.p1Photo), p2Parents: squish(c.p2Parents, 160), p2Bio: clip(c.p2Bio, 300), p2Photo: media(c.p2Photo) }; }
  const list = (v) => (Array.isArray(v) ? v : []);
  if (out.timeline) out.timeline = list(out.timeline).slice(0, 12).map((t) => ({ year: squish(t?.year, 20), title: squish(t?.title, 80), text: clip(t?.text, 400) })).filter((t) => t.title || t.text);
  if (out.family) out.family = list(out.family).slice(0, 12).map((m) => ({ name: squish(m?.name, 80), relation: squish(m?.relation, 80), photo: media(m?.photo) })).filter((m) => m.name);
  if (out.contacts) out.contacts = list(out.contacts).slice(0, 6).map((m) => ({ name: squish(m?.name, 80), role: squish(m?.role, 80), phone: String(m?.phone || '').replace(/[^\d+]/g, '').slice(0, 16) })).filter((m) => m.name && m.phone);
  return out;
}

export const counts = async (ids) => {
  const [r, w] = await Promise.all([
    InviteRsvp.aggregate([{ $match: { invitation: { $in: ids } } }, { $group: { _id: '$invitation', responses: { $sum: 1 }, yes: { $sum: { $cond: [{ $eq: ['$attending', 'yes'] }, 1, 0] } }, guests: { $sum: { $cond: [{ $eq: ['$attending', 'yes'] }, '$guests', 0] } } } }]),
    InviteWish.aggregate([{ $match: { invitation: { $in: ids }, approved: false } }, { $group: { _id: '$invitation', pending: { $sum: 1 } } }]),
  ]);
  const by = {};
  r.forEach((x) => { by[x._id] = { ...(by[x._id] || {}), responses: x.responses, yes: x.yes, guests: x.guests }; });
  w.forEach((x) => { by[x._id] = { ...(by[x._id] || {}), pendingWishes: x.pending }; });
  return by;
};

adminInviteRoutes.get('/', async (_req, res) => {
  const list = await Invitation.find().sort('-updatedAt').populate('owner', 'name email phone').lean();
  const by = await counts(list.map((i) => i._id));
  res.json({ storage: storageReady(), invitations: list.map((i) => ({ ...i, stats: { responses: 0, yes: 0, guests: 0, pendingWishes: 0, ...(by[i._id] || {}) } })) });
});

adminInviteRoutes.get('/stats', async (_req, res) => {
  const [total, published, views, rsvps] = await Promise.all([
    Invitation.countDocuments(), Invitation.countDocuments({ status: 'published' }),
    Invitation.aggregate([{ $group: { _id: null, v: { $sum: '$views' } } }]), InviteRsvp.countDocuments(),
  ]);
  res.json({ total, published, views: views[0]?.v || 0, rsvps });
});

adminInviteRoutes.post('/', async (req, res) => {
  const b = req.body || {};
  const slug = String(b.slug || '').toLowerCase().trim();
  const f = validateInvite(b);
  if (!SLUG_RX.test(slug)) f.slug = 'Use 3–60 lowercase letters, numbers and dashes (e.g. riya-raman).';
  else if (await Invitation.exists({ slug })) f.slug = 'That link is already taken.';
  if (Object.keys(f).length) return res.status(400).json({ error: Object.values(f)[0], fields: f });
  const inv = await Invitation.create({ ...pick(b), slug, previewToken: crypto.randomBytes(16).toString('hex') });
  res.status(201).json(inv);
});

adminInviteRoutes.get('/:id', async (req, res) => {
  const inv = await Invitation.findById(req.params.id).select('+passwordHash').populate('owner', 'name email phone').lean();
  if (!inv) return res.status(404).json({ error: 'Not found' });
  const { passwordHash, ...rest } = inv;
  res.json({ ...rest, hasPassword: Boolean(passwordHash) });
});

adminInviteRoutes.put('/:id', async (req, res) => {
  const b = req.body || {};
  const f = validateInvite(b, { partial: true });
  if (Object.keys(f).length) return res.status(400).json({ error: Object.values(f)[0], fields: f });
  const update = pick(b);
  if (b.slug !== undefined) {
    const slug = String(b.slug).toLowerCase().trim();
    if (!SLUG_RX.test(slug)) return res.status(400).json({ error: 'Use 3–60 lowercase letters, numbers and dashes.', fields: { slug: 'Invalid link' } });
    if (await Invitation.exists({ slug, _id: { $ne: req.params.id } })) return res.status(400).json({ error: 'That link is already taken.', fields: { slug: 'Taken' } });
    update.slug = slug;
  }
  if (b.status !== undefined) {
    if (!['draft', 'preview', 'published', 'archived'].includes(b.status)) return res.status(400).json({ error: 'Unknown status' });
    update.status = b.status;
    if (b.status === 'published') update.publishedAt = new Date();
  }
  if (b.clientApproved === true) update.clientApprovedAt = new Date();
  if (b.password !== undefined) update.passwordHash = b.password ? await bcrypt.hash(String(b.password).slice(0, 100), 10) : '';
  if (b.regeneratePreview) update.previewToken = crypto.randomBytes(16).toString('hex');
  const before = await Invitation.findById(req.params.id).select('status').lean();
  if (!before) return res.status(404).json({ error: 'Not found' });
  const inv = await Invitation.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).populate('owner', 'name email phone');
  if (!inv) return res.status(404).json({ error: 'Not found' });
  // Tell the customer when the studio publishes the invitation they created.
  if (update.status === 'published' && before.status !== 'published' && inv.owner?.email && emailEnabled()) {
    const site = (process.env.SITE_URL || String(process.env.CLIENT_ORIGIN || '').split(',')[0] || '').replace(/\/$/, '');
    sendEmail({ to: inv.owner.email, ...invitePublishedEmail({ name: inv.owner.name, couple: `${inv.partner1} & ${inv.partner2}`, url: `${site}/invite/${inv.slug}` }) })
      .catch((e) => console.error('Invite published email failed:', e.message));
  }
  res.json(inv);
});

adminInviteRoutes.delete('/:id', async (req, res) => {
  const inv = await Invitation.findByIdAndDelete(req.params.id);
  if (inv) await Promise.all([InviteRsvp.deleteMany({ invitation: inv._id }), InviteWish.deleteMany({ invitation: inv._id })]);
  res.status(204).end();
});

adminInviteRoutes.post('/upload', upload.array('files', 20), async (req, res) => {
  const folder = String(req.body?.folder || 'misc');
  const out = [];
  for (const f of req.files || []) {
    try { out.push({ name: f.originalname, ...(await putMedia({ buffer: f.buffer, mimetype: f.mimetype, folder })) }); }
    catch (e) { out.push({ name: f.originalname, error: e.message }); }
  }
  res.json(out);
});

adminInviteRoutes.get('/:id/rsvps', async (req, res) => {
  res.json(await InviteRsvp.find({ invitation: req.params.id }).sort('-createdAt').lean());
});
adminInviteRoutes.get('/:id/rsvps.csv', async (req, res) => {
  const inv = await Invitation.findById(req.params.id).lean();
  if (!inv) return res.status(404).end();
  const rows = await InviteRsvp.find({ invitation: inv._id }).sort('createdAt').lean();
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = ['Name,Phone,Attending,Guests,Events,Message,Marketing consent,Received']
    .concat(rows.map((r) => [r.name, r.phone, r.attending, r.guests, (r.events || []).join('; '), r.message, r.marketingConsent ? 'yes' : 'no', new Date(r.createdAt).toISOString()].map(q).join(',')))
    .join('\n');
  res.set('Content-Type', 'text/csv; charset=utf-8').set('Content-Disposition', `attachment; filename="rsvps-${inv.slug}.csv"`).send(`﻿${csv}`);
});
adminInviteRoutes.delete('/rsvps/:rid', async (req, res) => { await InviteRsvp.findByIdAndDelete(req.params.rid); res.status(204).end(); });

adminInviteRoutes.get('/:id/wishes', async (req, res) => {
  res.json(await InviteWish.find({ invitation: req.params.id }).sort('-createdAt').lean());
});
adminInviteRoutes.patch('/wishes/:wid', async (req, res) => {
  const w = await InviteWish.findByIdAndUpdate(req.params.wid, { approved: Boolean(req.body?.approved) }, { new: true });
  if (!w) return res.status(404).json({ error: 'Not found' });
  res.json(w);
});
adminInviteRoutes.delete('/wishes/:wid', async (req, res) => { await InviteWish.findByIdAndDelete(req.params.wid); res.status(204).end(); });

/* packages (prices editable) */
export const adminInvitePackageRoutes = Router();
adminInvitePackageRoutes.use(requireAdmin);
adminInvitePackageRoutes.get('/', async (_req, res) => { await ensurePackages(); res.json(await InvitePackage.find().sort('order').lean()); });
adminInvitePackageRoutes.put('/:code', async (req, res) => {
  const b = req.body || {};
  const price = Number(String(b.price ?? '').replace(/[₹,\s]/g, ''));
  if (b.price !== undefined && !(Number.isInteger(price) && price >= 0 && price <= 1000000)) return res.status(400).json({ error: 'Enter a whole price in rupees.' });
  const update = {};
  if (b.price !== undefined) update.price = price;
  if (b.name !== undefined) update.name = squish(b.name, 60);
  if (b.tagline !== undefined) update.tagline = squish(b.tagline, 160);
  if (Array.isArray(b.features)) update.features = b.features.map((x) => squish(x, 120)).filter(Boolean).slice(0, 12);
  if (b.active !== undefined) update.active = Boolean(b.active);
  if (b.highlight !== undefined) update.highlight = Boolean(b.highlight);
  const p = await InvitePackage.findOneAndUpdate({ code: req.params.code }, update, { new: true });
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

/* ===================== WhatsApp / social preview ===================== */
const escAttr = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** Serves the built site's index.html for /invite/:slug with the couple's names + photo in the meta tags. */
export function inviteHtml(clientDist) {
  let cache = { at: 0, html: '' };
  return async (req, res, next) => {
    try {
      const file = path.join(clientDist, 'index.html');
      const st = fs.statSync(file);
      if (st.mtimeMs !== cache.at) cache = { at: st.mtimeMs, html: fs.readFileSync(file, 'utf8') };
      const inv = await Invitation.findOne({ slug: String(req.params.slug).toLowerCase(), status: 'published' }).lean();
      // Unpublished / unknown: still keep it out of search results and give it a sensible title.
      if (!inv) return res.set('Cache-Control', 'no-cache').type('html').send(cache.html.replace(/<title>[\s\S]*?<\/title>/, '<title>Wedding Invitation · Guide Studio</title>').replace('</head>', '    <meta name="robots" content="noindex, nofollow" />\n  </head>'));
      const title = `${inv.partner1} & ${inv.partner2} · Wedding Invitation`;
      const date = inv.weddingDate ? new Date(`${inv.weddingDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      const desc = `You're invited to celebrate ${inv.partner1} & ${inv.partner2}${date ? ` · ${date}` : ''}${inv.city ? ` · ${inv.city}` : ''}. Tap to open the invitation.`;
      const img = inv.coverPhoto && /^https?:/.test(inv.coverPhoto) ? inv.coverPhoto : '';
      const tags = [
        `<title>${escAttr(title)}</title>`,
        `<meta name="description" content="${escAttr(desc)}" />`,
        '<meta name="robots" content="noindex" />',
        `<meta property="og:title" content="${escAttr(title)}" />`,
        `<meta property="og:description" content="${escAttr(desc)}" />`,
        '<meta property="og:type" content="website" />',
        img && `<meta property="og:image" content="${escAttr(img)}" />`,
        '<meta name="twitter:card" content="summary_large_image" />',
      ].filter(Boolean).join('\n    ');
      const html = cache.html
        .replace(/<title>[\s\S]*?<\/title>/, '')
        .replace(/<meta name="description"[\s\S]*?\/>/, '')
        .replace(/<meta property="og:[^>]*>\s*/g, '')
        .replace('</head>', `    ${tags}\n  </head>`);
      res.set('Cache-Control', 'no-cache').type('html').send(html);
    } catch (e) { next(e); }
  };
}
