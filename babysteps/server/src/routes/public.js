import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Setting, Inquiry, GiftCard } from '../models.js';
import { notifyNewInquiry } from '../mailer.js';
import { ensureValid, checkName, checkPhone, checkEmail, checkBabyAge, checkDate, checkGiftCode, checkText, formatPhone, normalizeGiftCode, squish } from '../validate.js';

const router = Router();
const inquiryLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many enquiries — please WhatsApp us instead.' } });
const giftLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const clip = (v, n) => String(v ?? '').trim().slice(0, n);

/** Website content edited in /admin. Empty object → the site renders its built-in defaults. */
router.get('/babysteps/content', async (_req, res) => {
  const doc = await Setting.findOne({ key: 'babysteps' }).lean();
  res.set('Cache-Control', 'no-cache');
  res.json(doc?.data || {});
});

router.get('/health', (_req, res) => res.json({ ok: true }));

/** Booking enquiry: saved for the admin, optionally emailed. The visitor's WhatsApp message is sent separately. */
router.post('/inquiries', inquiryLimiter, async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.status(201).json({ ok: true }); // honeypot: bots fill hidden fields
  if (!ensureValid(res, b, {
    name: (v) => checkName(v, { label: 'your name' }),
    phone: (v) => checkPhone(v),
    email: (v) => checkEmail(v),
    babyAge: (v) => checkBabyAge(v),
    preferredDate: (v) => checkDate(v, { future: true }),
    giftCode: (v) => checkGiftCode(v),
    message: (v) => checkText(v, { max: 2000 }),
    session: (v) => checkText(v, { max: 60 }),
    package: (v) => checkText(v, { max: 80 }),
  })) return;
  const q = await Inquiry.create({
    name: squish(b.name), phone: formatPhone(b.phone), email: clip(b.email, 160).toLowerCase(), session: squish(b.session), package: squish(b.package),
    babyAge: squish(b.babyAge), preferredDate: clip(b.preferredDate, 10), giftCode: b.giftCode ? normalizeGiftCode(b.giftCode) : '', message: clip(b.message, 2000),
  });
  notifyNewInquiry(q); // fire-and-forget
  res.status(201).json({ ok: true, id: q._id });
});

/** Check a gift card (public, limited fields). */
router.get('/gift-cards/:code', giftLimiter, async (req, res) => {
  const code = normalizeGiftCode(clip(req.params.code, 20));
  if (checkGiftCode(code, { required: true })) return res.status(400).json({ error: 'Gift card codes look like BS-XXXX-XXXX.' });
  const g = await GiftCard.findOne({ code }).lean();
  if (!g || g.status === 'cancelled') return res.status(404).json({ error: 'We couldn’t find that gift card. Please check the code.' });
  const expired = g.expiresAt && new Date(g.expiresAt) < new Date();
  res.json({ code: g.code, amount: g.amount, recipientName: g.recipientName || '', expiresAt: g.expiresAt || null, status: g.status === 'redeemed' ? 'redeemed' : expired ? 'expired' : 'active' });
});

export default router;
