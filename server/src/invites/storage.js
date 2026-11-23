/**
 * Cloudflare R2 (S3-compatible) storage for invitation media.
 * Everything is written under STORAGE_PREFIX/ (default "guide-invites/") so it never mixes with other projects
 * that share the bucket. Images are resized + converted to WebP with sharp before upload so invitations stay fast.
 */
import crypto from 'node:crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const env = (k) => (process.env[k] || '').trim();
let client = null;
const s3 = () => (client ||= new S3Client({
  region: env('STORAGE_REGION') || 'auto',
  endpoint: env('STORAGE_ENDPOINT'),
  credentials: { accessKeyId: env('STORAGE_ACCESS_KEY'), secretAccessKey: env('STORAGE_SECRET_KEY') },
}));
export const storageReady = () => Boolean(env('STORAGE_BUCKET') && env('STORAGE_ENDPOINT') && env('STORAGE_ACCESS_KEY') && env('STORAGE_SECRET_KEY') && env('STORAGE_PUBLIC_URL'));
const prefix = () => (env('STORAGE_PREFIX') || 'guide-invites').replace(/^\/|\/$/g, '');
const publicUrl = (key) => `${env('STORAGE_PUBLIC_URL').replace(/\/$/, '')}/${key}`;
const safe = (s) => String(s || 'misc').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'misc';

const IMAGE = /^image\/(jpeg|png|webp|avif|heic|heif)$/;
const AUDIO = /^audio\/(mpeg|mp3|mp4|aac|ogg|wav|x-m4a)$/;
export const MAX_IMAGE = 15 * 1024 * 1024;
export const MAX_AUDIO = 12 * 1024 * 1024;

/** Upload one file buffer. Returns { url, key, type, width?, height? }. */
export async function putMedia({ buffer, mimetype, folder }) {
  if (!storageReady()) throw Object.assign(new Error('Storage is not configured (STORAGE_* in server/.env).'), { status: 503 });
  const id = crypto.randomBytes(8).toString('hex');
  if (IMAGE.test(mimetype)) {
    if (buffer.length > MAX_IMAGE) throw Object.assign(new Error('Images must be under 15 MB.'), { status: 400 });
    const img = sharp(buffer, { failOn: 'none' }).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true });
    const out = await img.webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
    const key = `${prefix()}/${safe(folder)}/${id}.webp`;
    await s3().send(new PutObjectCommand({ Bucket: env('STORAGE_BUCKET'), Key: key, Body: out.data, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' }));
    return { url: publicUrl(key), key, type: 'image', width: out.info.width, height: out.info.height };
  }
  if (AUDIO.test(mimetype)) {
    if (buffer.length > MAX_AUDIO) throw Object.assign(new Error('Music files must be under 12 MB.'), { status: 400 });
    const ext = mimetype.includes('mpeg') || mimetype.includes('mp3') ? 'mp3' : mimetype.split('/')[1].replace('x-', '');
    const key = `${prefix()}/${safe(folder)}/${id}.${ext}`;
    await s3().send(new PutObjectCommand({ Bucket: env('STORAGE_BUCKET'), Key: key, Body: buffer, ContentType: mimetype, CacheControl: 'public, max-age=31536000, immutable' }));
    return { url: publicUrl(key), key, type: 'audio' };
  }
  throw Object.assign(new Error('Upload a JPG, PNG, WebP or HEIC photo, or an MP3/M4A music file.'), { status: 400 });
}

/** Delete a file we uploaded (ignores URLs that aren't ours). */
export async function deleteMedia(url) {
  const base = `${env('STORAGE_PUBLIC_URL').replace(/\/$/, '')}/`;
  if (!storageReady() || !String(url).startsWith(base)) return;
  const key = String(url).slice(base.length);
  if (!key.startsWith(`${prefix()}/`)) return;
  await s3().send(new DeleteObjectCommand({ Bucket: env('STORAGE_BUCKET'), Key: key })).catch(() => {});
}
