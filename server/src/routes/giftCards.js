/**
 * Gift cards (ported from BabySteps).
 *
 * Public  (/api/gift-cards):  GET /config · POST /order · POST /verify · GET /check/:code
 * Webhook (/api/gift-cards/webhook): Razorpay payment.captured / order.paid — needs the raw body (see index.js)
 * Admin   (/api/admin/gift-cards): list · create · patch (redeem / cancel / undo) · delete · GET|PUT /settings
 *
 * Flow: the site asks for an order → Razorpay Checkout takes the payment → /verify checks the signature, makes sure
 * the payment is captured and creates the card exactly once (the webhook does the same if the buyer closes the tab).
 * Settings (server/.env): RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, optional RAZORPAY_WEBHOOK_SECRET, email (BREVO_* / SMTP_*),
 * optional SITE_URL for links in the email.
 */
import crypto from 'node:crypto';
import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { GiftCard, GiftPayment, Setting } from '../models/index.js';
import { giftCode, normalizeGiftCode, GIFT_CODE_RX } from '../giftCodes.js';
import { emailEnabled, sendEmail } from '../mailer.js';
import { giftCardBuyerEmail } from '../giftCardEmail.js';
import { DEFAULT_SITE } from '../cms/defaults.js';
import { requireAdmin } from '../middleware/auth.js';
import { fulfilInvitePayment } from '../invites/payments.js';

export const MIN_AMOUNT = 500;
export const MAX_AMOUNT = 200000;
const VALID_MONTHS = 12;
const env = (k) => (process.env[k] || '').trim();
export const keys = () => ({ id: env('RAZORPAY_KEY_ID'), secret: env('RAZORPAY_KEY_SECRET') });
export const hasKeys = () => Boolean(keys().id && keys().secret);
const clip = (v, n) => String(v ?? '').trim().slice(0, n);
const squish = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

/* ---------- validation (same rules as the website form) ---------- */
const NAME_RX = /^[\p{L}\p{M}][\p{L}\p{M} .'’&-]*$/u;
const EMAIL_RX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const phoneDigits = (v) => String(v ?? '').replace(/[\s().-]/g, '');
const isPhone = (v) => /^(?:\+?91|0)?[6-9]\d{9}$/.test(phoneDigits(v)) || /^\+(?!91)[1-9]\d{7,14}$/.test(phoneDigits(v));
const formatPhone = (v) => { const p = phoneDigits(v); if (/^(?:\+?91|0)?[6-9]\d{9}$/.test(p)) { const d = p.slice(-10); return `+91 ${d.slice(0, 5)} ${d.slice(5)}`; } return p; };
function checkName(v, required, label) {
  const s = squish(v);
  if (!s) return required ? `Please enter ${label}.` : '';
  if (s.length < 2 || s.length > 60) return 'Names should be 2–60 characters.';
  return NAME_RX.test(s) ? '' : 'Please use letters only (spaces, . \' - & are fine).';
}
function firstProblem(checks) {
  const fields = Object.fromEntries(Object.entries(checks).filter(([, m]) => m));
  const first = Object.values(fields)[0];
  return first ? { error: first, fields } : null;
}

/* ---------- settings: admin on/off switch ---------- */
async function onlineOn() {
  const s = await Setting.findOne({ key: 'giftCards' }).lean();
  return s?.data?.onlinePayments !== false;
}
const enabled = async () => hasKeys() && (await onlineOn());

/* ---------- Razorpay ---------- */
export async function razorpay(path, { method = 'GET', body } = {}) {
  const { id, secret } = keys();
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(`Razorpay ${res.status}: ${data?.error?.description || 'request failed'}`), { status: 502 });
  return data;
}
export const hmac = (secret, payload) => crypto.createHmac('sha256', secret).update(payload).digest('hex');
export const safeEqual = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

const siteUrl = () => (env('SITE_URL') || (env('CLIENT_ORIGIN').split(',')[0] || '').trim() || 'http://localhost:5173').replace(/\/$/, '');
async function studio() {
  const doc = await Setting.findOne({ key: 'site' }).lean();
  return { ...DEFAULT_SITE, ...(doc?.data || {}) };
}

