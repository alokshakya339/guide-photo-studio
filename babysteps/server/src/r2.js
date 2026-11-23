/**
 * Cloudflare R2 (S3-compatible) storage for client-gallery photos — same R2 account as Guide Photo Studio.
 *
 * Every photo is stored as three objects under STORAGE_PREFIX/<gallery-slug>/:
 *   <id>-orig.<ext>  the untouched file (used only for downloads)
 *   <id>-web.webp    ~2400px version for the lightbox   (.jpg when the browser can't encode WebP — iPhone/iPad Safari)
 *   <id>-thumb.webp  ~700px version for the grid
 * The admin's browser makes the web/thumb versions and uploads all three straight to R2 with short-lived
 * presigned PUT URLs, so large galleries never pass through (or time out on) the Node host.
 *
 * Photos are referenced in MongoDB as "r2:<key>" and turned into signed GET URLs when a gallery is read,
 * so the bucket can stay private. Signatures are pinned to 6-hour windows, so the same URL repeats for hours
 * and browsers can cache the images.
 */
import crypto from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const env = (k) => (process.env[k] || '').trim();
let client = null;
const s3 = () => (client ||= new S3Client({
  region: env('STORAGE_REGION') || 'auto',
  endpoint: env('STORAGE_ENDPOINT'),
  credentials: { accessKeyId: env('STORAGE_ACCESS_KEY'), secretAccessKey: env('STORAGE_SECRET_KEY') },
}));
const bucket = () => env('STORAGE_BUCKET');

export const r2Ready = () => Boolean(bucket() && env('STORAGE_ENDPOINT') && env('STORAGE_ACCESS_KEY') && env('STORAGE_SECRET_KEY'));
export const prefix = () => (env('STORAGE_PREFIX') || 'babysteps-galleries').replace(/^\/+|\/+$/g, '');
const galleryDir = (slug) => `${prefix()}/${String(slug).replace(/[^a-z0-9-]/g, '')}/`;

export const MAX_ORIGINAL = 60 * 1024 * 1024; // 60 MB per original photo
const MAX_DERIVED = 15 * 1024 * 1024;
const ORIGINAL_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/heic': 'heic', 'image/heif': 'heif', 'image/tiff': 'tif' };
const ID = /^[a-f0-9]{20}$/;

export const isR2 = (src) => String(src || '').startsWith('r2:');
const keyOf = (ref) => String(ref).slice(3);

const PREVIEW_TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg' };
const previewType = (t) => (PREVIEW_TYPES[t] ? t : 'image/webp');

/** Keys for one new photo in a gallery. */
export function photoKeys(slug, id, mime, preview = 'image/webp') {
  const dir = galleryDir(slug);
  const ext = PREVIEW_TYPES[previewType(preview)];
  return { orig: `${dir}${id}-orig.${ORIGINAL_TYPES[mime] || 'jpg'}`, web: `${dir}${id}-web.${ext}`, thumb: `${dir}${id}-thumb.${ext}` };
}

/**
 * Presigned PUT URLs for a batch of files: [{ name, type, size, webSize, thumbSize, previewType }].
 * The signed Content-Length / Content-Type means R2 rejects anything other than the declared file.
 */
export async function presignUploads(slug, files) {
  return Promise.all(files.map(async (f) => {
    const type = String(f.type || '').toLowerCase();
    const size = Number(f.size), webSize = Number(f.webSize), thumbSize = Number(f.thumbSize);
    if (!ORIGINAL_TYPES[type]) return { error: `${f.name}: use JPG, PNG, WebP, AVIF, HEIC or TIFF` };
    if (!(size > 0 && size <= MAX_ORIGINAL)) return { error: `${f.name}: must be under ${MAX_ORIGINAL / 1048576} MB` };
    if (!(webSize > 0 && webSize <= MAX_DERIVED && thumbSize > 0 && thumbSize <= MAX_DERIVED)) return { error: `${f.name}: could not prepare preview` };
    const id = crypto.randomBytes(10).toString('hex');
    const pt = previewType(f.previewType);
    const keys = photoKeys(slug, id, type, pt);
    const put = (Key, ContentType, ContentLength) => getSignedUrl(s3(), new PutObjectCommand({
      Bucket: bucket(), Key, ContentType, ContentLength, CacheControl: 'private, max-age=31536000, immutable',
    }), { expiresIn: 3600 });
    return {
      id,
      put: { orig: await put(keys.orig, type, size), web: await put(keys.web, pt, webSize), thumb: await put(keys.thumb, pt, thumbSize) },
    };
  }));
}

