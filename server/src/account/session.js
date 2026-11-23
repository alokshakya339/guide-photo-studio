/**
 * Customer sessions: a signed JWT in an httpOnly cookie (never readable by page scripts).
 *  - SameSite=Lax + an Origin check on writes protect against cross-site requests (CSRF).
 *  - The token carries the customer's tokenVersion; bumping it (password change / reset / "sign out everywhere")
 *    invalidates every existing session at once.
 */
import jwt from 'jsonwebtoken';
import { Customer } from '../models/index.js';

export const COOKIE = 'gps_session';
const MAX_AGE_DAYS = 30;
const isProd = () => process.env.NODE_ENV === 'production';

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return null; }
    }
  }
  return null;
}

const cookieOpts = () => ({
  httpOnly: true,
  secure: isProd(),
  sameSite: 'lax',
  path: '/',
});

export function startSession(res, customer) {
  const token = jwt.sign({ role: 'customer', sub: String(customer._id), v: customer.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: `${MAX_AGE_DAYS}d` });
  res.cookie(COOKIE, token, { ...cookieOpts(), maxAge: MAX_AGE_DAYS * 24 * 60 * 60 * 1000 });
}

export function endSession(res) {
  res.clearCookie(COOKIE, cookieOpts());
}

/** The signed-in customer, or null. Invalid / outdated tokens are treated as signed out. */
export async function currentCustomer(req, { select = '' } = {}) {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); } catch { return null; }
  if (payload.role !== 'customer' || !payload.sub) return null;
  const c = await Customer.findById(payload.sub).select(select);
  if (!c || c.disabled || (c.tokenVersion || 0) !== payload.v) return null;
  return c;
}

/** Route guard: 401 unless signed in. Sets req.customer. */
export async function requireCustomer(req, res, next) {
  try {
    const c = await currentCustomer(req);
    if (!c) { endSession(res); return res.status(401).json({ error: 'Please log in to continue.', code: 'auth' }); }
    req.customer = c;
    next();
  } catch (e) { next(e); }
}

/** Requires a verified email (for anything that reveals data tied to an email address). */
export function requireVerified(req, res, next) {
  if (!req.customer?.emailVerifiedAt) return res.status(403).json({ error: 'Please verify your email address first — check your inbox for the link.', code: 'unverified' });
  next();
}

/**
 * CSRF defence in depth for cookie-authenticated writes: if the browser sends an Origin header, its host must be
 * this site's (the request Host / X-Forwarded-Host, CLIENT_ORIGIN or SITE_URL). In development, localhost and
 * private-network addresses (phones on the same Wi-Fi) are allowed too. SameSite=Lax is the primary protection.
 */
const hostOf = (u) => { try { return new URL(u).host.toLowerCase(); } catch { return ''; } };
const PRIVATE_HOST = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;
export function sameOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();
  const host = hostOf(origin);
  const allowed = new Set([
    req.get('host'),
    ...String(req.get('x-forwarded-host') || '').split(','),
    ...String(process.env.CLIENT_ORIGIN || '').split(',').map(hostOf),
    hostOf(String(process.env.SITE_URL || '').trim()),
  ].map((h) => String(h || '').trim().toLowerCase()).filter(Boolean));
  if (allowed.has(host) || (!isProd() && PRIVATE_HOST.test(host))) return next();
  return res.status(403).json({ error: 'Request blocked (unexpected origin).' });
}
