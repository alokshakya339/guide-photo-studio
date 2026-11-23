/**
 * Minimal Razorpay Subscriptions client (REST over fetch) + signature helpers.
 *
 * Mode:
 *  - "razorpay": RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set.
 *  - "mock":     keys missing and NODE_ENV !== 'production' -> a fake payment step for local testing.
 *  - "off":      keys missing in production -> subscribing is refused.
 */
import crypto from 'node:crypto';

const API = 'https://api.razorpay.com/v1';

export function paymentMode() {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, NODE_ENV } = process.env;
  if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) return 'razorpay';
  return NODE_ENV === 'production' ? 'off' : 'mock';
}

async function rzp(path, { method = 'GET', body } = {}) {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64'),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.description || `Razorpay request failed (${res.status})`;
    const err = new Error(msg);
    err.status = 502;
    throw err;
  }
  return data;
}

/** Makes sure the plan exists in Razorpay (plans are immutable, so a price change creates a new one). */
export async function ensureRazorpayPlan(plan) {
  if (plan.razorpayPlanId) return plan.razorpayPlanId;
  const created = await rzp('/plans', {
    method: 'POST',
    body: {
      period: plan.period,
      interval: 1,
      item: { name: `Gallery hosting · ${plan.name}`, amount: plan.amount, currency: 'INR', description: plan.description },
      notes: { code: plan.code },
    },
  });
  plan.razorpayPlanId = created.id;
  await plan.save();
  return created.id;
}

/**
 * Creates a subscription. If `startAt` is in the future (client still in the free period),
 * the mandate is set up now and the first charge happens on that date.
 */
export async function createSubscription({ plan, gallerySlug, startAt }) {
  const planId = await ensureRazorpayPlan(plan);
  const body = {
    plan_id: planId,
    total_count: plan.period === 'monthly' ? 60 : 10, // up to 5 / 10 years
    customer_notify: 1,
    notes: { gallery: gallerySlug, plan: plan.code },
  };
  if (startAt && startAt.getTime() > Date.now() + 10 * 60 * 1000) body.start_at = Math.floor(startAt.getTime() / 1000);
  return rzp('/subscriptions', { method: 'POST', body });
}

export const fetchSubscription = (id) => rzp(`/subscriptions/${id}`);

export const cancelSubscription = (id) =>
  rzp(`/subscriptions/${id}/cancel`, { method: 'POST', body: { cancel_at_cycle_end: 1 } });

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Checkout handler signature: HMAC_SHA256(payment_id + "|" + subscription_id, key_secret). */
export function verifyCheckoutSignature({ paymentId, subscriptionId, signature }) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${paymentId}|${subscriptionId}`)
    .digest('hex');
  return safeEqual(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}

/** Adds one billing period, clamping the day (31 Jan + 1 month = 28/29 Feb, not 3 Mar). */
export function addPeriod(date, period) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  if (period === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}
