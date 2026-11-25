/**
 * Direct-to-R2 upload for client galleries.
 * For each photo the browser makes a web version (2400px) and a thumbnail (700px), asks the server for
 * presigned PUT URLs, uploads all three files straight to Cloudflare R2, then tells the server to add them.
 * Nothing large passes through the Node host, so galleries of hundreds of photos upload in one go.
 *
 * Phone / iPad care:
 *  - Safari can't encode WebP (it silently returns PNG), so previews fall back to JPEG there.
 *  - One photo is decoded at a time on touch devices, canvases are released straight after use and the
 *    thumbnail is made from the web version — full-size iPhone photos otherwise exhaust Safari's memory.
 *  - The page yields between photos so progress, scrolling and buttons stay responsive.
 *  - Uploads retry on flaky mobile connections, and the screen is kept awake while uploading.
 */
import { api } from '../api.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

const BATCH = 10; // files per presign/complete round-trip
const TOUCH = typeof window !== 'undefined' && (navigator.maxTouchPoints > 1 || window.matchMedia?.('(pointer: coarse)').matches);
const PREPARE_PARALLEL = TOUCH ? 1 : 3; // photos decoded at once
const UPLOAD_PARALLEL = TOUCH ? 2 : 3; // photos uploading at once

const nextFrame = () => new Promise((r) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => setTimeout(r, 0)) : setTimeout(r, 0)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** WebP where the browser can encode it, else JPEG (Safari on iPhone/iPad). Checked once. */
let previewMime = null;
async function previewType() {
  if (previewMime) return previewMime;
  const c = document.createElement('canvas');
  c.width = c.height = 2;
  const b = await new Promise((r) => c.toBlob(r, 'image/webp', 0.8));
  c.width = c.height = 0;
  previewMime = b?.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  return previewMime;
}

async function decode(file) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* fall back to <img> (e.g. HEIC on Safari) */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const im = new Image();
    im.decoding = 'async';
    im.src = url;
    await im.decode();
    return im;
  } finally { URL.revokeObjectURL(url); }
}

function draw(source, maxSide) {
  const w0 = source.naturalWidth || source.width, h0 = source.naturalHeight || source.height;
  const k = Math.min(1, maxSide / Math.max(w0, h0));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w0 * k)); canvas.height = Math.max(1, Math.round(h0 * k));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

const encode = (canvas, type, quality) => new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('could not encode'))), type, quality));
const release = (canvas) => { canvas.width = 0; canvas.height = 0; }; // frees memory immediately on iOS

async function prepare(file, type) {
  let source;
  try { source = await decode(file); } catch {
    throw new Error(`${file.name}: this browser can't read the file${/hei[cf]/i.test(file.type + file.name) ? ' (HEIC — export as JPG, or upload from Safari)' : ''}`);
  }
  let webCanvas, thumbCanvas;
  try {
    webCanvas = draw(source, 2400);
    source.close?.(); source = null; // drop the full-size decode before encoding
    const w = webCanvas.width, h = webCanvas.height;
    const web = await encode(webCanvas, type, type === 'image/webp' ? 0.84 : 0.86);
    thumbCanvas = draw(webCanvas, 700); // thumbnail from the web version: no second full-size decode
    release(webCanvas);
    const thumb = await encode(thumbCanvas, type, 0.78);
    return { file, web, thumb, type, w, h };
  } finally {
    source?.close?.();
    if (webCanvas) release(webCanvas);
    if (thumbCanvas) release(thumbCanvas);
  }
}

async function put(url, body, type) {
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { method: 'PUT', body, headers: { 'Content-Type': type } });
      if (res.ok) return;
      last = new Error(`storage returned ${res.status}`);
      if (res.status === 403 && attempt > 0) break; // signature / size problem — retrying won't help
    } catch (e) { last = e; }
    await sleep(800 * 2 ** attempt); // 0.8s, 1.6s, 3.2s — rides out mobile network blips
  }
  throw last;
}

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; await fn(items[k], k); }
  }));
}

/** Keep the screen on while uploading (iPad / phones would otherwise sleep and pause the upload). */
async function keepAwake() {
  let lock = null;
  const request = async () => { try { lock = await navigator.wakeLock?.request('screen'); } catch { /* not supported / denied */ } };
  // The lock is dropped when the tab is hidden; take it again when the admin comes back.
  const onVisible = () => { if (document.visibilityState === 'visible' && (!lock || lock.released)) request(); };
  await request();
  document.addEventListener('visibilitychange', onVisible);
  return () => { document.removeEventListener('visibilitychange', onVisible); lock?.release?.().catch(() => {}); };
}

