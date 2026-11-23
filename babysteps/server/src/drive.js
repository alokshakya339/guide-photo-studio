/**
 * Google Drive helpers.
 * Share links (…/file/d/<id>/view) open Google's viewer, not the image, so they are rewritten to
 * Drive's image endpoint. Files must be shared as "Anyone with the link can view".
 * Listing a folder needs the Drive API (GOOGLE_API_KEY) and the folder must also be shared publicly.
 */

const ID = '[-\\w]{20,}';

export function parseDrive(input) {
  const s = String(input || '').trim();
  if (!/drive\.google\.com|docs\.google\.com|googleusercontent\.com/.test(s)) return null;
  let m = s.match(new RegExp(`/folders/(${ID})`));
  if (m) return { type: 'folder', id: m[1] };
  m = s.match(new RegExp(`/file/d/(${ID})`)) || s.match(new RegExp(`[?&]id=(${ID})`)) || s.match(new RegExp(`googleusercontent\\.com/d/(${ID})`));
  if (m) return { type: 'file', id: m[1] };
  return null;
}

/** Direct, embeddable image URL for a Drive file id (served by Google at up to `width` px). */
export const driveImageUrl = (id, width = 2000) => `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;

/** If the URL is a Drive file link, return the embeddable image URL; otherwise return it unchanged. */
export function normalizeImageUrl(url) {
  const d = parseDrive(url);
  return d?.type === 'file' ? driveImageUrl(d.id) : String(url || '').trim();
}

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|avif|tiff?|bmp)$/i;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi|mts|m2ts|3gp|wmv)$/i;

const decodeHtml = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

/**
 * No API key: read Google's public "embedded folder view" page, which lists the files of a folder
 * shared as "Anyone with the link". Only image files are kept (by file extension).
 */
async function listPublicFolderWithoutKey(folderId, kind = 'image', raw = false) {
  const EXT = kind === 'video' ? VIDEO_EXT : IMAGE_EXT;
  const r = await fetch(`https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (photo-gallery importer)', 'Accept-Language': 'en' },
    redirect: 'follow',
  });
  const html = await r.text();
  if (!r.ok || /accounts\.google\.com\/(ServiceLogin|v3\/signin)/.test(r.url + html.slice(0, 2000))) {
    const e = new Error('Couldn’t open that Drive folder. Make sure it is shared as “Anyone with the link can view”.');
    e.status = 400;
    throw e;
  }
  const files = [];
  const seen = new Set();
  // Each entry looks like: <div class="flip-entry" id="entry-<ID>" …> … <div class="flip-entry-title">name.jpg</div>
  const re = /id="entry-([-\w]{20,})"[\s\S]*?class="flip-entry-title">([^<]*)</g;
  let m;
  while ((m = re.exec(html))) {
    const [, id, rawName] = m;
    const name = decodeHtml(rawName);
    if (seen.has(id) || !EXT.test(name)) continue; // skip sub-folders and other file types
    seen.add(id);
    files.push({ id, name });
  }
  if (!files.length) {
    const what = kind === 'video' ? 'videos' : 'photos';
    const e = new Error(`No ${what} found in that folder. Check it contains ${what} and is shared as “Anyone with the link can view”. (Files inside sub-folders need their own folder link.)`);
    e.status = 400;
    throw e;
  }
  files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return kind === 'video' || raw ? files : files.map((f) => ({ url: driveImageUrl(f.id), name: f.name }));
}

