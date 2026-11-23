import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageField } from './media.jsx';
import { useToast } from '../components/Toast.jsx';
import { useDialog } from '../components/Dialog.jsx';
import Select from '../components/Select.jsx';

const API_BASE = import.meta.env.VITE_API_URL || '';

/** Audio field: upload an MP3/M4A (music library) or paste a link, with a preview player. */
function AudioField({ label, value, onChange, onUploaded, token, required, hint }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pick = async (file) => {
    if (!file) return;
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/api/admin/cms/music/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onChange(data.url);
      onUploaded?.(data.name || file.name);
    } catch (e) { setErr(e.message); } finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  return (
    <div className="cms__audio">
      <span>{label}{required ? ' *' : ''}</span>
      <div className="cms__audio-row">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => input.current?.click()} disabled={busy}>{busy ? 'Uploading…' : value ? 'Replace file' : 'Upload MP3 / M4A'}</button>
        <input ref={input} type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/wav,.mp3,.m4a" hidden onChange={(e) => pick(e.target.files?.[0])} />
        <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="…or paste a link to an MP3 (https://…)" aria-label={`${label} link`} />
      </div>
      {value && <audio controls preload="none" src={value} className="cms__audio-player" />}
      {hint && <small className="muted">{hint}</small>}
      {err && <small className="form__err">{err}</small>}
    </div>
  );
}

/**
 * Config-driven list editor for a CMS collection.
 * config = {
 *   key: 'films', title: 'Films', singular: 'film',
 *   itemTitle(row), itemSub(row), thumb(row),
 *   publishField?: 'published', defaults?: {},
 *   fields: [{ name, label, type: text|textarea|number|checkbox|image|list|tags|select|youtube, options?, hint?, from?(row), required? }]
 *   renderExtra?(row, helpers)   // optional extra panel under the form (e.g. portfolio photos)
 * }
 */
