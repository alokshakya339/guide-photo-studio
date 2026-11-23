import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../components/Toast.jsx';
import { useDialog } from '../components/Dialog.jsx';
import DriveImport from './DriveImport.jsx';
import { driveToImage } from '../site.js';

const BASE = import.meta.env.VITE_API_URL || '';

/** Upload files (multipart) to the media library. */
export async function uploadFiles(token, files, folder = 'general') {
  const fd = new FormData();
  [...files].forEach((f) => fd.append('files', f));
  fd.append('folder', folder);
  const res = await fetch(`${BASE}/api/admin/cms/media`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

const fmtSize = (n) => (n ? (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`) : '');

/** Drop zone + file input. */
export function Uploader({ token, onUploaded, folder, compact }) {
  const input = useRef(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  async function send(files) {
    if (!files?.length) return;
    setBusy(true);
    setError('');
    try {
      const saved = await uploadFiles(token, files, folder);
      onUploaded(saved);
      const skipped = files.length - saved.length;
      toast({
        title: `${saved.length} photo${saved.length === 1 ? '' : 's'} uploaded successfully!`,
        message: skipped ? `${skipped} file${skipped === 1 ? ' was' : 's were'} skipped (not a valid image).` : 'They’re now in your media library.',
      });
    } catch (e) {
      setError(e.message);
      toast({ type: 'error', title: 'Upload failed', message: e.message });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div
      className={`dropzone ${drag ? 'is-drag' : ''} ${compact ? 'dropzone--compact' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); send(e.dataTransfer.files); }}
      onClick={() => input.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
    >
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple hidden onChange={(e) => send(e.target.files)} />
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
      <strong>{busy ? 'Uploading…' : 'Drop photos here or click to upload'}</strong>
      {!compact && <small>JPG, PNG, WebP, GIF or AVIF · up to 20 MB each · up to 30 at once</small>}
      {error && <small className="form__err">{error}</small>}
    </div>
  );
}

/** Library grid used both by the Media page and the picker. */
export function MediaGrid({ call, token, selectable, multiple, selected = [], onToggle, refreshKey, manage, onAdded }) {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [link, setLink] = useState('');
  const [msg, setMsg] = useState('');
  const toast = useToast();
  const dialog = useDialog();
  const load = useCallback(() => call(`/admin/cms/media${q ? `?q=${encodeURIComponent(q)}` : ''}`).then(setRows), [call, q]);
  useEffect(() => { load(); }, [load, refreshKey]);

  async function addLink(e) {
    e.preventDefault();
    try {
      const m = await call('/admin/cms/media/link', { method: 'POST', body: { url: link } });
      setLink('');
      setRows((r) => [m, ...(r || [])]);
      if (selectable) onToggle?.(m.url);
      onAdded?.([m.url]);
      toast({ title: 'Image link added', message: 'It’s now in your media library.' });
    } catch (err) {
      toast({ type: 'error', title: 'Couldn’t add link', message: err.message });
    }
  }
  async function remove(m) {
    const ok = await dialog.confirm({
      title: 'Delete this photo?',
      message: 'It will be removed from the media library. Any page still using it will show a broken image.',
      tone: 'danger', images: [m.url], confirmLabel: 'Delete photo',
    });
    if (!ok) return;
    await call(`/admin/cms/media/${m._id}`, { method: 'DELETE' });
    setRows((r) => r.filter((x) => x._id !== m._id));
    toast({ title: 'Photo deleted', message: m.originalName || 'Removed from the media library.' });
  }
  async function editAlt(m) {
    const alt = await dialog.prompt({
      title: 'Alt text', message: 'Describe the photo in a few words. It helps screen readers and Google.',
      defaultValue: m.alt || '', placeholder: 'e.g. Bride and groom under fireworks', images: [m.url], confirmLabel: 'Save alt text',
    });
    if (alt == null) return;
    const u = await call(`/admin/cms/media/${m._id}`, { method: 'PATCH', body: { alt } });
    setRows((r) => r.map((x) => (x._id === m._id ? u : x)));
    toast({ title: 'Alt text saved' });
  }
  function copy(url) {
    navigator.clipboard?.writeText(new URL(url, window.location.origin).href);
    toast({ type: 'info', title: 'Link copied', message: url, duration: 2500 });
  }

  return (
    <div className="mgrid-wrap">
      <Uploader token={token} compact={selectable} onUploaded={(items) => { setRows((r) => [...items, ...(r || [])]); if (selectable) items.forEach((m) => onToggle?.(m.url)); onAdded?.(items.map((m) => m.url)); }} />
      <DriveImport
        call={call}
        compact
        saveToLibrary
        onAdd={async (urls) => {
          await load();
          if (selectable) urls.forEach((u) => onToggle?.(u));
          onAdded?.(urls);
          toast({ title: `${urls.length} Google Drive photo${urls.length === 1 ? '' : 's'} added`, message: 'They’re now in your media library.' });
        }}
      />
      <div className="mgrid__bar">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or alt text…" aria-label="Search media" />
        <form onSubmit={addLink} className="mgrid__link">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="…or paste an image URL" aria-label="Image URL" />
          <button className="btn btn--ghost btn--sm" disabled={!link}>Add</button>
        </form>
      </div>
      {msg && <p className="note">{msg}</p>}
      {!rows ? <p className="muted">Loading…</p> : rows.length === 0 ? <p className="muted">No images yet.</p> : (
        <div className="mgrid">
          {rows.map((m) => {
            const on = selected.includes(m.url);
            return (
              <figure key={m._id} className={`mgrid__item ${on ? 'is-on' : ''}`}>
                <button
                  type="button"
                  className="mgrid__thumb"
                  onClick={() => (selectable ? onToggle?.(m.url) : copy(m.url))}
                  title={selectable ? (on ? 'Selected' : 'Select') : 'Copy link'}
                >
                  <img src={m.url} alt={m.alt || ''} loading="lazy" />
                  {selectable && <span className="mgrid__check">{on ? (multiple ? selected.indexOf(m.url) + 1 : '✓') : ''}</span>}
                </button>
                <figcaption>
                  <span title={m.originalName}>{m.originalName || m.url.split('/').pop()}</span>
                  <small>{[m.folder, fmtSize(m.size)].filter(Boolean).join(' · ')}</small>
                </figcaption>
                {manage && (
                  <div className="mgrid__actions">
                    <button type="button" className="link-btn" onClick={() => copy(m.url)}>Copy link</button>
                    <button type="button" className="link-btn" onClick={() => editAlt(m)}>Alt text</button>
                    <button type="button" className="link-btn" onClick={() => remove(m)}>Delete</button>
                  </div>
                )}
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Modal picker. onPick receives a url (single) or array of urls (multiple). */
export function MediaPicker({ call, token, multiple = false, initial = [], onPick, onClose }) {
  const [selected, setSelected] = useState(initial);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggle(url) {
    setSelected((s) => (multiple ? (s.includes(url) ? s.filter((x) => x !== url) : [...s, url]) : [url]));
  }

  return createPortal(
    <div className="picker" role="dialog" aria-modal="true" aria-label="Choose image" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="picker__card">
        <div className="picker__head">
          <h3>{multiple ? 'Choose photos' : 'Choose a photo'}</h3>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button>
        </div>
        <div className="picker__body">
          <MediaGrid
            call={call} token={token} selectable multiple={multiple} selected={selected} onToggle={toggle}
            // Choosing one image: a freshly uploaded / linked photo is used straight away, no extra "Use this photo" click.
            onAdded={(urls) => { if (!multiple && urls.length === 1) onPick(urls[0]); }}
          />
        </div>
        <div className="picker__foot">
          <span className="muted small">{selected.length ? `${selected.length} selected` : 'Click photos to select'}</span>
          <button className="btn btn--primary" disabled={!selected.length} onClick={() => onPick(multiple ? selected : selected[0])}>
            {multiple ? `Add ${selected.length || ''} photo${selected.length === 1 ? '' : 's'}` : 'Use this photo'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Single image field: preview + choose/replace/clear. */
export function ImageField({ label, value, onChange, call, token, hint }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="imgfield">
      <span className="imgfield__label">{label}</span>
      <div className="imgfield__row">
        <div className="imgfield__preview">{value ? <img src={value} alt="" /> : <span>No image</span>}</div>
        <div className="imgfield__ctl">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(true)}>{value ? 'Replace' : 'Choose image'}</button>
          {value && <button type="button" className="link-btn" onClick={() => onChange('')}>Remove</button>}
          <input value={value || ''} onChange={(e) => onChange(e.target.value)} onBlur={(e) => { const v = driveToImage(e.target.value); if (v !== e.target.value) onChange(v); }} placeholder="/images/…, https://… or a Google Drive link" aria-label={`${label} URL`} />
          {hint && <small className="muted">{hint}</small>}
        </div>
      </div>
      {open && <MediaPicker call={call} token={token} onClose={() => setOpen(false)} onPick={(url) => { onChange(url); setOpen(false); }} />}
    </div>
  );
}

/** Ordered list of images (e.g. hero slides, studio photos). Items: string url OR {src, alt}. */
export function ImageListField({ label, value = [], onChange, call, token, withAlt = false }) {
  const [open, setOpen] = useState(false);
  const items = value.map((v) => (typeof v === 'string' ? { src: v, alt: '' } : v));
  const out = (arr) => onChange(withAlt ? arr : arr.map((i) => i.src));
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const a = [...items];
    [a[i], a[j]] = [a[j], a[i]];
    out(a);
  };
  return (
    <div className="imglist">
      <div className="imglist__head">
        <span className="imgfield__label">{label}</span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(true)}>+ Add photos</button>
      </div>
      {items.length === 0 ? <p className="muted small">No photos yet.</p> : (
        <div className="imglist__grid">
          {items.map((it, i) => (
            <div key={`${it.src}-${i}`} className="imglist__item">
              <img src={it.src} alt="" />
              <span className="imglist__n">{i + 1}</span>
              <div className="imglist__ctl">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move left">←</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move right">→</button>
                <button type="button" onClick={() => out(items.filter((_, k) => k !== i))} aria-label="Remove">✕</button>
              </div>
              {withAlt && (
                <input value={it.alt || ''} placeholder="Alt text" onChange={(e) => out(items.map((x, k) => (k === i ? { ...x, alt: e.target.value } : x)))} />
              )}
            </div>
          ))}
        </div>
      )}
      {open && (
        <MediaPicker
          call={call} token={token} multiple
          onClose={() => setOpen(false)}
          onPick={(urls) => { out([...items, ...urls.map((src) => ({ src, alt: '' }))]); setOpen(false); }}
        />
      )}
    </div>
  );
}
