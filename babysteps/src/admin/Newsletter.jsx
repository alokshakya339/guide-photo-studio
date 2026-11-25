import { useEffect, useMemo, useRef, useState } from 'react';
import { askConfirm } from './confirm.jsx';
import { Field } from './fields.jsx';
import { api } from '../api.js';

const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const DRAFT_KEY = 'babysteps-newsletter-draft';
const EMPTY = { subject: '', preheader: '', heading: '', body: '', image: '', buttonText: '', buttonUrl: '' };
const loadDraft = () => { try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') }; } catch { return { ...EMPTY }; } };
const saveDraft = (d) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* private mode */ } };
const STATUS = { sending: ['Sending…', 'warn'], paused: ['Paused', 'bad'], cancelled: ['Cancelled', ''], sent: ['Sent', 'ok'] };
const tallyText = (t) => [`${t.added} added`, t.exists && `${t.exists} already on the list`, t.unsubscribed && `${t.unsubscribed} skipped (they unsubscribed)`, t.invalid && `${t.invalid} not valid`].filter(Boolean).join(' · ');

/** Admin → Newsletter: write an email, send it to every subscriber, and manage the subscriber list. */
export default function Newsletter({ token }) {
  const [tab, setTab] = useState('compose');
  const [subs, setSubs] = useState(null);
  const [casts, setCasts] = useState([]);
  const [err, setErr] = useState('');
  const [quota, setQuota] = useState(null); // { limit, used, left, resetsAt }

  const loadQuota = () => api('/admin/newsletter/limit', { token }).then(setQuota).catch(() => {});
  const loadSubs = () => api('/admin/newsletter/subscribers', { token }).then(setSubs).catch((e) => setErr(e.message));
  const loadCasts = () => api('/admin/newsletter/broadcasts', { token }).then((d) => setCasts(d.items)).catch((e) => setErr(e.message));
  useEffect(() => { loadSubs(); loadCasts(); loadQuota(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh progress while something is actively sending (not while it waits for tomorrow's limit).
  const busy = casts.some((c) => c.status === 'sending');
  const live = casts.some((c) => c.status === 'sending' && !isWaiting(c));
  useEffect(() => {
    if (!live) return undefined;
    const t = setInterval(() => { loadCasts(); loadQuota(); }, 2500);
    return () => clearInterval(t);
  }, [live]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = subs?.items.filter((s) => s.status === 'subscribed').length ?? 0;

  return (
    <>
      <div className="ad-subtabs" role="tablist">
        <button className={tab === 'compose' ? 'on' : ''} onClick={() => setTab('compose')}>✍️ Write email</button>
        <button className={tab === 'sent' ? 'on' : ''} onClick={() => setTab('sent')}>📬 Sent <small>{casts.length}</small></button>
        <button className={tab === 'subs' ? 'on' : ''} onClick={() => setTab('subs')}>👥 Subscribers <small>{active}</small></button>
      </div>
      {subs && !subs.emailEnabled && (
        <p className="ad-error">Email isn't set up on the server yet, so nothing can be sent. Add <code>BREVO_API_KEY</code> and <code>EMAIL_FROM</code> (or SMTP settings) to <code>server/.env</code> and restart.</p>
      )}
      {err && <p className="ad-error">{err}</p>}
      {quota && <DailyLimit token={token} quota={quota} onChange={(q) => { setQuota(q); setTimeout(loadCasts, 800); }} />}
      {tab === 'compose' && <Compose token={token} active={active} quota={quota} onSent={() => { loadCasts(); loadQuota(); setTab('sent'); }} onTest={loadQuota} busy={busy} />}
      {tab === 'sent' && <Sent token={token} items={casts} reload={loadCasts} setErr={setErr} />}
      {tab === 'subs' && <Subscribers token={token} data={subs} reload={loadSubs} setErr={setErr} />}
    </>
  );
}

const isWaiting = (b) => b.status === 'sending' && b.waitingUntil && new Date(b.waitingUntil) > new Date();
const dayName = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

/* ---------------- Daily limit ---------------- */
function DailyLimit({ token, quota, onChange }) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(String(quota.limit));
  const [err, setErr] = useState('');
  const save = async () => {
    setErr('');
    try { onChange(await api('/admin/newsletter/limit', { method: 'PUT', token, body: { limit: Number(val) } })); setEdit(false); }
    catch (e) { setErr(e.message); }
  };
  const pct = Math.min(100, Math.round((quota.used / quota.limit) * 100));
  return (
    <div className="ad-panel ad-news-quota">
      <div className="ad-progress">
        <span><b>{quota.used}</b> of <b>{quota.limit}</b> emails sent today{quota.left ? ` · ${quota.left} left` : ' · limit reached — more after midnight'}</span>
        <div className="ad-progress-bar"><span style={{ width: `${pct}%` }} /></div>
      </div>
      {edit ? (
        <span className="ad-news-quota-edit">
          <input className="ad-input" type="number" min="1" max="100000" value={val} onChange={(e) => setVal(e.target.value)} aria-label="Daily email limit" onKeyDown={(e) => e.key === 'Enter' && save()} />
          <button className="ad-btn primary" onClick={save}>Save</button>
          <button className="ad-btn ghost" onClick={() => { setEdit(false); setVal(String(quota.limit)); }}>Cancel</button>
        </span>
      ) : <button className="ad-btn ghost" onClick={() => setEdit(true)}>Daily limit: {quota.limit} ✎</button>}
      {err && <p className="ad-error">{err}</p>}
    </div>
  );
}

/* ---------------- Write & send ---------------- */
function Compose({ token, active, quota, onSent, onTest, busy }) {
  const [d, setD] = useState(loadDraft);
  const [html, setHtml] = useState('');
  const [testTo, setTestTo] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  const set = (k) => (v) => setD((x) => ({ ...x, [k]: v }));

  useEffect(() => { saveDraft(d); }, [d]);
  // Live preview, built by the server with the real email template.
  useEffect(() => {
    const t = setTimeout(() => {
      api('/admin/newsletter/preview', { method: 'POST', token, body: { ...d, sampleName: 'Priya' } }).then((r) => setHtml(r.html)).catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [d, token]);

  const test = async () => {
    setErr(''); setMsg('Sending test…');
    try { const r = await api('/admin/newsletter/test', { method: 'POST', token, body: { ...d, to: testTo.trim() } }); setMsg(`Test sent to ${r.to} ✓ — check the inbox (and spam).`); onTest(); }
    catch (e) { setMsg(''); setErr(e.message); }
  };
  const send = async () => {
    setErr(''); setMsg('');
    if (!d.subject.trim() || !d.body.trim()) { setErr('Add a subject and a message first.'); return; }
    const left = quota?.left ?? active;
    const limit = quota?.limit || active;
    const days = active > left ? 1 + Math.ceil((active - left) / limit) : 1;
    const plan = active <= left
      ? `All ${active} go out today.`
      : `Daily limit is ${limit}: ${left ? `${left} go out today` : 'none can go out today'}, the rest automatically over the next ${days - (left ? 1 : 0)} day${days - (left ? 1 : 0) === 1 ? '' : 's'} (about ${days} day${days === 1 ? '' : 's'} in all). You don't need to do anything.`;
    const ok = await askConfirm({
      title: `Send to ${active} subscriber${active === 1 ? '' : 's'}?`,
      message: `“${d.subject}” will be emailed to everyone on your list. ${plan} This can't be undone (you can pause or cancel while it's sending).`,
      confirmLabel: 'Send now',
    });
    if (!ok) return;
    setSending(true);
    try { await api('/admin/newsletter/broadcasts', { method: 'POST', token, body: d }); setD({ ...EMPTY }); onSent(); }
    catch (e) { setErr(e.message); } finally { setSending(false); }
  };

  return (
    <div className="ad-news-compose">
      <section className="ad-panel">
        <div className="ad-grid">
          <Field f={{ key: 'subject', label: 'Subject line', wide: true, placeholder: 'e.g. 🎄 Christmas mini-sessions are open!', help: 'What people see in their inbox. Type {name} to use their first name.' }} value={d.subject} onChange={set('subject')} />
          <Field f={{ key: 'preheader', label: 'Preview text (optional)', wide: true, placeholder: 'Only 12 slots · 20–22 Dec · Sector 37 studio', help: 'The grey line shown after the subject in Gmail.' }} value={d.preheader} onChange={set('preheader')} />
          <Field f={{ key: 'heading', label: 'Heading in the email (optional)', wide: true, placeholder: 'Hi {name}, our festive set is ready ✨' }} value={d.heading} onChange={set('heading')} />
          <Field f={{ key: 'body', label: 'Message', type: 'textarea', rows: 10, wide: true, placeholder: 'Write your message…\n\nLeave an empty line between paragraphs.',
            help: 'Empty line = new paragraph · **bold** · [link text](https://…) · {name} = first name (or “there”).' }} value={d.body} onChange={set('body')} />
          <Field f={{ key: 'image', label: 'Photo (optional)', type: 'image', wide: true, help: 'Landscape photos look best — tall photos make people scroll before they reach your message.' }} value={d.image} onChange={set('image')} token={token} />
          <Field f={{ key: 'buttonText', label: 'Button text (optional)', placeholder: 'Book your slot' }} value={d.buttonText} onChange={set('buttonText')} />
          <Field f={{ key: 'buttonUrl', label: 'Button link', placeholder: '/contact#book  or  https://…' }} value={d.buttonUrl} onChange={set('buttonUrl')} />
        </div>
        <div className="ad-news-actions">
          <input className="ad-input" type="email" placeholder="Test to: your admin email" value={testTo} onChange={(e) => setTestTo(e.target.value)} aria-label="Send test to" />
          <button className="ad-btn" onClick={test}>Send test</button>
          <button className="ad-btn primary" onClick={send} disabled={sending || busy || !active} title={busy ? 'Another email is still sending' : ''}>
            {sending ? 'Starting…' : `Send to ${active} subscriber${active === 1 ? '' : 's'}`}
          </button>
          {(d.subject || d.body) && <button className="ad-btn ghost" onClick={() => setD({ ...EMPTY })}>Clear</button>}
        </div>
        {busy && <p className="ad-note">An email is still going out (see the Sent tab) — you can send the next one when it finishes.</p>}
        {!active && <p className="ad-note">No subscribers yet — add some in the Subscribers tab, or wait for website sign-ups.</p>}
        {msg && <p className="ad-note">{msg}</p>}
        {err && <p className="ad-error">{err}</p>}
      </section>
      <section className="ad-news-preview">
        <span className="ad-label">Preview <small>(as “Priya” sees it)</small></span>
        <iframe title="Email preview" srcDoc={html} sandbox="" />
      </section>
    </div>
  );
}

/* ---------------- Sent emails ---------------- */
function Sent({ token, items, reload, setErr }) {
  const act = async (b, action) => {
    if (action === 'cancel' && !(await askConfirm({ title: 'Cancel this email?', message: 'Nobody else on the list will get it. People who already received it keep it.', confirmLabel: 'Cancel sending', danger: true }))) return;
    try { await api(`/admin/newsletter/broadcasts/${b._id}/${action}`, { method: 'POST', token }); } catch (e) { setErr(e.message); }
    reload();
  };
  const remove = async (b) => {
    if (!(await askConfirm({ title: 'Delete from history?', message: `“${b.subject}” will be removed from this list. Emails already sent are not affected.`, confirmLabel: 'Delete', danger: true }))) return;
    try { await api(`/admin/newsletter/broadcasts/${b._id}`, { method: 'DELETE', token }); } catch (e) { setErr(e.message); }
    reload();
  };
  if (!items.length) return <div className="ad-panel ad-empty"><p>Nothing sent yet. Emails you send appear here with their progress.</p></div>;
  return (
    <div className="ad-list">
      {items.map((b) => {
        const [label, tone] = isWaiting(b) ? [`Continues ${dayName(b.waitingUntil)}`, 'warn'] : STATUS[b.status] || [b.status, ''];
        const pct = b.total ? Math.round(((b.sent + b.failed) / b.total) * 100) : 0;
        return (
          <div key={b._id} className="ad-item ad-news-item">
            <div className="ad-news-row">
              <div className="ad-news-main">
                <b>{b.subject}</b>
                <small>{when(b.startedAt || b.createdAt)}{b.finishedAt && b.status === 'sent' ? ` → ${when(b.finishedAt)}` : ''}</small>
              </div>
              <span className={`ad-badge ${tone}`}>{label}</span>
            </div>
            <div className="ad-progress">
              <div className="ad-progress-bar"><span style={{ width: `${pct}%` }} /></div>
              <span>{b.sent} of {b.total} delivered{b.failed ? ` · ${b.failed} failed` : ''}</span>
            </div>
            {b.note && <p className="ad-help">{b.note}</p>}
            <div className="ad-row-actions">
              {b.status === 'sending' && <button className="ad-btn" onClick={() => act(b, 'pause')}>Pause</button>}
              {b.status === 'paused' && <button className="ad-btn primary" onClick={() => act(b, 'resume')}>Resume</button>}
              {(b.status === 'sending' || b.status === 'paused') && <button className="ad-btn ghost" onClick={() => act(b, 'cancel')}>Cancel</button>}
              {b.status !== 'sending' && <button className="ad-btn ghost" onClick={() => remove(b)}>Delete</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- CSV upload ---------------- */
/** Splits CSV text into rows of cells (handles "quoted, cells", "" escapes, ; or tab separators and Windows line ends). */
function parseCsv(text) {
  const src = text.replace(/^﻿/, '');
  const first = src.split(/\r?\n/, 1)[0] || '';
  const sep = [',', ';', '\t'].reduce((a, b) => (first.split(b).length > first.split(a).length ? b : a), ',');
  const rows = []; let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i += 1; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(cell.trim()); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && src[i + 1] === '\n') i += 1; row.push(cell.trim()); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.filter((r) => r.some(Boolean));
}

/** CSV rows → "Name <email>" lines. Finds the email / name columns from the header, or guesses when there is none. */
function csvToLines(text) {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.toLowerCase());
  const hasHeader = head.some((h) => /e-?mail/.test(h)) || !rows[0].some((c) => c.includes('@'));
  const body = hasHeader ? rows.slice(1) : rows;
  let emailCol = hasHeader ? head.findIndex((h) => /e-?mail/.test(h)) : -1;
  if (emailCol < 0) { // the column with the most @ signs
    const hits = (body[0] || []).map((_, i) => body.filter((r) => (r[i] || '').includes('@')).length);
    emailCol = hits.indexOf(Math.max(0, ...hits));
  }
  const col = (rx) => (hasHeader ? head.findIndex((h) => rx.test(h)) : -1);
  const full = col(/^(full[\s_-]*)?name$|^naam$/);
  const firstN = col(/first[\s_-]*name|^first$/);
  const lastN = col(/last[\s_-]*name|surname|^last$/);
  const nameOf = (r) => {
    if (full >= 0) return r[full];
    if (firstN >= 0) return [r[firstN], lastN >= 0 ? r[lastN] : ''].filter(Boolean).join(' ');
    if (!hasHeader) return r.filter((c, i) => i !== emailCol && c && !c.includes('@') && !/^[\d\s+()-]+$/.test(c)).slice(0, 1).join(' ');
    return '';
  };
  return body
    .map((r) => {
      const cell = (r[emailCol] || '').includes('@') ? r[emailCol] : r.find((c) => c.includes('@')) || '';
      const i = r.indexOf(cell);
      const name = hasHeader ? nameOf(r) : r.filter((c, k) => k !== i && c && !c.includes('@') && !/^[\d\s+()-]+$/.test(c))[0];
      return { email: cell.replace(/^mailto:/i, '').trim(), name: (name || '').replace(/[<>"]/g, '').trim() };
    })
    .filter((p) => p.email)
    .map((p) => (p.name ? `${p.name} <${p.email}>` : p.email));
}

/* ---------------- Subscribers ---------------- */
function Subscribers({ token, data, reload, setErr }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('subscribed');
  const [list, setList] = useState('');
  const [msg, setMsg] = useState('');
  const [uploading, setUploading] = useState('');
  const box = useRef(null);
  const fileInput = useRef(null);
  const all = data?.items || [];
  const items = useMemo(() => all
    .filter((s) => !filter || s.status === filter)
    .filter((s) => !q || `${s.email} ${s.name}`.toLowerCase().includes(q.toLowerCase())), [all, filter, q]);

  if (!data) return <div className="ad-panel"><p className="ad-note">Loading subscribers…</p></div>;
  const count = (st) => all.filter((s) => s.status === st).length;

  const add = async () => {
    if (!list.trim()) { box.current?.focus(); return; }
    try { const t = await api('/admin/newsletter/subscribers', { method: 'POST', token, body: { list } }); setMsg(tallyText(t)); setList(''); reload(); }
    catch (e) { setErr(e.message); }
  };
  const uploadCsv = async (file) => {
    if (!file) return;
    setErr(''); setMsg('');
    if (file.size > 10 * 1024 * 1024) { setErr('That file is over 10 MB — split it into smaller CSV files.'); return; }
    if (/\.(xlsx?|numbers|ods)$/i.test(file.name)) { setErr('Please save the spreadsheet as CSV first (Excel: File → Save As → CSV; Google Sheets: File → Download → CSV).'); return; }
    const lines = csvToLines(await file.text());
    if (!lines.length) { setErr(`No email addresses found in “${file.name}”. The file needs a column of emails.`); return; }
    const ok = await askConfirm({ title: `Add ${lines.length} contact${lines.length === 1 ? '' : 's'}?`, message: `Found ${lines.length} email${lines.length === 1 ? '' : 's'} in “${file.name}”, e.g. ${lines.slice(0, 3).join(', ')}. Only add people who agreed to hear from you. Anyone who unsubscribed before is skipped.`, confirmLabel: 'Add them' });
    if (!ok) return;
    const total = { added: 0, exists: 0, invalid: 0, unsubscribed: 0 };
    try {
      for (let i = 0; i < lines.length; i += 2000) { // the server takes up to 5000 lines per request
        setUploading(`Adding… ${Math.min(i + 2000, lines.length)} / ${lines.length}`);
        const t = await api('/admin/newsletter/subscribers', { method: 'POST', token, body: { list: lines.slice(i, i + 2000).join('\n') } });
        Object.keys(total).forEach((k) => { total[k] += t[k] || 0; });
      }
      setMsg(`From ${file.name}: ${tallyText(total)}`);
    } catch (e) { setErr(e.message); } finally { setUploading(''); reload(); }
  };
  const importAll = async () => {
    const ok = await askConfirm({ title: 'Add your customers?', message: 'Adds every email from enquiries, gift cards and client galleries. People who unsubscribed are never added back. Every email has an unsubscribe link.', confirmLabel: 'Add them' });
    if (!ok) return;
    try { const t = await api('/admin/newsletter/subscribers/import', { method: 'POST', token }); setMsg(tallyText(t)); reload(); } catch (e) { setErr(e.message); }
  };
  const toggle = async (s) => {
    try { await api(`/admin/newsletter/subscribers/${s._id}`, { method: 'PATCH', token, body: { status: s.status === 'subscribed' ? 'unsubscribed' : 'subscribed' } }); reload(); } catch (e) { setErr(e.message); }
  };
  const remove = async (s) => {
    if (!(await askConfirm({ title: 'Delete subscriber?', message: `${s.email} will be removed. (To respect an unsubscribe, use “Unsubscribe” instead so they aren't added back.)`, confirmLabel: 'Delete', danger: true }))) return;
    try { await api(`/admin/newsletter/subscribers/${s._id}`, { method: 'DELETE', token }); reload(); } catch (e) { setErr(e.message); }
  };
  const exportCsv = () => {
    const cols = ['email', 'name', 'status', 'source', 'createdAt'];
    const csv = [cols.join(','), ...all.map((s) => cols.map((c) => `"${String(s[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `babysteps-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <>
      <section className="ad-panel ad-news-add">
        <label className="ad-field">
          <span className="ad-label">Add subscribers</span>
          <textarea ref={box} className="ad-input" rows={3} value={list} onChange={(e) => setList(e.target.value)} placeholder={'One per line:\npriya@gmail.com\nRohan Sharma <rohan@gmail.com>'} />
          <small className="ad-help">Only add people who agreed to hear from you. New website sign-ups (footer form) are added automatically.</small>
        </label>
        <div className="ad-row-actions">
          <button className="ad-btn primary" onClick={add}>Add</button>
          <button className="ad-btn" onClick={() => fileInput.current?.click()} disabled={!!uploading} title="A spreadsheet saved as .csv with an email column (a name column is optional)">
            {uploading || '⬆ Upload CSV'}
          </button>
          <input ref={fileInput} type="file" accept=".csv,text/csv,.txt,text/plain" hidden onChange={(e) => { uploadCsv(e.target.files?.[0]); e.target.value = ''; }} />
          <button className="ad-btn" onClick={importAll}>＋ Add customers from enquiries, gift cards & galleries</button>
        </div>
        {msg && <p className="ad-note">{msg}</p>}
      </section>

      <div className="ad-gal-toolbar ad-enq-bar">
        <input className="ad-input" type="search" placeholder="Search email or name…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search subscribers" />
        <button className="ad-btn" onClick={exportCsv} disabled={!all.length}>⬇ CSV</button>
      </div>
      <div className="ad-subtabs" role="tablist">
        <button className={filter === 'subscribed' ? 'on' : ''} onClick={() => setFilter('subscribed')}>Subscribed <small>{count('subscribed')}</small></button>
        <button className={filter === 'unsubscribed' ? 'on' : ''} onClick={() => setFilter('unsubscribed')}>Unsubscribed <small>{count('unsubscribed')}</small></button>
        <button className={!filter ? 'on' : ''} onClick={() => setFilter('')}>All <small>{all.length}</small></button>
      </div>
      {items.length === 0 ? (
        <div className="ad-panel ad-empty"><p>{all.length ? 'Nobody matches.' : 'No subscribers yet.'}</p></div>
      ) : (
        <div className="ad-list">
          {items.map((s) => (
            <div key={s._id} className="ad-item ad-news-sub">
              <div className="ad-news-main">
                <b>{s.email}</b>
                <small>{[s.name, s.source, when(s.createdAt)].filter(Boolean).join(' · ')}</small>
              </div>
              <span className={`ad-badge ${s.status === 'subscribed' ? 'ok' : ''}`}>{s.status}</span>
              <span className="ad-item-tools">
                <button className="ad-btn ghost" onClick={() => toggle(s)}>{s.status === 'subscribed' ? 'Unsubscribe' : 'Resubscribe'}</button>
                <button className="ad-icon-btn" onClick={() => remove(s)} title="Delete" aria-label={`Delete ${s.email}`}>🗑</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