/** Create the card for a paid order — exactly once, however many times this runs. */
async function fulfil(orderId, paymentId) {
  const pay = await GiftPayment.findOne({ orderId });
  if (!pay) return null;
  let code = pay.giftCode;
  let fresh = false;
  if (!code) {
    let candidate = giftCode();
    while (await GiftCard.exists({ code: candidate })) candidate = giftCode();
    const claimed = await GiftPayment.findOneAndUpdate(
      { orderId, giftCode: null },
      { $set: { giftCode: candidate, status: 'paid', paymentId, paidAt: new Date() } },
      { new: true },
    );
    code = claimed ? candidate : (await GiftPayment.findOne({ orderId }))?.giftCode;
    fresh = Boolean(claimed);
  }
  const d = pay.details || {};
  await GiftCard.updateOne({ code }, {
    $setOnInsert: {
      code, amount: pay.amount, source: 'online', paymentId,
      recipientName: d.recipientName, senderName: d.senderName, senderPhone: d.senderPhone, senderEmail: d.senderEmail, message: d.message,
      expiresAt: new Date(Date.now() + VALID_MONTHS * 30.44 * 86400000),
    },
  }, { upsert: true });
  const card = await GiftCard.findOne({ code }).lean();
  if (fresh) notify(card);
  return card;
}

async function ensureCaptured(paymentId, paise) {
  const p = await razorpay(`/payments/${encodeURIComponent(paymentId)}`);
  if (p.amount !== paise || p.currency !== 'INR') throw Object.assign(new Error('Payment amount does not match the order.'), { status: 400 });
  if (p.status === 'captured' || p.status === 'authorized') {
    const detail = p.card ? [p.card.network, p.card.last4 && `•••• ${p.card.last4}`].filter(Boolean).join(' ') : p.bank || p.vpa || p.wallet || '';
    await GiftPayment.updateOne({ orderId: p.order_id }, { $set: { method: p.method, methodDetail: detail } }).catch(() => {});
  }
  if (p.status === 'captured') return p;
  if (p.status === 'authorized') return razorpay(`/payments/${encodeURIComponent(paymentId)}/capture`, { method: 'POST', body: { amount: paise, currency: 'INR' } });
  throw Object.assign(new Error('The payment did not go through. You have not been charged.'), { status: 400 });
}

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** Email the studio and the buyer. Never throws. */
async function notify(g) {
  if (!emailEnabled()) return;
  const s = await studio();
  const rows = [['Code', g.code], ['Amount', inr(g.amount)], ['From', g.senderName], ['Buyer phone', g.senderPhone], ['Buyer email', g.senderEmail],
    ['For', g.recipientName], ['Message', g.message], ['Valid until', new Date(g.expiresAt).toLocaleDateString('en-IN')], ['Razorpay payment', g.paymentId]].filter(([, v]) => v);
  try {
    await sendEmail({
      subject: `New gift card sold online: ${inr(g.amount)} · ${g.code}`,
      replyTo: g.senderEmail || undefined,
      text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
      html: `<h2 style="font-family:Georgia,serif;color:#a5843f">A gift card was bought online</h2><table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px">${rows.map(([k, v]) => `<tr><td style="color:#6f665d"><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('')}</table><p style="font-family:Arial,sans-serif;font-size:13px;color:#6f665d">It's already active — see Admin → Gift cards.</p>`,
    });
  } catch (e) { console.error('Gift card studio email failed:', e.message); }
  if (!g.senderEmail) return;
  try {
    const site = siteUrl();
    const image = /^https:/.test(site) ? `${site}/images/wedding/w15.jpg` : '';
    await sendEmail({ to: g.senderEmail, replyTo: s.email, ...giftCardBuyerEmail(g, { site, studio: s, image }) });
  } catch (e) { console.error('Gift card buyer email failed:', e.message); }
}

/* ===================== Public ===================== */
export const publicGiftRoutes = Router();
const orderLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts — please try again in a few minutes.' } });
const checkLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

publicGiftRoutes.get('/config', async (_req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json(await enabled() ? { enabled: true, keyId: keys().id, min: MIN_AMOUNT, max: MAX_AMOUNT } : { enabled: false, min: MIN_AMOUNT, max: MAX_AMOUNT });
});

