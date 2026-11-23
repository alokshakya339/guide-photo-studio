import { useEffect, useRef, useState } from 'react';
import { askConfirm } from './confirm.jsx';
import { api, asset } from '../api.js';
import { Markdown } from '../markdown.jsx';

const API_BASE = import.meta.env.VITE_API_URL || '';
const preview = (src) => (String(src || '').startsWith('/uploads/') ? asset(src) : src);

/* ---------- Media picker (shared Guide Photo Studio media library) ---------- */
export function MediaPicker({ token, onPick, onClose }) {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  const load = async () => {
    try { setItems(await api(`/admin/cms/media${q ? `?q=${encodeURIComponent(q)}` : ''}`, { token })); }
    catch (e) { setErr(e.message); setItems([]); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const upload = async (files) => {
    if (!files?.length) return;
    setBusy(`Uploading ${files.length} photo${files.length > 1 ? 's' : ''}…`); setErr('');
    try {
      const fd = new FormData();
      [...files].forEach((f) => fd.append('files', f));
      fd.append('folder', 'babysteps');
      const res = await fetch(`${API_BASE}/api/admin/cms/media`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      if (data.length === 1) { onPick(data[0].url); return; }
      await load();
    } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };

  const addLink = async () => {
    if (!url.trim()) return;
    setBusy('Adding link…'); setErr('');
    try { const m = await api('/admin/cms/media/link', { method: 'POST', token, body: { url: url.trim() } }); onPick(m.url); }
    catch (e) { setErr(e.message); } finally { setBusy(''); }
  };

  return (
    <div className="ad-modal" role="dialog" aria-modal="true" aria-label="Choose an image" onClick={onClose}>
      <div className="ad-modal-card wide" onClick={(e) => e.stopPropagation()}>
        <div className="ad-modal-head">
          <h3>Choose an image</h3>
          <button className="ad-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="ad-picker-tools">
          <button className="ad-btn primary" onClick={() => fileRef.current?.click()}>Upload photos</button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
          <span className="ad-or">or</span>
          <input className="ad-input" placeholder="Paste an image / Google Drive link" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addLink()} />
          <button className="ad-btn" onClick={addLink}>Use link</button>
        </div>
        <div className="ad-picker-search">
          <input className="ad-input" placeholder="Search the media library…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          <button className="ad-btn" onClick={load}>Search</button>
        </div>
        {busy && <p className="ad-note">{busy}</p>}
        {err && <p className="ad-error">{err}</p>}
        <div className="ad-media-grid"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files); }}>
          {items == null && <p className="ad-note">Loading library…</p>}
          {items?.length === 0 && <p className="ad-note">No images yet — upload some, or drop files here.</p>}
          {items?.map((m) => (
            <button key={m._id} className="ad-media" onClick={() => onPick(m.url)} title={m.originalName}>
              <img src={preview(m.url)} alt={m.alt || ''} loading="lazy" referrerPolicy="no-referrer" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Field types ---------- */
export function ImageField({ value, onChange, token }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ad-image">
      <div className="ad-thumb">{value ? <img src={preview(value)} alt="" referrerPolicy="no-referrer" /> : <span>No image</span>}</div>
      <div className="ad-image-actions">
        <button type="button" className="ad-btn" onClick={() => setOpen(true)}>{value ? 'Change' : 'Choose'} image</button>
        <input className="ad-input small" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="…or paste an image URL" />
      </div>
      {open && <MediaPicker token={token} onClose={() => setOpen(false)} onPick={(u) => { onChange(u); setOpen(false); }} />}
    </div>
  );
}

export function TagsField({ value = [], onChange, placeholder = 'Add an item and press Enter' }) {
  const [draft, setDraft] = useState('');
  const add = () => { const v = draft.trim(); if (v) { onChange([...value, v]); setDraft(''); } };
  return (
    <div className="ad-tags">
      {value.map((t, i) => (
        <span key={`${t}-${i}`} className="ad-tag">
          <input value={t} onChange={(e) => onChange(value.map((x, k) => (k === i ? e.target.value : x)))} size={Math.max(4, t.length)} />
          <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label={`Remove ${t}`}>×</button>
        </span>
      ))}
      <input className="ad-tag-new" value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} onBlur={add} />
    </div>
  );
}

export function PairsField({ value = [], onChange, labels = ['Name', 'Price'] }) {
  return (
    <div className="ad-pairs">
      {value.map(([a, b], i) => (
        <div key={i} className="ad-pair">
          <input className="ad-input" value={a} placeholder={labels[0]} onChange={(e) => onChange(value.map((p, k) => (k === i ? [e.target.value, p[1]] : p)))} />
          <input className="ad-input" value={b} placeholder={labels[1]} onChange={(e) => onChange(value.map((p, k) => (k === i ? [p[0], e.target.value] : p)))} />
          <button type="button" className="ad-icon-btn" onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label="Remove">×</button>
        </div>
      ))}
      <button type="button" className="ad-btn ghost" onClick={() => onChange([...value, ['', '']])}>+ Add</button>
    </div>
  );
}

/* Post editor: formatting toolbar + Write / Preview. */
export function MarkdownField({ value = '', onChange, token }) {
  const [tab, setTab] = useState('write');
  const [picker, setPicker] = useState(false);
  const ref = useRef(null);
  const wrap = (before, after = before, placeholder = 'text') => {
    const el = ref.current; if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const sel = value.slice(a, b) || placeholder;
    const next = value.slice(0, a) + before + sel + after + value.slice(b);
    onChange(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + before.length, a + before.length + sel.length); });
  };
  const line = (prefix) => {
    const el = ref.current; if (!el) return;
    const a = el.selectionStart; const start = value.lastIndexOf('\n', a - 1) + 1;
    onChange(value.slice(0, start) + prefix + value.slice(start));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + prefix.length, a + prefix.length); });
  };
  const insert = (text) => {
    const el = ref.current; const a = el ? el.selectionStart : value.length;
    onChange(`${value.slice(0, a)}${text}${value.slice(a)}`);
  };
  return (
    <div className="ad-md">
      <div className="ad-md-bar">
        <span className="ad-md-tabs">
          <button type="button" className={tab === 'write' ? 'on' : ''} onClick={() => setTab('write')}>Write</button>
          <button type="button" className={tab === 'preview' ? 'on' : ''} onClick={() => setTab('preview')}>Preview</button>
        </span>
        {tab === 'write' && (
          <span className="ad-md-tools">
            <button type="button" title="Heading" onClick={() => line('## ')}>H</button>
            <button type="button" title="Bold" onClick={() => wrap('**')}><b>B</b></button>
            <button type="button" title="Italic" onClick={() => wrap('*')}><i>I</i></button>
            <button type="button" title="Bullet list" onClick={() => line('- ')}>• List</button>
            <button type="button" title="Quote" onClick={() => line('> ')}>❝</button>
            <button type="button" title="Link" onClick={() => wrap('[', '](https://)', 'link text')}>Link</button>
            <button type="button" title="Insert image" onClick={() => setPicker(true)}>Image</button>
          </span>
        )}
      </div>
      {tab === 'write'
        ? <textarea ref={ref} className="ad-input ad-md-text" rows={18} value={value} onChange={(e) => onChange(e.target.value)} placeholder={'Write your post…\n\n## A heading\nA paragraph with **bold** and *italic*.\n- A list item'} />
        : <div className="ad-md-preview"><Markdown text={value} resolveImage={preview} /></div>}
      <small className="ad-help">## Heading · **bold** · *italic* · - list · 1. numbered · &gt; quote · [text](link) · images via the Image button. Leave an empty line between paragraphs.</small>
      {picker && <MediaPicker token={token} onClose={() => setPicker(false)} onPick={(u) => { insert(`\n\n![Photo description](${u})\n\n`); setPicker(false); }} />}
    </div>
  );
}

