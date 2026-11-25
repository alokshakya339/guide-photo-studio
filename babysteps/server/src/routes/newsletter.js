/**
 * Newsletter: public sign-up / unsubscribe (mounted at /api/newsletter) and the admin side —
 * subscribers and email broadcasts (mounted at /api/admin/newsletter, behind requireAdmin).
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Subscriber, Broadcast, Inquiry, GiftCard, ClientGallery } from '../models.js';
import { emailEnabled, emailProvider } from '../mailer.js';
import { checkEmail, checkName, squish } from '../validate.js';
import { content as siteContent, origin } from '../seo.js';
import { broadcastEmail, newToken, runBroadcast, sendTest, quota, setDailyLimit } from '../newsletter.js';

const clip = (v, n) => String(v ?? '').trim().slice(0, n);
const validEmail = (e) => !checkEmail(e, { required: true });

/** Add (or re-subscribe) one address. Never re-subscribes someone who unsubscribed unless `force` (they asked again). */
async function addSubscriber({ email, name = '', source = 'website' }, { force = false } = {}) {
  const e = clip(email, 160).toLowerCase();
  if (!validEmail(e)) return 'invalid';
  const existing = await Subscriber.findOne({ email: e });
  if (!existing) { await Subscriber.create({ email: e, name: squish(name).slice(0, 120), source, token: newToken() }); return 'added'; }
  if (existing.status === 'unsubscribed' && !force) return 'unsubscribed';
  if (existing.status === 'unsubscribed') { existing.status = 'subscribed'; existing.unsubscribedAt = undefined; }
  if (!existing.name && name) existing.name = squish(name).slice(0, 120);
  await existing.save();
  return 'exists';
}

/* ---------------- Public ---------------- */
export const publicRouter = Router();
const signupLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many tries — please try again in a few minutes.' } });