publicGiftRoutes.post('/order', orderLimiter, async (req, res) => {
  if (!(await enabled())) return res.status(503).json({ error: 'Online payment is not available right now — please request on WhatsApp.' });
  const b = req.body || {};
  const amountRaw = String(b.amount ?? '').replace(/[₹,\s]/g, '');
  const amount = Number(amountRaw);
  const problem = firstProblem({
    amount: !/^\d+$/.test(amountRaw) ? 'Use whole rupees only.' : amount < MIN_AMOUNT ? `The minimum is ${inr(MIN_AMOUNT)}.` : amount > MAX_AMOUNT ? `The maximum is ${inr(MAX_AMOUNT)}.` : '',
    senderName: checkName(b.senderName, true, 'your name'),
    senderPhone: !String(b.senderPhone || '').trim() ? 'Please enter your mobile number.' : isPhone(b.senderPhone) ? '' : 'Please enter a valid mobile number.',
    senderEmail: !String(b.senderEmail || '').trim() ? 'Please enter your email — we send the code there.' : EMAIL_RX.test(String(b.senderEmail).trim()) ? '' : 'Please enter a valid email.',
    recipientName: checkName(b.recipientName, false, 'their name'),
    message: String(b.message || '').length > 600 ? 'Please keep the message under 600 characters.' : '',
  });
  if (problem) return res.status(400).json(problem);
  const details = {
    senderName: squish(b.senderName), senderPhone: formatPhone(b.senderPhone), senderEmail: clip(b.senderEmail, 160).toLowerCase(),
    recipientName: squish(b.recipientName), message: clip(b.message, 600),
  };
  try {
    const order = await razorpay('/orders', {
      method: 'POST',
      body: { amount: amount * 100, currency: 'INR', receipt: `gc_${Date.now()}`, notes: { purpose: 'Guide Photo Studio gift card', buyer: details.senderName, recipient: details.recipientName } },
    });
    await GiftPayment.create({ orderId: order.id, amount, details });
    res.status(201).json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: keys().id });
  } catch (e) {
    console.error('Gift card order failed:', e.message);
    res.status(502).json({ error: 'We could not start the payment. Please try again, or request on WhatsApp.' });
  }
});

publicGiftRoutes.post('/verify', orderLimiter, async (req, res) => {
  if (!hasKeys()) return res.status(503).json({ error: 'Online payment is not available right now.' });
  const orderId = clip(req.body?.razorpay_order_id, 60);
  const paymentId = clip(req.body?.razorpay_payment_id, 60);
  const signature = clip(req.body?.razorpay_signature, 200);
  if (!orderId || !paymentId || !signature || !safeEqual(hmac(keys().secret, `${orderId}|${paymentId}`), signature)) {
    return res.status(400).json({ error: 'We could not verify this payment. If money was deducted, please WhatsApp us and we will sort it out.' });
  }
  const pay = await GiftPayment.findOne({ orderId }).lean();
  if (!pay) return res.status(404).json({ error: 'Order not found.' });
  let card;
  try {
    if (!pay.giftCode) await ensureCaptured(paymentId, pay.amount * 100);
    card = await fulfil(orderId, paymentId);
  } catch (e) {
    console.error(`Gift card verify failed (${orderId}):`, e.message);
    return res.status(e.status === 400 ? 400 : 502).json({ error: e.status === 400 ? e.message : 'Your payment is being confirmed. If you do not see your code soon, please WhatsApp us — you will not lose your money.' });
  }
  res.json({ code: card.code, amount: card.amount, recipientName: card.recipientName || '', senderName: card.senderName || '', expiresAt: card.expiresAt });
});

publicGiftRoutes.get('/check/:code', checkLimiter, async (req, res) => {
  const code = normalizeGiftCode(clip(req.params.code, 20));
  if (!GIFT_CODE_RX.test(code)) return res.status(400).json({ error: 'Gift card codes look like GS-XXXX-XXXX.' });
  const g = await GiftCard.findOne({ code }).lean();
  if (!g || g.status === 'cancelled') return res.status(404).json({ error: 'We couldn’t find that gift card. Please check the code.' });
  const expired = g.expiresAt && new Date(g.expiresAt) < new Date();
  res.json({ code: g.code, amount: g.amount, recipientName: g.recipientName || '', expiresAt: g.expiresAt || null, status: g.status === 'redeemed' ? 'redeemed' : expired ? 'expired' : 'active' });
});

/** Razorpay webhook — mount BEFORE express.json() (signature is over the raw body). */
export const giftWebhook = [express.raw({ type: 'application/json', limit: '1mb' }), async (req, res) => {
  const secret = env('RAZORPAY_WEBHOOK_SECRET');
  if (!secret || !Buffer.isBuffer(req.body)) return res.status(404).json({ error: 'Not found' });
  if (!safeEqual(hmac(secret, req.body), req.get('x-razorpay-signature') || '')) return res.status(400).json({ error: 'Bad signature' });
  let event;
  try { event = JSON.parse(req.body.toString('utf8')); } catch { return res.status(400).json({ error: 'Bad payload' }); }
  const p = event?.payload?.payment?.entity;
  if (['payment.captured', 'order.paid'].includes(event?.event) && p?.order_id && p.status === 'captured') {
    if (!(await GiftPayment.exists({ orderId: p.order_id }))) { // not a gift card → maybe an invitation order
      await fulfilInvitePayment(p.order_id, p).catch((e) => console.error('Invite webhook failed:', e.message));
      return res.json({ ok: true });
    }
    const pay = await GiftPayment.findOne({ orderId: p.order_id }).lean();
    if (pay && p.amount === pay.amount * 100) {
      const detail = p.card ? [p.card.network, p.card.last4 && `•••• ${p.card.last4}`].filter(Boolean).join(' ') : p.bank || p.vpa || p.wallet || '';
      await GiftPayment.updateOne({ orderId: p.order_id }, { $set: { method: p.method, methodDetail: detail } }).catch(() => {});
      await fulfil(p.order_id, p.id);
    }
  }
  res.json({ ok: true });
}];

