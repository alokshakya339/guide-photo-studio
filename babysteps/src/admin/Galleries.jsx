import { useEffect, useMemo, useRef, useState } from 'react';
import { askConfirm } from './confirm.jsx';
import { useValidation } from '../useValidation.jsx';
import { checkName, checkPhone, checkEmail, checkSlug, checkPassword, checkInt, checkDate, checkText, formatPhone, squish } from '../validation.js';

const CLIENT_RULES = {
  clientName: (v) => checkName(v, { label: 'the client’s name' }),
  title: (v) => checkText(v, { max: 120 }),
  clientPhone: (v) => checkPhone(v, { required: false }),
  clientEmail: (v) => checkEmail(v),
  selectionLimit: (v) => checkInt(v, { min: 0, max: 5000 }),
};
const CREATE_RULES = {
  ...CLIENT_RULES,
  slug: (v) => checkSlug(v),
  password: (v) => checkPassword(v, { required: false, min: 6, max: 60 }),
  eventDate: (v) => checkDate(v, { maxYears: 3 }),
  freeDays: (v) => checkInt(v, { min: 1, max: 3650 }),
};
const cleanClient = (x) => ({ ...x, clientName: squish(x.clientName), title: squish(x.title), clientEmail: String(x.clientEmail || '').trim(), clientPhone: x.clientPhone ? formatPhone(x.clientPhone) : '' });
import { api, asset } from '../api.js';
import { PhotoBox, LbPhoto } from '../lib.jsx';
import { STUDIO } from '../data.js';
import { uploadToR2 } from './r2Upload.js';

const API_BASE = import.meta.env.VITE_API_URL || '';
const img = (src) => (String(src || '').startsWith('/') ? asset(src) : src);
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const slugify = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const loginUrl = () => `${window.location.origin}/client`;

function accessBadge(a) {
  if (!a) return null;
  if (a.subscribed) return <span className="ad-badge ok">Subscribed</span>;
  if (a.locked) return <span className="ad-badge bad">Access ended</span>;
  return <span className={`ad-badge ${a.daysLeft <= 14 ? 'warn' : ''}`}>{a.daysLeft} days left</span>;
}

const shareText = (g, password) => [
  `Hi ${String(g.clientName || '').split(' ')[0]}! Your BabySteps photos are ready 🤍`,
  '',
  `Open: ${loginUrl()}`,
  `Gallery name: ${g.slug}`,
  `Password: ${password}`,
  '',
  'Tap the heart on your favourites for the album. — Team BabySteps',
].join('\n');

