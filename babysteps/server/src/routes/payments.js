/**
 * Online gift-card payments with Razorpay (mounted at /api/payments).
 *
 * Flow: the site asks for an order → Razorpay Checkout takes the payment → the site sends the signed result to
 * /verify, which checks the signature, makes sure the payment is captured and creates the gift card.
 * The optional webhook (/webhook) does the same if the buyer closes the tab before /verify runs, so a paid
 * order always ends up with a card. Creating the card is idempotent: it happens once per order, whichever arrives first.
 *
 * Settings (server/.env): RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, optional RAZORPAY_WEBHOOK_SECRET.
 * Without the key pair, /config reports { enabled: false } and the site keeps only the WhatsApp option.
 */
import crypto from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { GiftCard, Payment } from '../models.js';
import { giftCode } from '../giftCodes.js';
import { emailEnabled, sendEmail } from '../mailer.js';
import { onlinePaymentsOn, getCharges, priceBreakdown, getMinAmount, MAX_AMOUNT } from '../paymentSettings.js';
import { giftCardBuyerEmail } from '../giftCardEmail.js';
import { ensureValid, checkAmount, checkName, checkPhone, checkEmail, checkText, formatPhone, squish } from '../validate.js';
import { content as siteContent, origin } from '../seo.js';

const router = Router();
const env = (k) => (process.env[k] || '').trim();
const keys = () => ({ id: env('RAZORPAY_KEY_ID'), secret: env('RAZORPAY_KEY_SECRET') });
const hasKeys = () => Boolean(keys().id && keys().secret);
/** Keys are set AND the admin switch is on. */
const enabled = async () => hasKeys() && await onlinePaymentsOn();
const clip = (v, n) => String(v ?? '').trim().slice(0, n);

const VALID_MONTHS = 12;

const orderLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts — please try again in a few minutes.' } });

