/**
 * Uploaded images.
 *  - UPLOAD_STORAGE=mongo (default): stored in MongoDB GridFS — survives redeploys on hosts that wipe the app folder
 *    (e.g. Hostinger Node.js web apps). Fine for website/CMS images; for large client galleries prefer Google Drive links.
 *  - UPLOAD_STORAGE=disk: stored in server/uploads/ (or UPLOAD_DIR) — for a VPS with persistent disk.
 * Either way images are served at /uploads/<filename>; reads check GridFS first, then disk.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const storageMode = () => (process.env.UPLOAD_STORAGE === 'disk' ? 'disk' : 'mongo');
const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
const safeName = (name) => path.basename(String(name || ''));

/** Save an image buffer; returns the public URL. */
export async function saveImage(buffer, filename, mime) {
  const name = safeName(filename);
  if (storageMode() === 'disk') {
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);
  } else {
    const old = await bucket().find({ filename: name }).toArray(); // replace, don't duplicate
    await Promise.all(old.map((f) => bucket().delete(f._id)));
    await new Promise((resolve, reject) => {
      const up = bucket().openUploadStream(name, { metadata: { contentType: mime } });
      up.on('error', reject).on('finish', resolve);
      up.end(buffer);
    });
  }
  return `/uploads/${name}`;
}

/** Delete an image from wherever it lives. */
export async function deleteImage(filename) {
  const name = safeName(filename);
  if (!name) return;
  const files = await bucket().find({ filename: name }).toArray();
  await Promise.all(files.map((f) => bucket().delete(f._id)));
  const file = path.join(UPLOAD_DIR, name);
  if (file.startsWith(UPLOAD_DIR) && fs.existsSync(file)) fs.unlinkSync(file);
}

const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif' };

/** Express handler for GET /uploads/:name — GridFS first, then disk. */
export async function serveUpload(req, res, next) {
  try {
    const name = safeName(req.params.name);
    if (!name || name.startsWith('.')) return res.status(404).end();
    res.set('Cache-Control', 'public, max-age=2592000, immutable');
    const [file] = await bucket().find({ filename: name }).sort({ uploadDate: -1 }).limit(1).toArray();
    if (file) {
      res.type(file.metadata?.contentType || TYPES[path.extname(name).toLowerCase()] || 'application/octet-stream');
      res.set('Content-Length', String(file.length));
      return bucket().openDownloadStream(file._id).on('error', next).pipe(res);
    }
    const disk = path.join(UPLOAD_DIR, name);
    if (disk.startsWith(UPLOAD_DIR) && fs.existsSync(disk)) return res.sendFile(disk);
    return res.status(404).end();
  } catch (e) { return next(e); }
}