/** After the browser finishes uploading: confirm the objects exist and return the photo records to store. */
export async function confirmUploads(slug, items) {
  const out = [];
  const errors = [];
  for (const it of items) {
    if (!ID.test(String(it.id)) || !ORIGINAL_TYPES[it.type]) { errors.push(`${it.name || 'file'}: invalid upload`); continue; }
    const keys = photoKeys(slug, it.id, it.type, it.previewType);
    try {
      await Promise.all([keys.orig, keys.web, keys.thumb].map((Key) => s3().send(new HeadObjectCommand({ Bucket: bucket(), Key }))));
      const dim = (v) => (Number.isInteger(Number(v)) && v > 0 && v <= 20000 ? Number(v) : undefined);
      out.push({ src: `r2:${keys.web}`, thumb: `r2:${keys.thumb}`, original: `r2:${keys.orig}`, name: String(it.name || '').slice(0, 160), w: dim(it.w), h: dim(it.h) });
    } catch {
      errors.push(`${it.name || it.id}: upload did not finish`);
    }
  }
  return { photos: out, errors };
}

// Pin signatures to 6-hour windows (valid 24h) so URLs stay identical for a while and images cache.
const WINDOW = 6 * 3600 * 1000;
const signingDate = () => new Date(Math.floor(Date.now() / WINDOW) * WINDOW);
const cache = new Map(); // key|disposition → { url, window }

/** Signed GET URL for an "r2:<key>" ref (non-R2 values are returned unchanged). */
export async function signedUrl(ref, { downloadName } = {}) {
  if (!isR2(ref)) return ref;
  if (!r2Ready()) return '';
  const Key = keyOf(ref);
  const date = signingDate();
  const cacheKey = `${Key}|${downloadName || ''}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.window === date.getTime()) return hit.url;
  const safeName = String(downloadName || '').replace(/[^\w.\- ]+/g, '_').slice(0, 120);
  const url = await getSignedUrl(s3(), new GetObjectCommand({
    Bucket: bucket(), Key,
    ...(downloadName ? { ResponseContentDisposition: `attachment; filename="${safeName}"` } : {}),
  }), { expiresIn: 24 * 3600, signingDate: date });
  if (cache.size > 20000) cache.clear();
  cache.set(cacheKey, { url, window: date.getTime() });
  return url;
}

/**
 * Gallery object (plain) → copy with R2 refs replaced by signed URLs.
 * Each R2 photo keeps its stored value in `ref` (so the admin can set it as the cover); cover → signed, `coverRef` raw.
 */
export async function resolveGallery(g, { downloads = true } = {}) {
  const photos = await Promise.all((g.photos || []).map(async (p, i) => {
    if (!isR2(p.src)) return p;
    const ext = String(p.original || '').split('.').pop() || 'jpg';
    const base = String(p.name || '').replace(/\.[^.]+$/, '') || `${g.slug}-${String(i + 1).padStart(3, '0')}`;
    return {
      ...p, ref: p.src,
      src: await signedUrl(p.src),
      thumb: await signedUrl(p.thumb || p.src),
      download: downloads && p.original ? await signedUrl(p.original, { downloadName: `${base}.${ext}` }) : undefined,
      original: undefined,
    };
  }));
  return { ...g, photos, coverRef: g.cover, cover: g.cover ? await signedUrl(g.cover) : g.cover };
}

/** Delete one photo's objects. */
export async function deletePhotoObjects(p) {
  if (!r2Ready()) return;
  const Keys = [p.src, p.thumb, p.original].filter(isR2).map(keyOf).filter((k) => k.startsWith(`${prefix()}/`));
  if (!Keys.length) return;
  await s3().send(new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects: Keys.map((Key) => ({ Key })), Quiet: true } })).catch((e) => console.error('R2 delete failed:', e.message));
}

/** Delete everything stored for a gallery (also catches half-finished uploads). Returns the number of objects removed. */
export async function deleteGalleryObjects(slug) {
  if (!r2Ready()) return 0;
  const Prefix = galleryDir(slug);
  let removed = 0;
  let ContinuationToken;
  do {
    const page = await s3().send(new ListObjectsV2Command({ Bucket: bucket(), Prefix, ContinuationToken }));
    const Objects = (page.Contents || []).map((o) => ({ Key: o.Key }));
    if (Objects.length) {
      await s3().send(new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects, Quiet: true } }));
      removed += Objects.length;
    }
    ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return removed;
}