async function razorpay(path, { method = 'GET', body } = {}) {
  const { id, secret } = keys();
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Razorpay ${res.status}: ${data?.error?.description || 'request failed'}`);
    err.status = 502;
    throw err;
  }
  return data;
}

/** What the buyer pays for an order, in paise (card value + platform fee + GST). */
const paidPaise = (pay) => pay.charges?.total || pay.amount * 100;

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const hmac = (secret, payload) => crypto.createHmac('sha256', secret).update(payload).digest('hex');

/** Public settings for the checkout button. */
router.get('/config', async (_req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json(await enabled() ? { enabled: true, keyId: keys().id, min: await getMinAmount(), max: MAX_AMOUNT, charges: await getCharges() } : { enabled: false, min: await getMinAmount(), max: MAX_AMOUNT });
});

/** Step 1: create a Razorpay order for a gift card. The amount is fixed here, server-side. */
router.post('/gift-card/order', orderLimiter, async (req, res) => {
  if (!await enabled()) return res.status(503).json({ error: 'Online payment is not available right now — please request on WhatsApp.' });
  const b = req.body || {};
  const minAmount = await getMinAmount();
  if (!ensureValid(res, b, {
    amount: (v) => checkAmount(v, { min: minAmount, max: MAX_AMOUNT }),
    senderName: (v) => checkName(v, { label: 'your name' }),
    senderPhone: (v) => checkPhone(v),
    senderEmail: (v) => checkEmail(v, { required: true }),
    recipientName: (v) => checkName(v, { required: false, label: 'their name' }),
    recipientPhone: (v) => checkPhone(v, { required: false }),
    recipientEmail: (v) => checkEmail(v),
    message: (v) => checkText(v, { max: 600 }),
  })) return;
  const amount = Number(String(b.amount).replace(/[₹,\s]/g, ''));
  const details = {
    senderName: squish(b.senderName), senderPhone: formatPhone(b.senderPhone), senderEmail: clip(b.senderEmail, 160).toLowerCase(),
    recipientName: squish(b.recipientName), recipientPhone: b.recipientPhone ? formatPhone(b.recipientPhone) : '', recipientEmail: clip(b.recipientEmail, 160).toLowerCase(),
    message: clip(b.message, 600),
  };
  try {
    // GST and platform fee are added on top of the card value — always computed here, never trusted from the browser.
    const rates = await getCharges();
    const price = priceBreakdown(amount, rates);
    const order = await razorpay('/orders', {
      method: 'POST',
      body: {
        amount: price.total, currency: 'INR', receipt: `gc_${Date.now()}`,
        notes: { purpose: 'BabySteps gift card', buyer: details.senderName, recipient: details.recipientName, card_value: `₹${amount}`, platform_fee_paise: price.platformFee, gst_paise: price.gst },
      },
    });
    await Payment.create({ orderId: order.id, amount, details, charges: { platformFee: price.platformFee, gst: price.gst, total: price.total, ...rates } });
    res.status(201).json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: keys().id, breakdown: price });
  } catch (e) {
    console.error('Gift card order failed:', e.message);
    res.status(502).json({ error: 'We could not start the payment. Please try again, or request on WhatsApp.' });
  }
});

/** Create the gift card for a paid order — exactly once, however many times it's called. */
async function fulfil(orderId, paymentId, site) {
  const pay = await Payment.findOne({ orderId });
  if (!pay) return null;
  let code = pay.giftCode;
  let fresh = false;
  if (!code) {
    let candidate = giftCode();
    while (await GiftCard.exists({ code: candidate })) candidate = giftCode();
    // Claim the order atomically so a parallel /verify + webhook can't create two cards.
    const claimed = await Payment.findOneAndUpdate(
      { orderId, giftCode: null },
      { $set: { giftCode: candidate, status: 'paid', paymentId, paidAt: new Date() } },
      { new: true },
    );
    code = claimed ? candidate : (await Payment.findOne({ orderId }))?.giftCode;
    fresh = Boolean(claimed);
  }
  const d = pay.details || {};
  await GiftCard.updateOne({ code }, {
    $setOnInsert: {
      code, amount: pay.amount, source: 'online', paymentId,
      recipientName: d.recipientName, recipientPhone: d.recipientPhone, recipientEmail: d.recipientEmail,
      senderName: d.senderName, senderPhone: d.senderPhone, senderEmail: d.senderEmail, message: d.message,
      expiresAt: new Date(Date.now() + VALID_MONTHS * 30.44 * 86400000),
    },
  }, { upsert: true });
  const card = await GiftCard.findOne({ code }).lean();
  if (fresh) notifyGiftCard(card, site, pay.charges);
  return card;
}

/** Make sure the money is actually taken (orders normally auto-capture; capture here if not). */
async function ensureCaptured(paymentId, expectedPaise) {
  const p = await razorpay(`/payments/${encodeURIComponent(paymentId)}`);
  if (p.amount !== expectedPaise || p.currency !== 'INR') throw Object.assign(new Error('Payment amount does not match the order.'), { status: 400 });
  if (p.status === 'captured') return p;
  if (p.status === 'authorized') return razorpay(`/payments/${encodeURIComponent(paymentId)}/capture`, { method: 'POST', body: { amount: expectedPaise, currency: 'INR' } });
  throw Object.assign(new Error('The payment did not go through. You have not been charged.'), { status: 400 });
}

/** Step 2: the browser sends Razorpay's signed result; on success, return the new gift card. */
router.post('/gift-card/verify', orderLimiter, async (req, res) => {
  if (!hasKeys()) return res.status(503).json({ error: 'Online payment is not available right now.' });
  const orderId = clip(req.body?.razorpay_order_id, 60);
  const paymentId = clip(req.body?.razorpay_payment_id, 60);
  const signature = clip(req.body?.razorpay_signature, 200);
  if (!orderId || !paymentId || !signature || !safeEqual(hmac(keys().secret, `${orderId}|${paymentId}`), signature)) {
    return res.status(400).json({ error: 'We could not verify this payment. If money was deducted, please WhatsApp us and we will sort it out.' });
  }
  const pay = await Payment.findOne({ orderId }).lean();
  if (!pay) return res.status(404).json({ error: 'Order not found.' });
  let card;
  try {
    if (!pay.giftCode) await ensureCaptured(paymentId, paidPaise(pay));
    card = await fulfil(orderId, paymentId, origin(req));
  } catch (e) {
    console.error(`Gift card verify failed (${orderId}):`, e.message);
    return res.status(e.status === 400 ? 400 : 502).json({ error: e.status === 400 ? e.message : 'Your payment is being confirmed. If you do not see your code soon, please WhatsApp us — you will not lose your money.' });
  }
  res.json({ code: card.code, amount: card.amount, paid: paidPaise(pay) / 100, recipientName: card.recipientName || '', senderName: card.senderName || '', expiresAt: card.expiresAt });
});

/** Optional Razorpay webhook (events: payment.captured, order.paid). Needs the raw body — see index.js. */
router.post('/webhook', async (req, res) => {
  const secret = env('RAZORPAY_WEBHOOK_SECRET');
  if (!secret || !Buffer.isBuffer(req.body)) return res.status(404).json({ error: 'Not found' });
  if (!safeEqual(hmac(secret, req.body), req.get('x-razorpay-signature') || '')) return res.status(400).json({ error: 'Bad signature' });
  let event;
  try { event = JSON.parse(req.body.toString('utf8')); } catch { return res.status(400).json({ error: 'Bad payload' }); }
  const p = event?.payload?.payment?.entity;
  if (['payment.captured', 'order.paid'].includes(event?.event) && p?.order_id && p.status === 'captured') {
    const pay = await Payment.findOne({ orderId: p.order_id }).lean();
    if (pay && p.amount === paidPaise(pay)) await fulfil(p.order_id, p.id, origin(req));
  }
  res.json({ ok: true });
});

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const day = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

/** Email the studio (and the buyer, if they gave an email). Never throws. */
const inrPaise = (p) => `₹${(p / 100).toLocaleString('en-IN', { minimumFractionDigits: p % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

async function notifyGiftCard(g, site, charges) {
  if (!emailEnabled()) return;
  const paid = charges?.total ? [['Platform fee', inrPaise(charges.platformFee)], [`GST (${charges.gstPercent}%)`, inrPaise(charges.gst)], ['Total paid', inrPaise(charges.total)]] : [];
  const rows = [['Code', g.code], ['Amount', inr(g.amount)], ...paid, ['From', g.senderName], ['Buyer phone', g.senderPhone], ['Buyer email', g.senderEmail],
    ['For', g.recipientName], ['Recipient phone', g.recipientPhone], ['Recipient email', g.recipientEmail], ['Message', g.message], ['Valid until', day(g.expiresAt)], ['Razorpay payment', g.paymentId]]
    .filter(([, v]) => v);
  const table = `<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px">${rows.map(([k, v]) => `<tr><td style="color:#74615a"><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('')}</table>`;
  try {
    await sendEmail({
      subject: `New gift card sold online: ${inr(g.amount)} · ${g.code}`,
      replyTo: g.senderEmail || undefined,
      text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
      html: `<h2 style="font-family:Georgia,serif;color:#a4664f">A gift card was bought online</h2>${table}<p style="font-family:Arial,sans-serif;font-size:13px;color:#74615a">It's already active — see BabySteps admin → Gift cards.</p>`,
    });
  } catch (e) { console.error('Gift card studio email failed:', e.message); }
  if (!g.senderEmail) return;
  try {
    const c = await siteContent();
    // Email clients can't load images from localhost, so only add the photo banner on a real https site.
    const img = c.images.newborn || '';
    const image = /^https:/.test(site) ? (/^https?:/.test(img) ? img : `${site}${img.startsWith('/') ? '' : '/'}${img}`) : '';
    const mail = giftCardBuyerEmail(g, { site, studio: c.studio, image });
    await sendEmail({ to: g.senderEmail, replyTo: c.studio.email, ...mail });
  } catch (e) { console.error('Gift card buyer email failed:', e.message); }
}

export default router;