export default function CollectionEditor({ config, call, token, onChanged }) {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null); // row or { __new: true }
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const dragFrom = useRef(null);
  const toast = useToast();
  const dialog = useDialog();
  const viewAction = (row) => (config.viewUrl ? { label: 'View on website', href: config.viewUrl(row) } : undefined);

  const base = `/admin/cms/${config.key}`;
  const load = useCallback(() => call(base).then(setRows), [call, base]);
  useEffect(() => { load(); }, [load]);

  function toForm(row) {
    const f = {};
    config.fields.forEach((fd) => {
      const v = fd.from ? fd.from(row) : row?.[fd.name];
      if (fd.type === 'list') f[fd.name] = (v || []).join('\n');
      else if (fd.type === 'tags') f[fd.name] = (v || []).join(', ');
      else if (fd.type === 'checkbox') f[fd.name] = v ?? fd.default ?? false;
      else f[fd.name] = v ?? fd.default ?? '';
    });
    return f;
  }

  function open(row) {
    setMsg('');
    setEditing(row || { __new: true });
    setForm(toForm(row || config.defaults || {}));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const body = { ...form };
    config.fields.forEach((fd) => {
      if (fd.type === 'number') body[fd.name] = body[fd.name] === '' ? (fd.nullable ? null : undefined) : Number(body[fd.name]);
    });
    try {
      const saved = editing.__new
        ? await call(base, { method: 'POST', body })
        : await call(`${base}/${editing._id}`, { method: 'PATCH', body });
      await load();
      setEditing(saved);
      setForm(toForm(saved));
      toast({
        title: editing.__new ? `New ${config.singular} created successfully!` : `${cap(config.singular)} saved successfully!`,
        message: `“${config.itemTitle(saved)}” is ${config.publishField && !saved[config.publishField] ? 'saved but hidden from' : 'live on'} the website.`,
        action: viewAction(saved),
      });
      onChanged?.();
    } catch (err) {
      setMsg(err.message);
      toast({ type: 'error', title: `Couldn’t save ${config.singular}`, message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(row) {
    const ok = await dialog.confirm({
      title: `Delete this ${config.singular}?`,
      message: `“${config.itemTitle(row)}” will be removed from the website. This can’t be undone.`,
      tone: 'danger', images: config.thumb?.(row) ? [config.thumb(row)] : undefined, confirmLabel: `Delete ${config.singular}`,
    });
    if (!ok) return;
    try {
      await call(`${base}/${row._id}`, { method: 'DELETE' });
      if (editing?._id === row._id) setEditing(null);
      load();
      onChanged?.();
      toast({ title: `${cap(config.singular)} deleted`, message: `“${config.itemTitle(row)}” was removed from the website.` });
    } catch (err) {
      toast({ type: 'error', title: 'Delete failed', message: err.message });
    }
  }

  async function togglePublish(row) {
    const live = !row[config.publishField];
    try {
      await call(`${base}/${row._id}`, { method: 'PATCH', body: { [config.publishField]: live } });
      load();
      onChanged?.();
      toast({
        type: live ? 'success' : 'info',
        title: live ? `“${config.itemTitle(row)}” is now live` : `“${config.itemTitle(row)}” is now hidden`,
        message: live ? 'Visitors can see it on the website.' : 'It stays saved here but won’t show on the website.',
        action: live ? viewAction(row) : undefined,
      });
    } catch (err) {
      toast({ type: 'error', title: 'Update failed', message: err.message });
    }
  }

  async function reorder(from, to) {
    if (from === to || from == null) return;
    const next = [...rows];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setRows(next);
    try {
      await call(`${base}/order`, { method: 'PUT', body: { ids: next.map((r) => r._id) } });
      onChanged?.();
      toast({ type: 'info', title: 'Order updated', message: `“${config.itemTitle(m)}” moved to position ${to + 1}.`, duration: 2500 });
    } catch (err) {
      toast({ type: 'error', title: 'Reorder failed', message: err.message });
      load();
    }
  }

  const set = (name) => (e) => {
    const v = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setForm((f) => ({ ...f, [name]: v }));
  };

  return (
    <div className={`cms ${editing ? 'cms--editing' : ''}`}>
      <div className="cms__list">
        <div className="admin__bar">
          <div>
            <h2>{config.title}</h2>
            {config.description && <p className="muted small">{config.description}</p>}
          </div>
          <button className="btn btn--primary btn--sm" onClick={() => open(null)}>+ Add {config.singular}</button>
        </div>
        {!rows ? <p className="muted">Loading…</p> : rows.length === 0 ? <p className="muted">Nothing here yet.</p> : (
          <ol className="cms__rows">
            {rows.map((r, i) => (
              <li
                key={r._id}
                className={`cms__row ${editing?._id === r._id ? 'is-active' : ''} ${config.publishField && !r[config.publishField] ? 'is-hidden' : ''}`}
                draggable
                onDragStart={() => { dragFrom.current = i; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { reorder(dragFrom.current, i); dragFrom.current = null; }}
              >
                <span className="cms__grip" title="Drag to reorder" aria-hidden="true">⋮⋮</span>
                {config.thumb && (
                  <span className="cms__thumb">{config.thumb(r) ? <img src={config.thumb(r)} alt="" loading="lazy" /> : null}</span>
                )}
                <button className="cms__main" onClick={() => open(r)}>
                  <strong>{config.itemTitle(r)}</strong>
                  {config.itemSub && <small>{config.itemSub(r)}</small>}
                </button>
                <div className="cms__btns">
                  <button className="cms__mini" onClick={() => reorder(i, i - 1)} disabled={i === 0} aria-label="Move up">↑</button>
                  <button className="cms__mini" onClick={() => reorder(i, i + 1)} disabled={i === rows.length - 1} aria-label="Move down">↓</button>
                  {config.publishField && (
                    <button className={`cms__pill ${r[config.publishField] ? 'is-on' : ''}`} onClick={() => togglePublish(r)}>
                      {r[config.publishField] ? 'Live' : 'Hidden'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="muted small">Drag rows (or use ↑ ↓) to change the order shown on the website.</p>
      </div>

      {editing && (
        <form className="panel form cms__form" onSubmit={save}>
          <div className="cms__form-head">
            <h3>{editing.__new ? `New ${config.singular}` : `Edit ${config.singular}`}</h3>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(null)}>Close</button>
          </div>
          {config.fields.map((fd) => {
            const v = form[fd.name];
            if (fd.type === 'image') {
              return <ImageField key={fd.name} label={fd.label} value={v} onChange={set(fd.name)} call={call} token={token} hint={fd.hint} />;
            }
            if (fd.type === 'audio') {
              return (
                <AudioField
                  key={fd.name} label={fd.label} value={v} required={fd.required} hint={fd.hint} token={token}
                  onChange={set(fd.name)}
                  onUploaded={(name) => { if (!form.title) set('title')(name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim()); }}
                />
              );
            }
            if (fd.type === 'checkbox') {
              return (
                <label key={fd.name} className="check">
                  <input type="checkbox" checked={!!v} onChange={set(fd.name)} />
                  <span>{fd.label}</span>
                </label>
              );
            }
            return (
              <label key={fd.name}>
                <span>{fd.label}{fd.required ? ' *' : ''}</span>
                {fd.type === 'textarea' || fd.type === 'list' ? (
                  <textarea rows={fd.type === 'list' ? 4 : 3} value={v} onChange={set(fd.name)} placeholder={fd.placeholder || (fd.type === 'list' ? 'One per line' : '')} />
                ) : fd.type === 'select' ? (
                  <Select value={v} onChange={set(fd.name)} options={fd.options} ariaLabel={fd.label} />
                ) : (
                  <input
                    type={fd.type === 'number' ? 'number' : 'text'}
                    value={v}
                    onChange={set(fd.name)}
                    placeholder={fd.placeholder || ''}
                    required={fd.required}
                    step={fd.step}
                  />
                )}
                {fd.type === 'youtube' && <YoutubePreview value={v} vertical={fd.vertical} />}
                {fd.type === 'reel' && <ReelPreview value={v} />}
                {fd.hint && <small className="muted">{fd.hint}</small>}
              </label>
            );
          })}
          {msg && <p className="note note--error">{msg}</p>}
          <div className="cms__actions">
            {!editing.__new && <button type="button" className="link-btn" onClick={() => remove(editing)}>Delete</button>}
            <button className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : editing.__new ? `Create ${config.singular}` : 'Save changes'}</button>
          </div>
          {!editing.__new && config.renderExtra?.(editing, { call, token, reload: load, onChanged })}
        </form>
      )}
    </div>
  );
}

const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);

function parseYoutube(s) {
  const v = String(s || '').trim();
  if (/^[\w-]{11}$/.test(v)) return v;
  const m = v.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : null;
}

const parseInstagram = (s) => String(s || '').trim().match(/instagram\.com\/(?:[\w.]+\/)?(?:reels?|p|tv)\/([A-Za-z0-9_-]{5,40})/i)?.[1] || null;

/** Reel link: YouTube Shorts (shows the cover) or Instagram reel (needs its own cover). */
function ReelPreview({ value }) {
  if (!value) return <small className="muted">Works with YouTube Shorts and Instagram reels.</small>;
  const ig = parseInstagram(value);
  if (ig) {
    return (
      <span className="ytprev ytprev--v">
        <small>✓ Instagram reel <code>{ig}</code> · <a href={`https://www.instagram.com/reel/${ig}/`} target="_blank" rel="noreferrer">open ↗</a><br />Add a vertical cover image below — Instagram doesn’t share one.</small>
      </span>
    );
  }
  if (parseYoutube(value)) return <YoutubePreview value={value} vertical />;
  return <small className="form__err">Paste a YouTube Shorts link (youtube.com/shorts/…) or an Instagram reel link (instagram.com/reel/…).</small>;
}

function YoutubePreview({ value, vertical }) {
  const id = parseYoutube(value);
  if (!value) return null;
  if (!id) return <small className="form__err">That doesn’t look like a YouTube link.</small>;
  return (
    <span className={`ytprev ${vertical ? 'ytprev--v' : ''}`}>
      <img src={`https://i.ytimg.com/vi/${id}/${vertical ? 'oar2' : 'hqdefault'}.jpg`} alt="" onError={(e) => { e.currentTarget.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`; }} />
      <small>Video ID: <code>{id}</code> · <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer">open ↗</a></small>
    </span>
  );
}
