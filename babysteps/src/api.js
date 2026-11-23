// Talks to BabySteps' own server (babysteps/server).
// Dev: Vite proxies /api and /uploads → http://127.0.0.1:5060.
// Production: the server serves this site too (same origin), so VITE_API_URL stays empty. Only set it if the
// API is hosted on a different domain (then add this site's origin to CLIENT_ORIGIN in server/.env).
const BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(message, status, data) { super(message); this.status = status; this.data = data; }
}

export async function api(path, { method = 'GET', body, token, keepalive = false } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      keepalive, // only for small fire-and-forget requests (64 KB browser limit)
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach the studio server. Please check your connection and try again.', 0);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data);
  return data;
}

/** Per-gallery token in localStorage (guarded for private browsing). */
const LAST_GALLERY = 'babysteps-gallery-last';
/** True while a JWT's `exp` is still in the future (signature is checked by the server). */
const tokenAlive = (t) => {
  try {
    const { exp } = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return !exp || exp * 1000 > Date.now();
  } catch { return false; }
};
export const galleryToken = {
  key: (slug) => `babysteps-gallery-${slug}`,
  get(slug) {
    try {
      const t = localStorage.getItem(this.key(slug));
      if (t && !tokenAlive(t)) { this.set(slug, null); return null; }
      return t;
    } catch { return null; }
  },
  set(slug, t) {
    try {
      if (t) { localStorage.setItem(this.key(slug), t); localStorage.setItem(LAST_GALLERY, slug); }
      else {
        localStorage.removeItem(this.key(slug));
        if (localStorage.getItem(LAST_GALLERY) === slug) localStorage.removeItem(LAST_GALLERY);
      }
    } catch { /* ignore */ }
  },
  /** Slug of the gallery the client is still signed in to, if any. */
  current() {
    try {
      const slug = localStorage.getItem(LAST_GALLERY);
      return slug && this.get(slug) ? slug : null;
    } catch { return null; }
  },
};

/* Uploaded photos come back as paths ("/uploads/…"). Same origin → used as-is; separate API domain → prefixed. */
const ASSET_BASE = import.meta.env.VITE_API_URL || '';
export const asset = (src) => {
  const s = String(src || '');
  return s.startsWith('/') && !s.startsWith('//') ? `${ASSET_BASE}${s}` : s;
};

/** Drive thumbnails can be requested at any width; other URLs are returned unchanged. */
export function sized(src, width) {
  const s = asset(src);
  return /drive\.google\.com\/thumbnail\?/.test(s) ? s.replace(/([?&])sz=w\d+/, `$1sz=w${width}`) : s;
}
export function downloadUrl(src) {
  const m = String(src || '').match(/drive\.google\.com\/thumbnail\?id=([-\w]{20,})/);
  return m ? `https://drive.google.com/uc?export=download&id=${m[1]}` : asset(src);
}