const mimeOf = (f) => (/^image\//.test(f.type) ? f.type : null) || (/\.hei[cf]$/i.test(f.name) ? 'image/heic' : /\.png$/i.test(f.name) ? 'image/png' : 'image/jpeg');
const networkMsg = (m) => (/failed to fetch|load failed|network/i.test(m) ? 'upload blocked or connection lost (check internet / R2 CORS)' : m);

const IMAGE_NAME = /\.(jpe?g|png|webp|avif|hei[cf]|tiff?)$/i;

/** Download one Google Drive photo (full size) through the studio server, with retries. */
async function fetchDrive({ id, name }, token) {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/client-galleries-drive/file/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const blob = await res.blob();
        const fileName = name || decodeURIComponent(res.headers.get('X-File-Name') || '') || `drive-${id.slice(0, 8)}.jpg`;
        const f = new File([blob], fileName, { type: blob.type });
        return new File([f], fileName, { type: mimeOf(f) }); // Drive sometimes says application/octet-stream
      }
      const data = await res.json().catch(() => ({}));
      last = new Error(data.error || `server returned ${res.status}`);
      if (res.status < 500) break; // not shared / too big — retrying won't help
    } catch (e) { last = e; }
    await sleep(1000 * 2 ** attempt);
  }
  throw new Error(`${name || id}: ${networkMsg(last?.message || 'download failed')}`);
}

/**
 * Upload files to a gallery. onProgress({ done, total, failed, current }) is called as photos finish.
 * Returns { added, errors }.
 */
export async function uploadToR2({ slug, files, drive, token, onProgress }) {
  // `drive`: [{ id, name }] Google Drive photos — each is downloaded (full size) just before it is processed.
  const list = drive ? [...drive] : [...files].filter((f) => /^image\//.test(f.type) || IMAGE_NAME.test(f.name));
  // Downloaded Drive files live in memory (picked files are read from disk), so keep fewer at once on phones.
  const batchSize = drive ? (TOUCH ? 3 : 6) : BATCH;
  const errors = [];
  let done = 0, added = 0, current = '';
  const tick = () => onProgress?.({ done, total: list.length, failed: errors.length, current });
  tick();
  if (!list.length) return { added, errors: ['No photos selected'] };

  const type = await previewType();
  const stopAwake = await keepAwake();
  try {
    for (let b = 0; b < list.length; b += batchSize) {
      const chunk = list.slice(b, b + batchSize);
      const ready = [];
      await pool(chunk, PREPARE_PARALLEL, async (item) => {
        current = item.name || 'Google Drive photo'; tick();
        try {
          const file = drive ? await fetchDrive(item, token) : item;
          current = file.name; tick();
          ready.push(await prepare(file, type));
        } catch (e) { errors.push(e.message); done++; tick(); }
        await nextFrame(); // let the page repaint / scroll between photos
      });
      if (!ready.length) continue;

      let uploads;
      try {
        ({ uploads } = await api(`/admin/client-galleries/${slug}/uploads`, {
          method: 'POST', token,
          body: { files: ready.map((r) => ({ name: r.file.name, type: mimeOf(r.file), size: r.file.size, webSize: r.web.size, thumbSize: r.thumb.size, previewType: r.type })) },
        }));
      } catch (e) {
        ready.forEach((r) => errors.push(`${r.file.name}: ${e.message}`)); done += ready.length; tick();
        continue;
      }

      const finished = [];
      await pool(ready, UPLOAD_PARALLEL, async (r, k) => {
        const u = uploads[k];
        try {
          if (u.error) throw new Error(u.error);
          await Promise.all([put(u.put.orig, r.file, mimeOf(r.file)), put(u.put.web, r.web, r.type), put(u.put.thumb, r.thumb, r.type)]);
          finished.push({ id: u.id, type: mimeOf(r.file), previewType: r.type, name: r.file.name, w: r.w, h: r.h });
        } catch (e) {
          errors.push(e.message.startsWith(r.file.name) ? e.message : `${r.file.name}: ${networkMsg(e.message)}`);
        }
        done++; tick();
      });

      if (finished.length) {
        const res = await api(`/admin/client-galleries/${slug}/uploads/complete`, { method: 'POST', token, body: { uploads: finished } });
        added += res.added;
        errors.push(...res.errors);
      }
    }
  } finally { stopAwake(); }
  current = ''; tick();
  return { added, errors };
}