publicRouter.post('/subscribe', signupLimiter, async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.status(201).json({ ok: true }); // honeypot
  if (!validEmail(b.email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (b.name && checkName(b.name, { required: false })) return res.status(400).json({ error: 'Please check your name.' });
  await addSubscriber({ email: b.email, name: b.name, source: 'website' }, { force: true }); // they're asking, so re-subscribe
  res.status(201).json({ ok: true });
});

const byToken = (t) => (/^[a-f0-9]{20,64}$/.test(String(t)) ? Subscriber.findOne({ token: t }) : null);
const hide = (e) => e.replace(/^(.{2})[^@]*(@.*)$/, '$1•••$2'); // the link may be forwarded: don't show the full address

publicRouter.get('/unsubscribe/:token', async (req, res) => {
  const s = await byToken(req.params.token);
  if (!s) return res.status(404).json({ error: 'This unsubscribe link is not valid any more.' });
  res.set('Cache-Control', 'no-store');
  res.json({ email: hide(s.email), status: s.status });
});
// Also the one-click target of the List-Unsubscribe header (Gmail / Apple Mail "Unsubscribe" button).
publicRouter.post('/unsubscribe/:token', async (req, res) => {
  const s = await byToken(req.params.token);
  if (!s) return res.status(404).json({ error: 'This unsubscribe link is not valid any more.' });
  if (s.status !== 'unsubscribed') { s.status = 'unsubscribed'; s.unsubscribedAt = new Date(); await s.save(); }
  res.json({ ok: true, status: s.status });
});
publicRouter.post('/resubscribe/:token', async (req, res) => {
  const s = await byToken(req.params.token);
  if (!s) return res.status(404).json({ error: 'This link is not valid any more.' });
  s.status = 'subscribed'; s.unsubscribedAt = undefined; await s.save();
  res.json({ ok: true, status: s.status });
});

/* ---------------- Admin ---------------- */
export const adminRouter = Router();

adminRouter.get('/subscribers', async (_req, res) => {
  const items = await Subscriber.find().sort('-createdAt').select('-token').lean();
  res.json({ items, emailEnabled: emailEnabled(), emailProvider: emailProvider() });
});

/** Paste a list: one per line, "email", "Name <email>" or "email, Name". */
adminRouter.post('/subscribers', async (req, res) => {
  const lines = String(req.body?.list || '').split(/[\n;]+/).map((l) => l.trim()).filter(Boolean).slice(0, 5000);
  const tally = { added: 0, exists: 0, invalid: 0, unsubscribed: 0 };
  for (const line of lines) {
    const m = line.match(/^(.*?)<([^>]+)>$/) || null;
    let email; let name = '';
    if (m) { name = m[1].replace(/["',]/g, '').trim(); email = m[2]; } else {
      const parts = line.split(/[,\t]/).map((p) => p.trim());
      email = parts.find((p) => p.includes('@')) || parts[0];
      name = parts.filter((p) => p !== email).join(' ');
    }
    tally[await addSubscriber({ email, name, source: 'admin' })] += 1;
  }
  res.json(tally);
});

/** Bring in emails people already gave the studio (enquiries, gift cards, client galleries). Skips anyone who unsubscribed. */
adminRouter.post('/subscribers/import', async (_req, res) => {
  const [inq, gifts, gals] = await Promise.all([
    Inquiry.find({ email: { $nin: [null, ''] } }).select('name email').lean(),
    GiftCard.find().select('senderName senderEmail recipientName recipientEmail').lean(),
    ClientGallery.find({ clientEmail: { $nin: [null, ''] } }).select('clientName clientEmail').lean(),
  ]);
  const people = [
    ...inq.map((x) => ({ email: x.email, name: x.name, source: 'enquiry' })),
    ...gifts.flatMap((g) => [{ email: g.senderEmail, name: g.senderName, source: 'gift-card' }, { email: g.recipientEmail, name: g.recipientName, source: 'gift-card' }]),
    ...gals.map((g) => ({ email: g.clientEmail, name: g.clientName, source: 'client' })),
  ].filter((p) => p.email);
  const tally = { added: 0, exists: 0, invalid: 0, unsubscribed: 0 };
  for (const p of people) tally[await addSubscriber(p)] += 1;
  res.json(tally);
});

adminRouter.patch('/subscribers/:id', async (req, res) => {
  const { status, name } = req.body || {};
  const s = await Subscriber.findById(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  if (status === 'subscribed' || status === 'unsubscribed') { s.status = status; s.unsubscribedAt = status === 'unsubscribed' ? new Date() : undefined; }
  if (typeof name === 'string') s.name = squish(name).slice(0, 120);
  await s.save();
  res.json({ ok: true });
});
adminRouter.delete('/subscribers/:id', async (req, res) => { await Subscriber.findByIdAndDelete(req.params.id); res.status(204).end(); });

/* Daily sending limit */
adminRouter.get('/limit', async (_req, res) => { res.set('Cache-Control', 'no-store'); res.json(await quota()); });
adminRouter.put('/limit', async (req, res) => {
  const n = Math.round(Number(req.body?.limit));
  if (!Number.isFinite(n) || n < 1 || n > 100000) return res.status(400).json({ error: 'Enter a daily limit between 1 and 100,000.' });
  await setDailyLimit(n);
  res.json(await quota());
});

/* Broadcasts */
function draftOf(b = {}) {
  const d = {
    subject: clip(b.subject, 150), preheader: clip(b.preheader, 150), heading: clip(b.heading, 150), body: String(b.body ?? '').slice(0, 20000),
    image: clip(b.image, 1000), buttonText: clip(b.buttonText, 60), buttonUrl: clip(b.buttonUrl, 1000),
  };
  if (!d.subject) return { error: 'Add a subject line.' };
  if (!d.body.trim()) return { error: 'Write the message.' };
  if (d.buttonText && !d.buttonUrl) return { error: 'Add a link for the button (or clear the button text).' };
  if (d.buttonUrl && !/^(https?:\/\/|\/)/i.test(d.buttonUrl)) return { error: 'The button link must start with https:// or / (a page on this site).' };
  if (d.image && !/^(https?:\/\/|\/)/i.test(d.image)) return { error: 'The image must be a web address or an uploaded photo.' };
  return { draft: d };
}

adminRouter.post('/preview', async (req, res) => {
  const { studio } = await siteContent();
  const b = { subject: 'Subject', body: '', ...req.body };
  res.json({ html: broadcastEmail(b, { site: origin(req), studio, sub: { name: req.body?.sampleName || '', token: 'preview' } }).html });
});

adminRouter.post('/test', async (req, res) => {
  const { draft, error } = draftOf(req.body);
  if (error) return res.status(400).json({ error });
  if (!emailEnabled()) return res.status(400).json({ error: 'Email is not set up on the server yet.' });
  const to = clip(req.body?.to, 160) || req.admin?.email;
  if (!validEmail(to)) return res.status(400).json({ error: 'Enter a valid email for the test.' });
  try { await sendTest(draft, { site: origin(req), to }); res.json({ ok: true, to }); } catch (e) { res.status(502).json({ error: `Sending failed: ${e.message}` }); }
});

adminRouter.get('/broadcasts', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ items: await Broadcast.find().sort('-createdAt').limit(200).lean() });
});

adminRouter.post('/broadcasts', async (req, res) => {
  const { draft, error } = draftOf(req.body);
  if (error) return res.status(400).json({ error });
  if (!emailEnabled()) return res.status(400).json({ error: 'Email is not set up on the server yet.' });
  const total = await Subscriber.countDocuments({ status: 'subscribed' });
  if (!total) return res.status(400).json({ error: 'There are no subscribers to send to yet.' });
  if (await Broadcast.exists({ status: 'sending' })) return res.status(409).json({ error: 'Another email is still sending — wait for it to finish, or pause it first.' });
  const b = await Broadcast.create({ ...draft, site: origin(req), total, status: 'sending', startedAt: new Date() });
  runBroadcast(b._id); // background
  res.status(201).json({ item: b });
});

adminRouter.post('/broadcasts/:id/:action', async (req, res) => {
  const { id, action } = req.params;
  const b = await Broadcast.findById(id);
  if (!b) return res.status(404).json({ error: 'Not found' });
  if (action === 'pause' && b.status === 'sending') { b.status = 'paused'; b.note = 'Paused by you.'; }
  else if (action === 'resume' && b.status === 'paused') {
    if (await Broadcast.exists({ status: 'sending', _id: { $ne: b._id } })) return res.status(409).json({ error: 'Another email is still sending.' });
    b.status = 'sending'; b.note = '';
  } else if (action === 'cancel' && (b.status === 'paused' || b.status === 'sending')) { b.status = 'cancelled'; b.finishedAt = new Date(); }
  else return res.status(400).json({ error: 'That can’t be done right now.' });
  await b.save();
  if (b.status === 'sending') runBroadcast(b._id);
  res.json({ item: b });
});

adminRouter.delete('/broadcasts/:id', async (req, res) => {
  const b = await Broadcast.findById(req.params.id);
  if (b?.status === 'sending') return res.status(409).json({ error: 'Pause or cancel it first.' });
  await Broadcast.findByIdAndDelete(req.params.id);
  res.status(204).end();
});
