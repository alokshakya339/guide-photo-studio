/**
 * Form validation shared by the website and the server (server/src imports this file too), so both always
 * apply the same rules. Each checker returns '' when the value is fine, or a short message to show under the field.
 */

/* ---------- Patterns ---------- */
export const RX = {
  // Letters (any language), spaces and . ' ’ & - — e.g. "Riya & Karan", "D'Souza", "Anne-Marie"
  name: /^[\p{L}\p{M}][\p{L}\p{M} .'’&-]*$/u,
  // Indian mobile: optional +91 / 91 / 0, then 10 digits starting 6–9
  phoneIN: /^(?:\+?91|0)?[6-9]\d{9}$/,
  // Other countries: + and 8–15 digits
  phoneIntl: /^\+(?!91)[1-9]\d{7,14}$/,
  email: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/,
  giftCode: /^BS-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/,
  slug: /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
  isoDate: /^\d{4}-\d{2}-\d{2}$/,
  digits: /^\d+$/,
  babyAge: /^[\p{L}\p{N} .,'’/()+-]*$/u,
  url: /^https?:\/\/[^\s/$.?#][^\s]*$/i,
  instagramUrl: /^https:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/,
  instagramHandle: /^@[A-Za-z0-9._]{1,30}$/,
  whatsapp: /^[1-9]\d{9,14}$/,
  telHref: /^tel:\+?\d{8,15}$/,
  // Control characters (except tab/newline) never belong in a form field
  control: /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/,
};

/* ---------- Clean-up helpers (also used before saving) ---------- */
export const squish = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
export const phoneDigits = (v) => String(v ?? '').replace(/[\s().-]/g, '');
/** "98765 43210" → "+91 98765 43210"; other countries keep their + code. */
export function formatPhone(v) {
  const p = phoneDigits(v);
  if (RX.phoneIN.test(p)) { const d = p.slice(-10); return `+91 ${d.slice(0, 5)} ${d.slice(5)}`; }
  return p;
}
/** "bs k7p2 9qxm" / "BSK7P29QXM" → "BS-K7P2-9QXM" */
export function normalizeGiftCode(v) {
  const raw = String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = raw.startsWith('BS') ? raw.slice(2) : raw;
  return body.length === 8 ? `BS-${body.slice(0, 4)}-${body.slice(4)}` : String(v ?? '').trim().toUpperCase();
}

/* ---------- Checkers: (value, opts) → '' | message ---------- */
const empty = (v) => v == null || String(v).trim() === '';

export function checkName(v, { required = true, label = 'name', min = 2, max = 60 } = {}) {
  const s = squish(v);
  if (!s) return required ? `Please enter ${label}.` : '';
  if (s.length < min) return `That ${label.replace(/^(your|the) /, '')} looks too short.`;
  if (s.length > max) return `Please keep it under ${max} characters.`;
  if (!RX.name.test(s)) return 'Please use letters only (spaces, . \' - & are fine).';
  return '';
}

export function checkPhone(v, { required = true } = {}) {
  if (empty(v)) return required ? 'Please enter your mobile number.' : '';
  const p = phoneDigits(v);
  if (/[^\d+]/.test(p)) return 'Use digits only — e.g. 98765 43210.';
  if (RX.phoneIN.test(p) || RX.phoneIntl.test(p)) return '';
  const d = p.replace(/^\+/, '');
  if (d.length < 10) return 'Mobile number is too short — enter 10 digits.';
  if (/^(?:91|0)?[0-5]/.test(d) && d.replace(/^(?:91|0)/, '').length === 10) return 'Indian mobile numbers start with 6, 7, 8 or 9.';
  return 'Please enter a valid mobile number (10 digits, or + country code).';
}

export function checkEmail(v, { required = false } = {}) {
  const s = String(v ?? '').trim();
  if (!s) return required ? 'Please enter your email.' : '';
  if (s.length > 160) return 'That email is too long.';
  if (!RX.email.test(s)) return 'Please enter a valid email — e.g. name@gmail.com.';
  return '';
}

export function checkGiftCode(v, { required = false } = {}) {
  if (empty(v)) return required ? 'Please enter the gift card code.' : '';
  return RX.giftCode.test(normalizeGiftCode(v)) ? '' : 'Gift card codes look like BS-XXXX-XXXX.';
}

export function checkText(v, { required = false, label = 'this', max = 600, min = 0 } = {}) {
  const s = String(v ?? '').trim();
  if (!s) return required ? `Please fill in ${label}.` : '';
  if (s.length < min) return `Please write at least ${min} characters.`;
  if (s.length > max) return `Please keep it under ${max} characters (now ${s.length}).`;
  if (RX.control.test(s)) return 'Please remove unusual characters.';
  return '';
}

export function checkBabyAge(v) {
  const s = squish(v);
  if (!s) return '';
  if (s.length > 40) return 'Please keep it short — e.g. "30 weeks" or "3 months".';
  if (!RX.babyAge.test(s)) return 'Use words and numbers only — e.g. "30 weeks" or "3 months".';
  return '';
}

/** Preferred / shoot date: YYYY-MM-DD, real date, optionally not in the past and not too far ahead. */
export function checkDate(v, { required = false, future = false, maxYears = 2 } = {}) {
  if (empty(v)) return required ? 'Please pick a date.' : '';
  const s = String(v).trim();
  if (!RX.isoDate.test(s)) return 'Please pick a valid date.';
  const [y, m, day] = s.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  if (d.getFullYear() !== y || d.getMonth() !== m - 1 || d.getDate() !== day) return 'Please pick a valid date.'; // e.g. 31 Feb
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (future && d < today) return 'Please pick today or a future date.';
  const limit = new Date(today); limit.setFullYear(limit.getFullYear() + maxYears);
  if (d > limit) return `Please pick a date within the next ${maxYears} years.`;
  return '';
}

export function checkAmount(v, { min = 1, max = 1000000, required = true } = {}) {
  if (empty(v)) return required ? 'Please enter an amount.' : '';
  const s = String(v).replace(/[₹,\s]/g, '');
  if (!RX.digits.test(s)) return 'Use whole rupees only — e.g. 5000.';
  const n = Number(s);
  if (n < min) return `The minimum is ₹${min.toLocaleString('en-IN')}.`;
  if (n > max) return `The maximum is ₹${max.toLocaleString('en-IN')}.`;
  return '';
}

export function checkInt(v, { min = 0, max = 100000, required = false, label = 'a number' } = {}) {
  if (empty(v)) return required ? `Please enter ${label}.` : '';
  const s = String(v).trim();
  if (!RX.digits.test(s)) return 'Use whole numbers only.';
  const n = Number(s);
  if (n < min || n > max) return `Use a number from ${min} to ${max}.`;
  return '';
}

export function checkSlug(v, { required = true } = {}) {
  const s = String(v ?? '').trim();
  if (!s) return required ? 'Please enter the gallery name.' : '';
  if (s.length < 3 || s.length > 50) return 'Use 3–50 characters.';
  if (!RX.slug.test(s)) return 'Use lowercase letters, numbers and dashes only — e.g. baby-aarav.';
  return '';
}

export function checkPassword(v, { required = true, min = 6, max = 100, label = 'password' } = {}) {
  const s = String(v ?? '');
  if (!s) return required ? `Please enter the ${label}.` : '';
  if (s.length < min) return `Use at least ${min} characters.`;
  if (s.length > max) return `Use at most ${max} characters.`;
  if (/\s/.test(s)) return 'Passwords can’t contain spaces.';
  return '';
}

export function checkUrl(v, { required = false, kind = 'url' } = {}) {
  const s = String(v ?? '').trim();
  if (!s) return required ? 'Please enter a link.' : '';
  if (kind === 'instagram') return RX.instagramUrl.test(s) ? '' : 'Use the full profile link — e.g. https://www.instagram.com/babystepsbyguide/';
  return RX.url.test(s) ? '' : 'Links must start with https://';
}

/* ---------- Run a whole form ---------- */
/**
 * rules: { field: (value, allValues) => '' | message }
 * Returns { field: message } for every field that has a problem (empty object = all good).
 */
export function validateAll(values, rules) {
  const errors = {};
  for (const [k, rule] of Object.entries(rules)) {
    const msg = rule(values?.[k], values);
    if (msg) errors[k] = msg;
  }
  return errors;
}
export const firstError = (errors) => Object.values(errors)[0] || '';
