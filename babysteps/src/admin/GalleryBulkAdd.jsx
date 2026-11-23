import { useRef, useState } from 'react';
import { api } from '../api.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Add many website gallery photos at once to one category:
 * upload several files, or paste Google Drive folder / photo links.
 * Photos are added to the end of the list; click "Save changes" to publish.
 */
export default function GalleryBulkAdd({ token, cats, onAdd }) {
  const [cat, setCat] = useState(cats[0][0]);
  const [links, setLinks] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef(null);
  const label = cats.find(([k]) => k === cat)?.[1];

  const done = (n, extra = '') => { setMsg(`${n} photo${n === 1 ? '' : 's'} added to ${label}${extra} — click “Save changes” to publish.`); };

  const upload = async (files) => {
    if (!files?.length) return;
    setBusy(`Uploading ${files.length} photo${files.length > 1 ? 's' : ''}…`); setErr(''); setMsg('');
    try {
      const fd = new FormData();
      [...files].forEach((f) => fd.append('files', f));
      fd.append('folder', 'babysteps');
      const res = await fetch(`${API_BASE}/api/admin/cms/media`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onAdd(data.map((m) => m.url), cat);
      done(data.length);
    } catch (e) { setErr(e.message); } finally { setBusy(''); if (fileRef.current) fileRef.current.value = ''; }
  };

  const addLinks = async () => {
    if (!links.trim()) return;
    setBusy('Reading the Drive folder…'); setErr(''); setMsg('');
    try {
      const { images, errors } = await api('/admin/cms/resolve-links', { method: 'POST', token, body: { text: links } });
      if (!images.length) throw new Error(errors?.join(' ') || 'No photos found in those links.');
      onAdd(images.map((i) => i.url), cat);
      setLinks('');
      done(images.length, errors?.length ? ` (${errors.length} link${errors.length === 1 ? '' : 's'} skipped: ${errors.join(' ')})` : '');
    } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };

  return (
    <div className="ad-bulk">
      <h4 className="ad-h4 first">Add photos</h4>
      <label className="ad-field"><span className="ad-label">Category</span>
        <select className="ad-input" value={cat} onChange={(e) => setCat(e.target.value)}>{cats.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </label>
      <div className="ad-drive">
        <span className="ad-drive-label">From your computer / phone</span>
        <div className="ad-drive-actions">
          <button type="button" className="ad-btn" onClick={() => fileRef.current?.click()} disabled={Boolean(busy)}>Choose photos…</button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
        </div>
        <label className="ad-drive-label" htmlFor="ad-gallery-drive">From Google Drive</label>
        <textarea id="ad-gallery-drive" className="ad-input" rows={2} value={links} onChange={(e) => setLinks(e.target.value)}
          placeholder="Paste a Google Drive folder link (or photo links, one per line)" />
        <div className="ad-drive-actions">
          <button type="button" className="ad-btn primary" onClick={addLinks} disabled={!links.trim() || Boolean(busy)}>Add to {label}</button>
        </div>
        <small className="ad-help">Share the Drive folder as <b>“Anyone with the link can view”</b> and keep the photos there — the website shows them from Drive. Sub-folders need their own link.</small>
      </div>
      {busy && <p className="ad-note">{busy}</p>}
      {msg && <p className="ad-note">{msg}</p>}
      {err && <p className="ad-error">{err}</p>}
    </div>
  );
}
