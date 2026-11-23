/**
 * Login rate limits with counters the admin can see and clear (Admin → Login security).
 *
 * express-rate-limit keeps its counters private, so each limiter here gets a small in-memory store that also
 * remembers what it is counting. Counters live in memory: restarting the app clears all of them.
 */
import rateLimit from 'express-rate-limit';

class TrackingStore {
  constructor() { this.hits = new Map(); this.windowMs = 15 * 60 * 1000; this.localKeys = true; }
  init(options) { this.windowMs = options.windowMs; }
  #live(key) {
    const h = this.hits.get(key);
    if (h && h.resetTime <= Date.now()) { this.hits.delete(key); return undefined; }
    return h;
  }
  async get(key) { const h = this.#live(key); return h && { totalHits: h.totalHits, resetTime: new Date(h.resetTime) }; }
  async increment(key) {
    let h = this.#live(key);
    if (!h) { h = { totalHits: 0, resetTime: Date.now() + this.windowMs, first: Date.now() }; this.hits.set(key, h); }
    h.totalHits += 1;
    h.last = Date.now();
    return { totalHits: h.totalHits, resetTime: new Date(h.resetTime) };
  }
  async decrement(key) { const h = this.#live(key); if (h && h.totalHits > 0) h.totalHits -= 1; if (h && h.totalHits === 0) this.hits.delete(key); }
  async resetKey(key) { this.hits.delete(key); }
  async resetAll() { this.hits.clear(); }
  entries() {
    for (const k of [...this.hits.keys()]) this.#live(k); // drop expired
    return [...this.hits.entries()];
  }
}

const registry = new Map(); // id → { label, who, limit, store }

/**
 * Create a tracked limiter.
 *  id     stable name (used by the admin page)
 *  label  what it protects, for people
 *  who    how the key reads: 'ip' | 'ip+email'
 */
export function trackedLimiter({ id, label, who = 'ip', windowMin = 15, limit, message, keyGenerator, ...rest }) {
  const store = new TrackingStore();
  registry.set(id, { label, who, limit, store });
  return rateLimit({
    windowMs: windowMin * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: (req, res, _next, options) => {
      const mins = Math.max(1, Math.ceil(((req.rateLimit?.resetTime?.getTime?.() || Date.now() + options.windowMs) - Date.now()) / 60000));
      res.status(options.statusCode).json({ error: typeof message === 'function' ? message(mins) : (message || `Too many attempts. Please wait ${mins} minute${mins === 1 ? '' : 's'} and try again.`) });
    },
    ...rest,
  });
}

/** Everyone currently being counted, most-blocked first. */
export function listBlocks() {
  const out = [];
  for (const [id, { label, who, limit, store }] of registry) {
    for (const [key, h] of store.entries()) {
      const [ip, email] = who === 'ip+email' ? [key.split('|')[0], key.split('|').slice(1).join('|')] : [key, ''];
      out.push({ limiter: id, label, key, ip, email, attempts: h.totalHits, limit, blocked: h.totalHits >= limit, firstAt: new Date(h.first), lastAt: new Date(h.last || h.first), unlocksAt: new Date(h.resetTime) });
    }
  }
  return out.sort((a, b) => Number(b.blocked) - Number(a.blocked) || b.attempts - a.attempts);
}

/** Clear one counter, or every counter when no key is given. Returns how many were cleared. */
export function clearBlock(limiter, key) {
  if (!limiter) { let n = 0; for (const { store } of registry.values()) { n += store.hits.size; store.hits.clear(); } return n; }
  const r = registry.get(limiter);
  if (!r) return 0;
  return r.store.hits.delete(key) ? 1 : 0;
}

export const limiterInfo = () => [...registry].map(([id, { label, who, limit, store }]) => ({ id, label, who, limit, windowMin: Math.round(store.windowMs / 60000) }));