/* Draft a blog post with Claude, then fill the post's fields (the studio reviews before publishing). */
export function AiWriter({ item, setItem, token }) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState(item?.title || '');
  const [length, setLength] = useState('medium');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = async () => {
    if ((item?.body || '').trim() && !(await askConfirm({ title: 'Replace with an AI draft?', message: 'The current title, summary, post and tags will be replaced.', confirmLabel: 'Replace' }))) return;
    setBusy(true); setErr('');
    try {
      const { post } = await api('/admin/ai/blog', { method: 'POST', token, body: { topic, length, notes } });
      const slug = post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
      setItem({ title: post.title, excerpt: post.excerpt, body: post.body, tags: post.tags, category: post.category, slug: item?.slug || slug, published: false });
      setOpen(false);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  if (!open) return <button type="button" className="ad-btn ai" onClick={() => setOpen(true)}>✨ Write with AI</button>;
  return (
    <div className="ad-ai">
      <div className="ad-ai-head"><b>✨ Write with AI</b><button type="button" className="ad-x" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
      <label className="ad-field"><span className="ad-label">What should the post be about?</span>
        <input className="ad-input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. What to pack for your baby's newborn shoot" /></label>
      <div className="ad-grid">
        <label className="ad-field"><span className="ad-label">Length</span>
          <select className="ad-input" value={length} onChange={(e) => setLength(e.target.value)}><option value="short">Short (~500 words)</option><option value="medium">Medium (~850 words)</option><option value="long">Long (~1,400 words)</option></select></label>
        <label className="ad-field"><span className="ad-label">Notes (optional)</span>
          <input className="ad-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Mention our winter offer, keep it short…" /></label>
      </div>
      {err && <p className="ad-error">{err}</p>}
      <div className="ad-row-actions">
        <button type="button" className="ad-btn primary" onClick={run} disabled={busy || topic.trim().length < 4}>{busy ? 'Writing… (about 30–60 seconds)' : 'Generate draft'}</button>
        <small className="ad-help">The draft is saved as unpublished — read and edit it before switching “Published” on.</small>
      </div>
    </div>
  );
}

/** Renders one field from a schema entry: { key, label, type, options, help, placeholder }. */
export function Field({ f, value, onChange, token, item, setItem }) {
  const problem = f.check && value !== undefined ? f.check(value) : '';
  let input;
  switch (f.type) {
    case 'textarea': input = <textarea className="ad-input" rows={f.rows || 3} value={value || ''} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />; break;
    case 'image': input = <ImageField value={value} onChange={onChange} token={token} />; break;
    case 'markdown': input = <MarkdownField value={value || ''} onChange={onChange} token={token} />; break;
    case 'aiwriter': return <div className="ad-field wide"><AiWriter item={item} setItem={setItem} token={token} /></div>;
    case 'date': input = <input className="ad-input" type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} />; break;
    case 'tags': input = <TagsField value={value || []} onChange={onChange} />; break;
    case 'pairs': input = <PairsField value={value || []} onChange={onChange} labels={f.labels} />; break;
    case 'bool': input = <label className="ad-switch"><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /><span /> {f.on || 'Yes'}</label>; break;
    case 'select': input = <select className="ad-input" value={value || ''} onChange={(e) => onChange(e.target.value)}>{f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>; break;
    default: input = <input className={`ad-input ${problem ? 'is-invalid' : ''}`} aria-invalid={problem ? true : undefined} value={value ?? ''} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <label className={`ad-field ${f.wide ? 'wide' : ''} ${f.type === 'image' ? 'img' : ''}`}>
      <span className="ad-label">{f.label}</span>
      {input}
      {problem && <small className="field-err" role="alert">{problem}</small>}
      {f.help && !problem && <small className="ad-help">{f.help}</small>}
    </label>
  );
}

/** Edits a list of objects: add, remove, move up/down, collapse. */
export function ListEditor({ items = [], onChange, fields, title, makeNew, token, summary }) {
  const [open, setOpen] = useState(-1);
  const set = (i, key, v) => onChange(items.map((it, k) => (k === i ? { ...it, [key]: v } : it)));
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= items.length) return; const n = [...items]; [n[i], n[j]] = [n[j], n[i]]; onChange(n); setOpen(j); };
  return (
    <div className="ad-list">
      {items.map((it, i) => (
        <div key={i} className={`ad-item ${open === i ? 'open' : ''}`}>
          <div className="ad-item-head">
            <button type="button" className="ad-item-toggle" onClick={() => setOpen(open === i ? -1 : i)}>
              <span className="ad-item-no">{String(i + 1).padStart(2, '0')}</span>
              {summary?.image && it[summary.image] && <img src={preview(it[summary.image])} alt="" referrerPolicy="no-referrer" />}
              <span className="ad-item-title">{(typeof summary?.title === 'function' ? summary.title(it) : it[summary?.title || 'title']) || <em>Untitled</em>}</span>
              {summary?.sub && <span className="ad-item-sub">{typeof summary.sub === 'function' ? summary.sub(it) : it[summary.sub]}</span>}
            </button>
            <span className="ad-item-tools">
              <button type="button" className="ad-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button type="button" className="ad-icon-btn" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down">↓</button>
              <button type="button" className="ad-icon-btn danger" onClick={async () => { if (await askConfirm({ title: 'Remove this item?', message: 'It will be removed when you save your changes.', confirmLabel: 'Remove', danger: true })) onChange(items.filter((_, k) => k !== i)); }} aria-label="Remove">×</button>
            </span>
          </div>
          {open === i && (
            <div className="ad-item-body">
              {fields.map((f) => <Field key={f.key} f={f} value={it[f.key]} onChange={(v) => set(i, f.key, v)} token={token} item={it} setItem={(patch) => onChange(items.map((x, k) => (k === i ? { ...x, ...patch } : x)))} />)}
            </div>
          )}
        </div>
      ))}
      <button type="button" className="ad-btn ghost add" onClick={() => { onChange([...items, makeNew()]); setOpen(items.length); }}>+ Add {title}</button>
    </div>
  );
}