/** List image files in a public Drive folder. Uses the Drive API when GOOGLE_API_KEY is set, otherwise the public folder page. */
export async function listDriveFolder(folderId, kind = 'image', raw = false) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return listPublicFolderWithoutKey(folderId, kind, raw);
  const files = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and mimeType contains '${kind === 'video' ? 'video/' : 'image/'}' and trashed = false`,
      fields: 'nextPageToken, files(id, name)',
      orderBy: 'name',
      pageSize: '1000',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
      key,
    });
    if (pageToken) params.set('pageToken', pageToken);
    const r = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = data?.error?.message || `Google Drive returned ${r.status}`;
      const e = new Error(/not found|File not found/i.test(msg) ? 'Folder not found. Make sure it is shared as “Anyone with the link can view”.' : msg);
      e.status = 400;
      throw e;
    }
    files.push(...(data.files || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken && files.length < 5000);
  if (kind === 'video' || raw) return files;
  return files.map((f) => ({ url: driveImageUrl(f.id), name: f.name }));
}

/**
 * Turn pasted text (one link per line / space-separated) into image URLs.
 * Drive file links → image URLs, Drive folders → all images inside, other URLs kept as-is.
 */
export async function resolveImageLinks(text) {
  const parts = String(text || '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  const images = [];
  const errors = [];
  for (const p of parts) {
    const d = parseDrive(p);
    try {
      if (d?.type === 'folder') images.push(...(await listDriveFolder(d.id)));
      else if (d?.type === 'file') images.push({ url: driveImageUrl(d.id), name: `drive:${d.id.slice(0, 8)}` });
      else if (/^https?:\/\/\S+$/i.test(p) || p.startsWith('/')) images.push({ url: p, name: p.split('/').pop().split('?')[0] });
      else errors.push(`Not a link: ${p.slice(0, 60)}`);
    } catch (e) {
      errors.push(e.message);
    }
  }
  const seen = new Set();
  return { images: images.filter((i) => !seen.has(i.url) && seen.add(i.url)), errors };
}

/**
 * Drive photo files ({ id, name }) from pasted Drive file / folder links — used to COPY full-size photos
 * into cloud storage. Non-Drive links are reported as errors.
 */
export async function resolveDriveImageFiles(text) {
  const parts = String(text || '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  const files = [];
  const errors = [];
  for (const p of parts) {
    const d = parseDrive(p);
    try {
      if (d?.type === 'folder') files.push(...(await listDriveFolder(d.id, 'image', true)));
      else if (d?.type === 'file') files.push({ id: d.id, name: '' });
      else errors.push(`Not a Google Drive link: ${p.slice(0, 60)}`);
    } catch (e) {
      errors.push(e.message);
    }
  }
  const seen = new Set();
  return { files: files.filter((f) => !seen.has(f.id) && seen.add(f.id)), errors };
}

/**
 * Download one publicly shared Drive file (full size). Returns the fetch Response.
 * Uses the Drive API when GOOGLE_API_KEY is set, otherwise Drive's public download endpoint.
 */
export async function fetchDriveFile(id) {
  if (!new RegExp(`^${ID}$`).test(String(id))) { const e = new Error('Bad file id'); e.status = 400; throw e; }
  const key = process.env.GOOGLE_API_KEY;
  const url = key
    ? `https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true&key=${encodeURIComponent(key)}`
    : `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (photo-gallery importer)' }, redirect: 'follow' });
  const type = r.headers.get('content-type') || '';
  if (!r.ok || type.startsWith('text/html') || type.startsWith('application/json')) {
    r.body?.cancel().catch(() => {});
    const e = new Error(r.status === 404 ? 'File not found on Drive' : 'Drive wouldn’t send this file — check it is shared as “Anyone with the link can view”');
    e.status = 502;
    throw e;
  }
  return r;
}

/* ---------------- Videos ---------------- */

const ytId = (s) => {
  if (/^[\w-]{11}$/.test(s)) return null; // bare ids are ambiguous here; require a link
  if (!/youtube\.com|youtu\.be/i.test(s)) return null;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : null;
};
const titleFromName = (name) => String(name || '').replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[_]+/g, ' ').trim();

/** Poster image shown before a video plays. */
export function videoPoster(kind, ref) {
  if (kind === 'drive') return driveImageUrl(ref, 1280);
  if (kind === 'youtube') return `https://i.ytimg.com/vi/${ref}/hqdefault.jpg`;
  return '';
}

/**
 * Turn pasted text into video entries: Drive video links, Drive folders (all videos inside),
 * YouTube links (unlisted works), or direct .mp4/.webm/.mov URLs.
 */
export async function resolveVideoLinks(text) {
  const parts = String(text || '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  const videos = [];
  const errors = [];
  for (const p of parts) {
    try {
      const d = parseDrive(p);
      const y = ytId(p);
      if (d?.type === 'folder') {
        const files = await listDriveFolder(d.id, 'video');
        files.forEach((f) => videos.push({ kind: 'drive', ref: f.id, title: titleFromName(f.name) }));
      } else if (d?.type === 'file') videos.push({ kind: 'drive', ref: d.id, title: '' });
      else if (y) videos.push({ kind: 'youtube', ref: y, title: '' });
      else if ((/^https?:\/\/\S+$/i.test(p) || p.startsWith('/uploads/')) && VIDEO_EXT.test(p.split('?')[0])) {
        videos.push({ kind: 'file', ref: p, title: titleFromName(decodeURIComponent(p.split('?')[0].split('/').pop())) });
      } else errors.push(`Not a video link: ${p.slice(0, 60)}`);
    } catch (e) {
      errors.push(e.message);
    }
  }
  const seen = new Set();
  return {
    videos: videos.filter((v) => !seen.has(v.kind + v.ref) && seen.add(v.kind + v.ref)).map((v) => ({ ...v, poster: videoPoster(v.kind, v.ref) })),
    errors,
  };
}