/* ===================== Admin ===================== */
export const adminGiftRoutes = Router();
adminGiftRoutes.use(requireAdmin);
const view = (g) => { const o = g.toObject ? g.toObject() : g; const expired = o.status === 'active' && o.expiresAt && new Date(o.expiresAt) < new Date(); return { ...o, displayStatus: expired ? 'expired' : o.status }; };

adminGiftRoutes.get('/settings', async (_req, res) => {
  res.json({ onlinePayments: await onlineOn(), keysSet: hasKeys(), testMode: keys().id.startsWith('rzp_test_'), emailOn: emailEnabled() });
});
adminGiftRoutes.put('/settings', async (req, res) => {
  await Setting.findOneAndUpdate({ key: 'giftCards' }, { $set: { 'data.onlinePayments': Boolean(req.body?.onlinePayments) } }, { upsert: true });
  res.json({ onlinePayments: await onlineOn(), keysSet: hasKeys(), testMode: keys().id.startsWith('rzp_test_'), emailOn: emailEnabled() });
});
adminGiftRoutes.get('/', async (_req, res) => {
  const cards = await GiftCard.find().sort('-createdAt').lean();
  const pays = await GiftPayment.find({ giftCode: { $in: cards.filter((c) => c.source === 'online').map((c) => c.code) } }).lean();
  const byCode = Object.fromEntries(pays.map((p) => [p.giftCode, p]));
  res.json(cards.map((c) => {
    const p = byCode[c.code];
    return { ...view(c), payment: p ? { paymentId: p.paymentId || c.paymentId, orderId: p.orderId, amount: p.amount, method: p.method || '', methodDetail: p.methodDetail || '', paidAt: p.paidAt || c.createdAt, mode: (p.paymentId || '').startsWith('pay_') && keys().id.startsWith('rzp_test_') ? 'test' : 'live' } : null };
  }));
});
adminGiftRoutes.post('/', async (req, res) => {
  const b = req.body || {};
  const amount = Number(String(b.amount ?? '').replace(/[₹,\s]/g, ''));
  const problem = firstProblem({
    amount: !(Number.isInteger(amount) && amount >= 100 && amount <= 500000) ? 'Enter a whole amount from ₹100 to ₹5,00,000.' : '',
    recipientName: checkName(b.recipientName, false, 'the recipient’s name'),
    senderName: checkName(b.senderName, false, 'the buyer’s name'),
    recipientPhone: b.recipientPhone && !isPhone(b.recipientPhone) ? 'Please enter a valid mobile number.' : '',
    recipientEmail: b.recipientEmail && !EMAIL_RX.test(String(b.recipientEmail).trim()) ? 'Please enter a valid email.' : '',
  });
  if (problem) return res.status(400).json(problem);
  let code = giftCode();
  while (await GiftCard.exists({ code })) code = giftCode();
  const months = Math.min(60, Math.max(1, Number(b.validMonths) || 12));
  const g = await GiftCard.create({
    code, amount, recipientName: squish(b.recipientName), recipientPhone: b.recipientPhone ? formatPhone(b.recipientPhone) : '',
    recipientEmail: clip(b.recipientEmail, 160).toLowerCase(), senderName: squish(b.senderName), message: clip(b.message, 600),
    expiresAt: new Date(Date.now() + months * 30.44 * 86400000),
  });
  res.status(201).json(view(g));
});
adminGiftRoutes.patch('/:id', async (req, res) => {
  const status = req.body?.status;
  if (!['active', 'redeemed', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Unknown status' });
  const g = await GiftCard.findByIdAndUpdate(req.params.id, { status, redeemedAt: status === 'redeemed' ? new Date() : null }, { new: true });
  if (!g) return res.status(404).json({ error: 'Not found' });
  res.json(view(g));
});
adminGiftRoutes.delete('/:id', async (req, res) => {
  await GiftCard.findByIdAndDelete(req.params.id);
  res.status(204).end();
});
