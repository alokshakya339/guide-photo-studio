import { useEffect, useRef, useState } from 'react';
import { askConfirm } from './confirm.jsx';
import { api } from '../api.js';

const API_BASE = import.meta.env.VITE_API_URL || '';
const mb = (b) => `${(b / 1024 / 1024).toFixed(b < 10 * 1024 * 1024 ? 1 : 0)} MB`;

/** Storage meter + download/restore backups. */
export default function Backup({ token }) {
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  useEffect(() => { api('/admin/storage', { token }).then(setStats).catch((e) => setErr(e.message)); }, [token]);

  const download = async (path, fallbackName) => {
    setBusy(`Preparing ${fallbackName}…`); setErr('');
    try {
      const res = await fetch(`${API_BASE}/api${path}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Download failed');
      const name = (res.headers.get('Content-Disposition') || '').match(/filename="?([^"]+)"?/)?.[1] || fallbackName;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(await res.blob());
      a.download = name;
      a.click();
      setMsg(`Downloaded ${name} — keep it somewhere safe (Google Drive, your computer).`);
    } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };

  const restore = async (file) => {
    if (!file) return;
    if (!(await askConfirm({ title: `Restore from ${file.name}?`, message: 'Items in the backup are added back or overwritten. Nothing else is deleted.', confirmLabel: 'Restore' }))) return;
    setBusy('Restoring…'); setErr('');
    try {
      const data = JSON.parse(await file.text());
      const { restored } = await api('/admin/restore', { method: 'POST', token, body: data });
      setMsg(`Restored: ${Object.entries(restored).map(([k, v]) => `${v} ${k}`).join(', ')}. Reload the admin to see everything.`);
    } catch (e) { setErr(e instanceof SyntaxError ? 'That file is not a valid backup.' : e.message); } finally { setBusy(''); if (fileRef.current) fileRef.current.value = ''; }
  };

  const pct = stats ? Math.min(100, Math.round((stats.storageBytes / stats.limitBytes) * 100)) : 0;
  return (
    <>
      {(busy || msg) && <p className="ad-flash">{busy || msg}</p>}
      {err && <p className="ad-error">{err}</p>}

      <section className="ad-panel" style={{ marginBottom: 18 }}>
        <h4 className="ad-h4 first">Storage</h4>
        {!stats ? <p className="ad-note">Measuring…</p> : (
          <>
            <div className={`ad-meter ${pct >= 85 ? 'bad' : pct >= 65 ? 'warn' : ''}`}><i style={{ width: `${Math.max(pct, 1)}%` }} /></div>
            <p className="ad-note"><b>{mb(stats.storageBytes)}</b> of {mb(stats.limitBytes)} used ({pct}%) · {stats.photos} uploaded photos ({mb(stats.photoBytes)}) · photos stored {stats.mode === 'mongo' ? 'in the database' : 'on the server disk'}</p>
            {pct >= 65 && <p className="ad-error">Storage is filling up. For client galleries, paste <b>Google Drive</b> folder links instead of uploading, delete unused photos in the media library, or upgrade the database plan.</p>}
            <p className="ad-help">Tip: client galleries with many photos are best added as Google Drive links (Client galleries → paste a shared folder link) — they don't use this space.</p>
          </>
        )}
      </section>

      <section className="ad-panel" style={{ marginBottom: 18 }}>
        <h4 className="ad-h4 first">Download a backup</h4>
        <p className="ad-note">The free database has no automatic backups. Download both files every month (and before big changes) and keep them safe.</p>
        <div className="ad-row-actions" style={{ marginTop: 10 }}>
          <button className="ad-btn primary" disabled={!!busy} onClick={() => download('/admin/backup', 'babysteps-backup.json')}>Download data backup (.json)</button>
          <button className="ad-btn" disabled={!!busy} onClick={() => download('/admin/backup/photos', 'babysteps-photos.zip')}>Download uploaded photos (.zip)</button>
        </div>
        <p className="ad-help" style={{ marginTop: 8 }}>The data backup contains website content, blog posts, client galleries (with their logins), enquiries, gift cards and the media list.</p>
      </section>

      <section className="ad-panel">
        <h4 className="ad-h4 first">Restore</h4>
        <p className="ad-note">Upload a data backup (.json) to bring content back. Items in the file are added or overwritten; nothing else is removed.</p>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files[0])} />
        <button className="ad-btn" disabled={!!busy} onClick={() => fileRef.current?.click()}>Choose backup file…</button>
      </section>
    </>
  );
}