/* Shows a freshly created / reset password once, with copy + WhatsApp share. */
function ShareCard({ g, password, onClose }) {
  const [copied, setCopied] = useState(false);
  const text = shareText(g, password);
  const phone = String(g.clientPhone || '').replace(/\D/g, '');
  const wa = `https://wa.me/${phone.length === 10 ? `91${phone}` : phone}?text=${encodeURIComponent(text)}`;
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ } };
  return (
    <div className="ad-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="ad-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="ad-modal-head"><h3>Share with {g.clientName}</h3><button className="ad-x" onClick={onClose} aria-label="Close">×</button></div>
        <p className="ad-note">This password is shown <b>only now</b> — send it to the client before closing.</p>
        <dl className="ad-creds">
          <div><dt>Link</dt><dd>{loginUrl()}</dd></div>
          <div><dt>Gallery name</dt><dd>{g.slug}</dd></div>
          <div><dt>Password</dt><dd className="pw">{password}</dd></div>
        </dl>
        <div className="ad-row-actions">
          {phone && <a className="ad-btn primary" href={wa} target="_blank" rel="noreferrer">Send on WhatsApp</a>}
          <button className="ad-btn" onClick={copy}>{copied ? 'Copied ✓' : 'Copy message'}</button>
          <button className="ad-btn ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Create ---------- */
function CreateGallery({ token, onCreated, onClose }) {
  const [f, setF] = useState({ clientName: '', title: '', slug: '', clientPhone: '', clientEmail: '', eventDate: '', selectionLimit: '', allowDownload: true, freeDays: '', password: '' });
  const [slugTouched, setSlugTouched] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((x) => {
      const n = { ...x, [k]: v };
      if (k === 'clientName' && !slugTouched) n.slug = slugify(`baby-${v.split(' ')[0] || ''}`) === 'baby' ? '' : slugify(`baby-${v.split(' ')[0]}`);
      if (k === 'clientName' && !x.title) n.title = '';
      return n;
    });
    if (k === 'slug') setSlugTouched(true);
  };
  const cv = useValidation(CREATE_RULES);
  const submit = async (e) => {
    e.preventDefault();
    if (!cv.check(f, e.currentTarget)) return;
    setBusy(true); setErr('');
    try {
      const body = {
        ...cleanClient(f), brand: 'babysteps', slug: slugify(f.slug), title: f.title || `${f.clientName.split(' ')[0]}'s gallery`,
        selectionLimit: Number(f.selectionLimit) || 0, freeDays: Number(f.freeDays) || undefined,
        eventDate: f.eventDate || undefined, password: f.password || undefined,
      };
      const g = await api('/admin/client-galleries', { method: 'POST', token, body });
      onCreated(g);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  return (
    <div className="ad-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <form className="ad-modal-card wide" onClick={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
        <div className="ad-modal-head"><h3>New client gallery</h3><button type="button" className="ad-x" onClick={onClose} aria-label="Close">×</button></div>
        <div className="ad-grid">
          <label className="ad-field"><span className="ad-label">Client name *</span><input value={f.clientName} onChange={set('clientName')} placeholder="Priya Sharma" required maxLength={60} {...cv.field('clientName', 'ad-input')} />{cv.error('clientName')}</label>
          <label className="ad-field"><span className="ad-label">Gallery title</span><input value={f.title} onChange={set('title')} placeholder="Baby Aarav · Newborn" maxLength={120} {...cv.field('title', 'ad-input')} />{cv.error('title')}</label>
          <label className="ad-field"><span className="ad-label">Gallery name (login) *</span><input value={f.slug} onChange={set('slug')} placeholder="baby-aarav" required maxLength={50} {...cv.field('slug', 'ad-input')} />{cv.error('slug')}<small className="ad-help">The client types this to log in. a–z, 0–9 and dashes.</small></label>
          <label className="ad-field"><span className="ad-label">Password</span><input value={f.password} onChange={set('password')} placeholder="Leave empty to auto-generate" maxLength={60} {...cv.field('password', 'ad-input')} />{cv.error('password')}</label>
          <label className="ad-field"><span className="ad-label">Client WhatsApp / phone</span><input value={f.clientPhone} onChange={set('clientPhone')} placeholder="98xxxxxxxx" inputMode="tel" maxLength={18} {...cv.field('clientPhone', 'ad-input')} />{cv.error('clientPhone')}</label>
          <label className="ad-field"><span className="ad-label">Client email</span><input type="email" value={f.clientEmail} onChange={set('clientEmail')} maxLength={160} {...cv.field('clientEmail', 'ad-input')} />{cv.error('clientEmail')}</label>
          <label className="ad-field"><span className="ad-label">Shoot date</span><input type="date" value={f.eventDate} onChange={set('eventDate')} {...cv.field('eventDate', 'ad-input')} />{cv.error('eventDate')}</label>
          <label className="ad-field"><span className="ad-label">Album picks limit</span><input type="number" min="0" value={f.selectionLimit} onChange={set('selectionLimit')} placeholder="0 = unlimited" {...cv.field('selectionLimit', 'ad-input')} />{cv.error('selectionLimit')}</label>
          <label className="ad-field"><span className="ad-label">Free hosting days</span><input type="number" min="1" value={f.freeDays} onChange={set('freeDays')} placeholder="Default (90)" {...cv.field('freeDays', 'ad-input')} />{cv.error('freeDays')}</label>
          <label className="ad-field"><span className="ad-label">Downloads</span><label className="ad-switch"><input type="checkbox" checked={f.allowDownload} onChange={set('allowDownload')} /><span /> Allow client downloads</label></label>
        </div>
        {err && <p className="ad-error">{err}</p>}
        <div className="ad-row-actions"><button className="ad-btn primary" disabled={busy}>{busy ? 'Creating…' : 'Create gallery'}</button><button type="button" className="ad-btn ghost" onClick={onClose}>Cancel</button></div>
      </form>
    </div>
  );
}

/* ---------- Photo viewer (tap a photo in the grid) ---------- */
function PhotoViewer({ photos, index, onIndex, onClose, isCover, onCover, onRemove }) {
  const p = photos[index];
  const n = photos.length;
  const step = (d) => onIndex((index + d + n) % n);
  const touch = useRef(null);
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  useEffect(() => { // preload neighbours so swiping feels instant
    [1, -1].forEach((d) => { const q = photos[(index + d + n) % n]; if (q) { const im = new Image(); im.src = img(q.src); } });
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p) return null;
  const onStart = (e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; };
  const onEnd = (e) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x, dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) onClose(); // swipe down closes
  };
  return (
    <div className="ad-viewer" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={onClose}>
      <div className="ad-viewer-top" onClick={(e) => e.stopPropagation()}>
        <span className="ad-viewer-count">{index + 1} / {n}{p.favorite ? ' · ♥ client favourite' : ''}{isCover(p) ? ' · cover' : ''}</span>
        <button className="ad-viewer-x" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="ad-viewer-stage" onTouchStart={onStart} onTouchEnd={onEnd}>
        <span className="ad-viewer-img" key={p._id} onClick={(e) => e.stopPropagation()}>
          <LbPhoto src={img(p.src)} thumb={img(p.thumb || p.src)} w={p.w} h={p.h} alt={p.name || `Photo ${index + 1}`} imgProps={{ referrerPolicy: 'no-referrer' }} />
        </span>
        {n > 1 && <>
          <button className="ad-viewer-nav prev" onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="Previous photo">‹</button>
          <button className="ad-viewer-nav next" onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="Next photo">›</button>
        </>}
      </div>
      <div className="ad-viewer-bar" onClick={(e) => e.stopPropagation()}>
        <div className="ad-viewer-info">
          {p.name && <b title={p.name}>{p.name}</b>}
          {p.note && <span>“{p.note}”</span>}
        </div>
        <div className="ad-viewer-actions">
          {!isCover(p) && <button className="ad-btn" onClick={() => onCover(p)}>Set cover</button>}
          {p.download && <a className="ad-btn" href={p.download} target="_blank" rel="noreferrer">Original ↓</a>}
          <button className="ad-btn danger" onClick={() => onRemove(p)}>Remove</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Detail ---------- */
function GalleryDetail({ token, slug, onBack, onChanged }) {
  const [g, setG] = useState(null);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [links, setLinks] = useState('');
  const [videoLinks, setVideoLinks] = useState('');
  const [share, setShare] = useState(null);
  const fileRef = useRef(null);
  const dv = useValidation(CLIENT_RULES);
  const [r2, setR2] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total, failed } while uploading to R2
  const [uploadErrors, setUploadErrors] = useState([]);
  const [view, setView] = useState(-1); // index of the photo open in the viewer
  useEffect(() => { api('/admin/client-galleries-storage', { token }).then((s) => setR2(Boolean(s.r2))).catch(() => {}); }, [token]);
  useEffect(() => {
    if (!progress) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [progress]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };
  const load = async () => {
    try {
      const data = await api(`/admin/client-galleries/${slug}`, { token });
      setG(data);
      setForm({ title: data.title, clientName: data.clientName, clientPhone: data.clientPhone || '', clientEmail: data.clientEmail || '', selectionLimit: data.selectionLimit || 0, allowDownload: data.allowDownload !== false });
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (label, fn) => {
    setBusy(label); setErr('');
    try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };

  const saveDetails = () => dv.check(form) && run('Saving…', async () => {
    const clean = cleanClient(form);
    setForm(clean);
    await api(`/admin/client-galleries/${slug}`, { method: 'PATCH', token, body: { ...clean, selectionLimit: Number(form.selectionLimit) || 0 } });
    await load(); onChanged(); flash('Details saved ✓');
  });
  const addPhotos = async (srcs) => {
    const data = await api(`/admin/client-galleries/${slug}/photos`, { method: 'POST', token, body: { photos: srcs } });
    setG((x) => ({ ...x, ...data })); onChanged();
    flash(`${data.added} photo${data.added === 1 ? '' : 's'} added${data.skipped ? ` · ${data.skipped} already there` : ''}`);
  };
  const uploadR2 = async ({ files, drive }) => {
    if (progress) return;
    setErr(''); setUploadErrors([]);
    setProgress({ done: 0, total: (drive || files).length, failed: 0, drive: Boolean(drive) });
    try {
      const { added, errors } = await uploadToR2({ slug, files, drive, token, onProgress: (p) => setProgress({ ...p, drive: Boolean(drive) }) });
      setUploadErrors(errors);
      await load(); onChanged();
      flash(`${added} photo${added === 1 ? '' : 's'} ${drive ? 'copied from Drive' : 'uploaded'}${errors.length ? ` · ${errors.length} failed` : ''}`);
      return added;
    } catch (e) { setErr(e.message); } finally { setProgress(null); }
    return 0;
  };
  const upload = (files) => (r2 ? uploadR2({ files }) : uploadLegacy(files));
  // Full-size copy: every photo in the Drive folder(s) is downloaded and stored in R2 like a normal upload.
  const copyFromDrive = async () => {
    if (progress || busy) return;
    setErr(''); setBusy('Reading the Drive folder…');
    let list;
    try { list = await api('/admin/client-galleries-drive/list', { method: 'POST', token, body: { text: links } }); } catch (e) { setErr(e.message); return; } finally { setBusy(''); }
    const ok = await askConfirm({
      title: `Copy ${list.files.length} photo${list.files.length === 1 ? '' : 's'} from Drive?`,
      message: `Full-size originals are copied into the gallery's cloud storage, so they keep working even if the Drive folder is changed later.${list.errors.length ? ` (${list.errors.length} link${list.errors.length === 1 ? '' : 's'} skipped: ${list.errors.join(' ')})` : ''} Keep this screen open until it finishes — on a phone, Wi-Fi is best.`,
      confirmLabel: 'Copy photos',
    });
    if (!ok) return;
    if (await uploadR2({ drive: list.files })) setLinks('');
  };
  const uploadLegacy = (files) => run(`Uploading ${files.length} photo${files.length > 1 ? 's' : ''}…`, async () => {
    const fd = new FormData();
    [...files].forEach((file) => fd.append('files', file));
    fd.append('folder', `client-${slug}`);
    const res = await fetch(`${API_BASE}/api/admin/cms/media`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    await addPhotos(data.map((m) => m.url));
  });
  const addLinks = () => run('Reading links…', async () => {
    const { images, errors } = await api('/admin/cms/resolve-links', { method: 'POST', token, body: { text: links } });
    if (!images.length) throw new Error(errors?.join(' ') || 'No photos found in those links');
    await addPhotos(images.map((i) => i.url));
    setLinks('');
  });
  const removePhoto = async (p) => (await askConfirm({ title: 'Remove this photo?', message: 'It will be removed from the client’s gallery.', confirmLabel: 'Remove', danger: true })) && run('Removing…', async () => {
    const data = await api(`/admin/client-galleries/${slug}/photos/${p._id}`, { method: 'DELETE', token });
    setG((x) => ({ ...x, ...data })); onChanged();
  });
  const setCover = (p) => run('Saving…', async () => {
    await api(`/admin/client-galleries/${slug}`, { method: 'PATCH', token, body: { cover: p.ref || p.src } });
    setG((x) => ({ ...x, cover: p.src, coverRef: p.ref || p.src })); onChanged(); flash('Cover updated ✓');
  });
  const addVideos = () => run('Adding films…', async () => {
    const data = await api(`/admin/client-galleries/${slug}/videos`, { method: 'POST', token, body: { text: videoLinks } });
    setG((x) => ({ ...x, ...data })); setVideoLinks(''); flash(`${data.added} film${data.added === 1 ? '' : 's'} added`);
  });
  const renameVideo = (v, title) => run('Saving…', async () => {
    const data = await api(`/admin/client-galleries/${slug}/videos/${v._id}`, { method: 'PATCH', token, body: { title } });
    setG((x) => ({ ...x, ...data }));
  });
  const removeVideo = async (v) => (await askConfirm({ title: 'Remove this film?', message: 'It will be removed from the client’s gallery.', confirmLabel: 'Remove', danger: true })) && run('Removing…', async () => {
    const data = await api(`/admin/client-galleries/${slug}/videos/${v._id}`, { method: 'DELETE', token });
    setG((x) => ({ ...x, ...data }));
  });
  const resetPassword = async () => (await askConfirm({ title: 'Create a new password?', message: 'The old password will stop working. Remember to send the new one to the client.', confirmLabel: 'Create new password' })) && run('Resetting…', async () => {
    const data = await api(`/admin/client-galleries/${slug}/password`, { method: 'POST', token, body: {} });
    setShare({ g: { ...g, ...data }, password: data.password });
  });
  const reopen = () => run('Re-opening…', async () => {
    await api(`/admin/client-galleries/${slug}/reopen`, { method: 'POST', token });
    await load(); onChanged(); flash('Selection re-opened — the client can change their picks.');
  });
  const extend = (days) => run('Extending…', async () => {
    const { access } = await api(`/admin/client-galleries/${slug}/extend`, { method: 'POST', token, body: { days } });
    setG((x) => ({ ...x, access })); onChanged(); flash(`Access extended to ${fmt(access.until)}`);
  });
  const remove = async () => {
    if (!(await askConfirm({ title: 'Delete this gallery?', message: "This permanently deletes the gallery and the client's selection. It can't be undone.", confirmLabel: 'Delete gallery', danger: true, requireText: slug }))) return;
    run('Deleting…', async () => { await api(`/admin/client-galleries/${slug}`, { method: 'DELETE', token }); onChanged(); onBack(); });
  };

  if (!g || !form) return <div className="ad-panel"><p className="ad-note">{err || 'Loading gallery…'}</p></div>;
  const favs = g.photos.filter((p) => p.favorite);
  const isCover = (p) => (g.coverRef || g.cover) === (p.ref || p.src);
  const setF = (k) => (e) => setForm((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <>
      <div className="ad-gal-head">
        <button className="ad-btn ghost" onClick={onBack}>← All galleries</button>
        <div className="ad-gal-title">
          <h2>{g.title}</h2>
          <p>{g.clientName} · <code>{g.slug}</code> · {g.photos.length} photos · {favs.length} favourites {accessBadge(g.access)} {g.selectionSubmittedAt && <span className="ad-badge ok">Selection sent {fmt(g.selectionSubmittedAt)}</span>}</p>
        </div>
        <a className="ad-btn" href={`/client/${g.slug}`} target="_blank" rel="noreferrer">Open as client ↗</a>
      </div>
      {(msg || busy) && <p className="ad-flash">{busy || msg}</p>}
      {err && <p className="ad-error">{err}</p>}

      <div className="ad-gal-layout">
        <section className="ad-panel">
          <h4 className="ad-h4 first">Photos</h4>
          <div className="ad-add-photos" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) upload([...e.dataTransfer.files]); }}>
            <div className="ad-add-row">
              <button className="ad-btn primary" onClick={() => fileRef.current?.click()} disabled={Boolean(progress)}>Upload photos</button>
              <input ref={fileRef} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => { if (e.target.files.length) upload([...e.target.files]); e.target.value = ''; }} />
              <span className="ad-or ad-drop-hint">or drop files here</span>
            </div>
            <small className="ad-help">{r2
              ? 'Photos go straight to cloud storage (Cloudflare R2): full-size originals for download plus fast web previews. Select a whole shoot at once.'
              : 'Cloud storage is not set up — uploads are saved on the server (fine for a few photos; use Drive links for full shoots).'}</small>
            {progress && (
              <div className="ad-progress" role="status">
                <div className="ad-progress-bar"><span style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
                <span><b>{progress.drive ? 'Copying from Drive' : 'Uploading'} {progress.done} / {progress.total}</b>{progress.failed ? ` · ${progress.failed} failed` : ''}</span>
                <small>{progress.current ? `${progress.current} · ` : ''}keep this screen open</small>
              </div>
            )}
            {uploadErrors.length > 0 && (
              <details className="ad-error"><summary>{uploadErrors.length} photo{uploadErrors.length === 1 ? '' : 's'} didn’t upload</summary><ul>{uploadErrors.slice(0, 50).map((e, k) => <li key={k}>{e}</li>)}</ul></details>
            )}

            <div className="ad-drive">
              <label className="ad-drive-label" htmlFor="ad-drive-links">From Google Drive or links</label>
              <textarea id="ad-drive-links" className="ad-input" rows={2} value={links} onChange={(e) => setLinks(e.target.value)}
                autoCapitalize="off" autoCorrect="off" spellCheck={false} inputMode="url"
                placeholder="Paste a Google Drive folder link (or several, one per line)" />
              <div className="ad-drive-actions">
                {r2 && <button className="ad-btn primary" onClick={copyFromDrive} disabled={!links.trim() || Boolean(progress) || Boolean(busy)}>Copy full size</button>}
                <button className={`ad-btn${r2 ? '' : ' primary'}`} onClick={addLinks} disabled={!links.trim() || Boolean(progress) || Boolean(busy)}>{r2 ? 'Link only' : 'Add from links'}</button>
              </div>
              <small className="ad-help">{r2
                ? <>Share the folder as <b>“Anyone with the link can view”</b>. <b>Copy full size</b> stores the originals in the gallery (downloads work, safe if Drive changes). <b>Link only</b> is instant but shows Google’s ~2000px version and breaks if the Drive files are removed. Sub-folders need their own link.</>
                : <>Share the folder as <b>“Anyone with the link can view”</b>. Sub-folders need their own link.</>}</small>
            </div>
          </div>
          {g.photos.length === 0 ? <p className="ad-note">No photos yet.</p> : (
            <div className="ad-gal-grid">
              {g.photos.map((p, i) => (
                <figure key={p._id} className={`ad-gal-photo ${p.favorite ? 'fav' : ''} ${isCover(p) ? 'cover' : ''}`}>
                  <button type="button" className="ad-gal-open" onClick={() => setView(i)} aria-label={`View ${p.name || `photo ${i + 1}`}`}>
                    <PhotoBox src={img(p.thumb || p.src)} fixed="1 / 1" alt={p.name || `Photo ${i + 1}`} imgProps={{ title: p.name || undefined, loading: 'lazy', referrerPolicy: 'no-referrer' }} />
                  </button>
                  {p.favorite && <span className="ad-gal-fav" title="Client favourite">♥</span>}
                  {isCover(p) && <span className="ad-gal-cover">Cover</span>}
                  <figcaption>
                    {!isCover(p) && <button onClick={() => setCover(p)}>Set cover</button>}
                    <button className="danger" onClick={() => removePhoto(p)}>Remove</button>
                  </figcaption>
                  {p.note && <p className="ad-gal-note">“{p.note}”</p>}
                </figure>
              ))}
            </div>
          )}

          {view >= 0 && g.photos[view] && (
            <PhotoViewer
              photos={g.photos} index={view} onIndex={setView} onClose={() => setView(-1)}
              isCover={isCover} onCover={setCover}
              onRemove={async (p) => { const n = g.photos.length; if ((await removePhoto(p)) === false) return; setView((v) => (n <= 1 ? -1 : Math.min(v, n - 2))); }}
            />
          )}

          <h4 className="ad-h4">Films</h4>
          <div className="ad-add-photos">
            <textarea className="ad-input" rows={2} value={videoLinks} onChange={(e) => setVideoLinks(e.target.value)} placeholder="Paste YouTube (unlisted), Google Drive or video links" />
            <button className="ad-btn" onClick={addVideos} disabled={!videoLinks.trim()}>Add films</button>
          </div>
          {g.videos?.map((v) => (
            <div key={v._id} className="ad-video">
              <span className="ad-badge">{v.kind}</span>
              <input className="ad-input" defaultValue={v.title} onBlur={(e) => e.target.value !== v.title && renameVideo(v, e.target.value)} />
              <button className="ad-icon-btn danger" onClick={() => removeVideo(v)} aria-label="Remove film">×</button>
            </div>
          ))}
        </section>

        <aside className="ad-gal-side">
          <section className="ad-panel">
            <h4 className="ad-h4 first">Details</h4>
            <div className="ad-stack">
              <label className="ad-field"><span className="ad-label">Gallery title</span><input value={form.title} onChange={setF('title')} maxLength={120} {...dv.field('title', 'ad-input')} />{dv.error('title')}</label>
              <label className="ad-field"><span className="ad-label">Client name</span><input value={form.clientName} onChange={setF('clientName')} maxLength={60} {...dv.field('clientName', 'ad-input')} />{dv.error('clientName')}</label>
              <label className="ad-field"><span className="ad-label">Phone / WhatsApp</span><input value={form.clientPhone} onChange={setF('clientPhone')} maxLength={18} inputMode="tel" {...dv.field('clientPhone', 'ad-input')} />{dv.error('clientPhone')}</label>
              <label className="ad-field"><span className="ad-label">Email</span><input value={form.clientEmail} onChange={setF('clientEmail')} maxLength={160} type="email" {...dv.field('clientEmail', 'ad-input')} />{dv.error('clientEmail')}</label>
              <label className="ad-field"><span className="ad-label">Album picks limit (0 = unlimited)</span><input type="number" min="0" value={form.selectionLimit} onChange={setF('selectionLimit')} {...dv.field('selectionLimit', 'ad-input')} />{dv.error('selectionLimit')}</label>
              <label className="ad-switch"><input type="checkbox" checked={form.allowDownload} onChange={setF('allowDownload')} /><span /> Allow downloads</label>
              <button className="ad-btn primary" onClick={saveDetails}>Save details</button>
            </div>
          </section>
          <section className="ad-panel">
            <h4 className="ad-h4 first">Access & sharing</h4>
            <p className="ad-note">Access until <b>{fmt(g.access?.until)}</b> {accessBadge(g.access)}</p>
            <div className="ad-row-actions">
              <button className="ad-btn" onClick={() => extend(30)}>+30 days</button>
              <button className="ad-btn" onClick={() => extend(90)}>+90 days</button>
              <button className="ad-btn" onClick={() => extend(365)}>+1 year</button>
            </div>
            <div className="ad-stack" style={{ marginTop: 14 }}>
              <button className="ad-btn" onClick={resetPassword}>Reset password & share</button>
              {g.selectionSubmittedAt && <button className="ad-btn" onClick={reopen}>Re-open selection</button>}
              <button className="ad-btn ghost danger" onClick={remove}>Delete gallery</button>
            </div>
          </section>
        </aside>
      </div>
      {share && <ShareCard g={share.g} password={share.password} onClose={() => setShare(null)} />}
    </>
  );
}

/* ---------- List ---------- */
export default function Galleries({ token }) {
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [creating, setCreating] = useState(false);
  const [share, setShare] = useState(null);

  const load = () => api('/admin/client-galleries?brand=babysteps', { token }).then(setList).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => (list || []).filter((g) => !q || `${g.title} ${g.clientName} ${g.slug}`.toLowerCase().includes(q.toLowerCase())), [list, q]);

  if (open) return <GalleryDetail token={token} slug={open} onBack={() => setOpen(null)} onChanged={load} />;

  return (
    <>
      <div className="ad-gal-toolbar">
        <input className="ad-input" placeholder="Search by client, title or gallery name…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="ad-btn primary" onClick={() => setCreating(true)}>+ New gallery</button>
      </div>
      {err && <p className="ad-error">{err}</p>}
      {list == null && <p className="ad-note">Loading galleries…</p>}
      {list?.length === 0 && <div className="ad-panel ad-empty"><p>No client galleries yet.</p><button className="ad-btn primary" onClick={() => setCreating(true)}>Create the first one</button></div>}
      <div className="ad-gal-cards">
        {shown.map((g) => (
          <button key={g._id} className="ad-gal-card" onClick={() => setOpen(g.slug)}>
            <span className="ad-gal-card-img">{g.cover ? <img src={img(g.cover)} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span>No photos yet</span>}</span>
            <span className="ad-gal-card-body">
              <b>{g.title}</b>
              <small>{g.clientName} · <code>{g.slug}</code></small>
              <span className="ad-gal-meta">
                <span>{g.photoCount} photos</span>
                <span>♥ {g.favoriteCount}{g.selectionLimit ? ` / ${g.selectionLimit}` : ''}</span>
                {accessBadge(g.access)}
                {g.selectionSubmittedAt && <span className="ad-badge ok">Selection sent</span>}
              </span>
            </span>
          </button>
        ))}
      </div>
      <p className="ad-note">Clients sign in at <b>{loginUrl()}</b> · {STUDIO.name}.</p>
      {creating && <CreateGallery token={token} onClose={() => setCreating(false)} onCreated={(g) => { setCreating(false); load(); setShare({ g, password: g.password }); }} />}
      {share && <ShareCard g={share.g} password={share.password} onClose={() => { const s = share.g.slug; setShare(null); setOpen(s); }} />}
    </>
  );
}
