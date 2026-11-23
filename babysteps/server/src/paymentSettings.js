import { Setting } from './models.js';

const KEY = 'payments';

/** Admin switch for online (Razorpay) payments. On by default once the keys are set. */
export async function onlinePaymentsOn() {
  const s = await Setting.findOne({ key: KEY }).lean();
  return s?.data?.razorpayEnabled !== false;
}

export async function setOnlinePayments(on) {
  await Setting.findOneAndUpdate({ key: KEY }, { $set: { 'data.razorpayEnabled': Boolean(on) } }, { upsert: true });
}

/**
 * Charges added on top of the gift-card value at checkout (editable in Admin → Gift cards).
 *  - platform fee: platformFeePercent % of the card value + platformFeeFlat ₹
 *  - GST: gstPercent % of (card value + platform fee)
 */
export const DEFAULT_CHARGES = { gstPercent: 18, platformFeePercent: 2, platformFeeFlat: 0 };
const clamp = (v, max, d) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n * 100) / 100, max) : d; };

export async function getCharges() {
  const c = (await Setting.findOne({ key: KEY }).lean())?.data?.charges || {};
  return {
    gstPercent: clamp(c.gstPercent, 28, DEFAULT_CHARGES.gstPercent),
    platformFeePercent: clamp(c.platformFeePercent, 10, DEFAULT_CHARGES.platformFeePercent),
    platformFeeFlat: clamp(c.platformFeeFlat, 1000, DEFAULT_CHARGES.platformFeeFlat),
  };
}

export async function setCharges(input = {}) {
  const cur = await getCharges();
  const next = {
    gstPercent: clamp(input.gstPercent ?? cur.gstPercent, 28, cur.gstPercent),
    platformFeePercent: clamp(input.platformFeePercent ?? cur.platformFeePercent, 10, cur.platformFeePercent),
    platformFeeFlat: clamp(input.platformFeeFlat ?? cur.platformFeeFlat, 1000, cur.platformFeeFlat),
  };
  await Setting.findOneAndUpdate({ key: KEY }, { $set: { 'data.charges': next } }, { upsert: true });
  return next;
}

/** Smallest gift-card value (₹) a buyer can choose online. Editable in Admin → Gift cards. */
export const DEFAULT_MIN_AMOUNT = 500;
export const MAX_AMOUNT = 200000;
const cleanMin = (v, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 1 ? Math.min(n, MAX_AMOUNT) : d; };

export async function getMinAmount() {
  return cleanMin((await Setting.findOne({ key: KEY }).lean())?.data?.minAmount, DEFAULT_MIN_AMOUNT);
}

export async function setMinAmount(v) {
  const next = cleanMin(v, await getMinAmount());
  await Setting.findOneAndUpdate({ key: KEY }, { $set: { 'data.minAmount': next } }, { upsert: true });
  return next;
}

/** Breakdown in paise for a card value in rupees. The website mirrors this exact formula for its summary. */
export function priceBreakdown(amount, c) {
  const base = Math.round(amount * 100);
  const platformFee = Math.round((base * c.platformFeePercent) / 100) + Math.round(c.platformFeeFlat * 100);
  const gst = Math.round(((base + platformFee) * c.gstPercent) / 100);
  return { base, platformFee, gst, total: base + platformFee + gst };
}
