import { useCallback, useEffect, useState } from 'react';
import { api, tokenStore } from '../api.js';
import { useTitle } from '../components/common.jsx';
import { useToast } from '../components/Toast.jsx';
import { useDialog } from '../components/Dialog.jsx';
import CredentialsModal from '../admin/Credentials.jsx';
import GalleryManager from '../admin/GalleryManager.jsx';
import GiftCardsAdmin from '../admin/GiftCardsAdmin.jsx';
import InvitationsAdmin, { InvitePackagesAdmin } from '../admin/InvitationsAdmin.jsx';
import Dashboard from '../admin/Dashboard.jsx';
import LoginSecurity from '../admin/LoginSecurity.jsx';
import Select from '../components/Select.jsx';
import DatePicker from '../components/DatePicker.jsx';
const capOpt = (s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) });
import {
  SettingsEditor, MediaLibrary, Collection, CATEGORIES, FILMS, REELS, MUSIC, PACKAGES, FAQS, JOBS, TESTIMONIALS, AWARDS, BLOG,
} from '../admin/CmsPanels.jsx';

const TOKEN_KEY = 'gps-admin';
const STATUSES = ['new', 'contacted', 'booked', 'closed'];
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Please enter your admin email.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    setBusy(true);
    try {
      const { token } = await api('/admin/login', { method: 'POST', body: { email: email.trim(), password } });
      tokenStore.set(TOKEN_KEY, token);
      onLogin(token);
    } catch (err) {
      setError(err.status === 429 ? 'Too many attempts — please wait a few minutes.' : err.message);
      setBusy(false);
    }
  }
  return (
    <section className="adl">
      <div className="adl__art">
        <img src="/images/wedding/w12.jpg" alt="" />
        <div className="adl__art-copy">
          <p>Moments pass, but memories, if captured <em>right</em>, are eternal.</p>
          <span>Guide Photo Studio · Noida</span>
        </div>
      </div>
      <div className="adl__panel">
        <form className="adl__card" onSubmit={submit} noValidate>
          <img src="/images/brand/logo.png" alt="Guide Photo Studio" className="adl__logo" />
          <p className="adl__k">Studio console</p>
          <h1>Welcome back</h1>
          <p className="adl__sub">Sign in to manage enquiries, galleries, gift cards and invitations.</p>
          <label><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="you@guidephotostudio.com" autoFocus /></label>
          <label><span>Password</span>
            <span className="adl__pw">
              <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              <button type="button" onClick={() => setShow((x) => !x)}>{show ? 'Hide' : 'Show'}</button>
            </span>
          </label>
          {error && <p className="adl__err" role="alert">{error}</p>}
          <button className="btn btn--primary adl__btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <a className="adl__back" href="/">← Back to website</a>
        </form>
      </div>
    </section>
  );
}

function Inquiries({ call }) {
  const toast = useToast();
  const dialog = useDialog();
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('');
  const load = useCallback(() => call(`/admin/inquiries${filter ? `?status=${filter}` : ''}`).then(setRows), [call, filter]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id, status) {
    await call(`/admin/inquiries/${id}`, { method: 'PATCH', body: { status } });
    setRows((r) => r.map((x) => (x._id === id ? { ...x, status } : x)));
    toast({ title: `Status changed to “${status}”`, duration: 2500 });
  }
  async function remove(id) {
    const r = rows.find((x) => x._id === id);
    const ok = await dialog.confirm({ title: 'Delete this enquiry?', message: r ? `The enquiry from ${r.name}${r.eventType ? ` (${r.eventType})` : ''} will be permanently deleted.` : 'This can’t be undone.', tone: 'danger', confirmLabel: 'Delete enquiry' });
    if (!ok) return;
    await call(`/admin/inquiries/${id}`, { method: 'DELETE' });
    setRows((r) => r.filter((x) => x._id !== id));
  }

  return (
    <div>
      <div className="admin__bar">
        <h2>Enquiries</h2>
        <Select value={filter} onChange={setFilter} toneDots ariaLabel="Filter by status" placeholder="All statuses" options={[{ value: '', label: 'All statuses' }, ...STATUSES.map(capOpt)]} />
      </div>
      {!rows ? <p className="muted">Loading…</p> : rows.length === 0 ? <p className="muted">No enquiries yet.</p> : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Received</th><th>Name</th><th>Contact</th><th>Shoot</th><th>Event date</th><th>Budget</th><th>Message</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td>{fmtDate(r.createdAt)}</td>
                  <td><strong>{r.name}</strong>{r.company && <><br /><small>🏢 {r.company}{r.designation ? ` · ${r.designation}` : ''}</small></>}<br /><small className="muted">{r.location}</small></td>
                  <td><a href={`tel:${r.phone}`}>{r.phone}</a><br /><small>{r.email}</small></td>
                  <td>{r.eventType || '—'}</td>
                  <td>{fmtDate(r.eventDate)}</td>
                  <td>{r.budget || '—'}{r.giftCode && <><br /><small>🎁 <code>{r.giftCode}</code></small></>}</td>
                  <td className="table__msg">{r.message}</td>
                  <td>
                    <Select size="sm" toneDots value={r.status} onChange={(v) => setStatus(r._id, v)} ariaLabel={`Status for ${r.name}`} options={STATUSES.map(capOpt)} />
                  </td>
                  <td><button className="link-btn" onClick={() => remove(r._id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const APP_STATUSES = ['new', 'shortlisted', 'interview', 'hired', 'rejected'];

function Applications({ call }) {
  const toast = useToast();
  const dialog = useDialog();
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('');
  const load = useCallback(() => call(`/admin/applications${filter ? `?status=${filter}` : ''}`).then(setRows), [call, filter]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id, status) {
    await call(`/admin/applications/${id}`, { method: 'PATCH', body: { status } });
    setRows((r) => r.map((x) => (x._id === id ? { ...x, status } : x)));
    toast({ title: `Status changed to “${status}”`, duration: 2500 });
  }
  async function remove(id) {
    const a = rows.find((x) => x._id === id);
    const ok = await dialog.confirm({ title: 'Delete this application?', message: a ? `${a.name}’s application for ${a.role} will be permanently deleted.` : 'This can’t be undone.', tone: 'danger', confirmLabel: 'Delete application' });
    if (!ok) return;
    await call(`/admin/applications/${id}`, { method: 'DELETE' });
    setRows((r) => r.filter((x) => x._id !== id));
  }

  return (
    <div>
      <div className="admin__bar">
        <h2>Job applications</h2>
        <Select value={filter} onChange={setFilter} toneDots ariaLabel="Filter by status" placeholder="All statuses" options={[{ value: '', label: 'All statuses' }, ...APP_STATUSES.map(capOpt)]} />
      </div>
      {!rows ? <p className="muted">Loading…</p> : rows.length === 0 ? <p className="muted">No applications yet.</p> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Received</th><th>Applicant</th><th>Role</th><th>Level</th><th>Work</th><th>Message</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a._id}>
                  <td>{fmtDate(a.createdAt)}</td>
                  <td>
                    <strong>{a.name}</strong><br />
                    <a href={`tel:${a.phone}`}>{a.phone}</a>
                    {a.email && <><br /><small>{a.email}</small></>}
                    {a.instagram && <><br /><a href={`https://instagram.com/${a.instagram}`} target="_blank" rel="noreferrer"><small>@{a.instagram}</small></a></>}
                  </td>
                  <td>{a.role}</td>
                  <td>{a.level}</td>
                  <td>
                    {a.portfolio ? <a className="link-btn" href={a.portfolio} target="_blank" rel="noreferrer">Portfolio</a> : '—'}
                    {a.resume && <><br /><a className="link-btn" href={a.resume} target="_blank" rel="noreferrer">Resume</a></>}
                  </td>
                  <td className="table__msg">{a.message}</td>
                  <td>
                    <Select size="sm" toneDots value={a.status} onChange={(v) => setStatus(a._id, v)} ariaLabel={`Status for ${a.name}`} options={APP_STATUSES.map(capOpt)} />
                  </td>
                  <td><button className="link-btn" onClick={() => remove(a._id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const NEW_GALLERY = { title: '', clientName: '', clientPhone: '', clientEmail: '', slug: '', password: '', eventDate: '', selectionLimit: '', freeDays: '', driveLinks: '' };
const slugify = (v) => String(v).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const ACCESS_LABEL = {
  free: 'Free period',
  created: 'Free period',
  authenticated: 'Subscribed (starts later)',
  active: 'Subscribed',
  cancelled: 'Cancelled',
  pending: 'Payment pending',
  halted: 'Payment failed',
  completed: 'Plan completed',
};

function Plans({ call }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState({});
  const [msg, setMsg] = useState('');
  const load = useCallback(() => call('/admin/plans').then(setRows), [call]);
  useEffect(() => { load(); }, [load]);

  async function save(p) {
    setMsg('');
    const rupeesVal = edit[p.code];
    try {
      await call(`/admin/plans/${p.code}`, {
        method: 'PATCH',
        body: { amount: rupeesVal != null && rupeesVal !== '' ? Math.round(Number(rupeesVal) * 100) : undefined },
      });
      setEdit((e) => ({ ...e, [p.code]: undefined }));
      setMsg('');
      toast({ title: `${p.name} price saved successfully!`, message: 'New subscribers get the new price; existing subscriptions keep theirs.' });
      load();
    } catch (err) {
      setMsg(err.message);
    }
  }
  async function toggle(p) {
    await call(`/admin/plans/${p.code}`, { method: 'PATCH', body: { active: !p.active } });
    load();
  }

  return (
    <div>
      <h2>Gallery hosting plans</h2>
      <p className="muted small">
        Clients get free hosting for the period set on each gallery (default 90 days). After that they subscribe to one of these plans.
      </p>
      {msg && <p className="note">{msg}</p>}
      {!rows ? <p className="muted">Loading…</p> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Plan</th><th>Billing</th><th>Price (₹)</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.code}>
                  <td><strong>{p.name}</strong><br /><small className="muted">{p.description}</small></td>
                  <td style={{ textTransform: 'capitalize' }}>{p.period}</td>
                  <td>
                    <input
                      type="number" min="1" step="1" style={{ width: 120 }}
                      value={edit[p.code] ?? p.amount / 100}
                      onChange={(e) => setEdit((x) => ({ ...x, [p.code]: e.target.value }))}
                      aria-label={`${p.name} price in rupees`}
                    />
                  </td>
                  <td>{p.active ? 'Offered' : 'Hidden'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      {edit[p.code] != null && <button className="btn btn--primary btn--sm" onClick={() => save(p)}>Save</button>}
                      <button className="btn btn--ghost btn--sm" onClick={() => toggle(p)}>{p.active ? 'Hide' : 'Offer'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Galleries({ call, token }) {
  const toast = useToast();
  const dialog = useDialog();
  const [openSlug, setOpenSlug] = useState(null);
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(NEW_GALLERY);
  const [msg, setMsg] = useState('');
  const [creds, setCreds] = useState(null); // gallery shown in the login-details modal
  const [showNew, setShowNew] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const load = useCallback(() => call('/admin/client-galleries').then(setRows), [call]);
  useEffect(() => { load(); }, [load]);
  const set = (k) => (e) => setForm((f) => {
    const next = { ...f, [k]: e.target.value };
    if (k === 'title' && !slugTouched) next.slug = slugify(e.target.value);
    return next;
  });
  const genPassword = () => {
    const first = (form.clientName.split(/\s+/)[0] || 'guide').toLowerCase().replace(/[^a-z]/g, '').slice(0, 8) || 'guide';
    setForm((f) => ({ ...f, password: `${first}-${Math.floor(1000 + Math.random() * 9000)}` }));
  };

  async function create(e) {
    e.preventDefault();
    setMsg('');
    try {
      const created = await call('/admin/client-galleries', {
        method: 'POST',
        body: {
          ...form,
          selectionLimit: Number(form.selectionLimit) || 0,
          freeDays: Number(form.freeDays) || undefined,
          eventDate: form.eventDate || undefined,
        },
      });
      toast({
        title: 'New gallery created successfully!',
        message: `“${form.title}” for ${form.clientName}${created.photos?.length ? ` with ${created.photos.length} photos from Drive` : ''}. Share the login details now.${created.driveErrors?.length ? ` Some links were skipped: ${created.driveErrors.join(' ')}` : ''}`,
      });
      setCreds(created);
      setShowNew(false);
      setForm(NEW_GALLERY);
      setSlugTouched(false);
      load();
    } catch (err) {
      setMsg(err.message);
    }
  }
  async function reopen(slug) {
    await call(`/admin/client-galleries/${slug}/reopen`, { method: 'POST' });
    load();
    toast({ title: 'Selection re-opened', message: `The client can change their picks in “${slug}” again.` });
  }
  async function extend(slug) {
    const days = await dialog.prompt({
      title: 'Extend hosting', message: `Add free hosting days to “${slug}”, for example after a cash or UPI payment at the studio.`,
      defaultValue: '30', type: 'number', icon: 'info', hint: 'Days are added to the current end date.', confirmLabel: 'Extend hosting',
      validate: (x) => (!(Number(x) >= 1 && Number(x) <= 3650) ? 'Enter a number of days between 1 and 3650' : ''),
    });
    if (!days) return;
    try {
      const r = await call(`/admin/client-galleries/${slug}/extend`, { method: 'POST', body: { days: Number(days) } });
      load();
      toast({ title: `Hosting extended by ${days} days`, message: `“${slug}” is now available until ${fmtDate(r.access?.until)}.` });
    } catch (err) {
      setMsg(err.message);
    }
  }
  async function remove(slug) {
    const gal = rows?.find((x) => x.slug === slug);
    const ok = await dialog.confirm({
      title: 'Delete this client gallery?',
      message: `“${gal?.title || slug}” will be deleted and ${gal?.clientName || 'the client'} will lose access immediately. Their picks are lost too. This can’t be undone.`,
      tone: 'danger', images: gal?.cover ? [gal.cover] : undefined, confirmLabel: 'Delete gallery',
    });
    if (!ok) return;
    await call(`/admin/client-galleries/${slug}`, { method: 'DELETE' });
    load();
    toast({ title: 'Gallery deleted', message: `“${slug}” and its client access were removed.` });
  }

  if (openSlug) {
    return <GalleryManager slug={openSlug} call={call} token={token} onBack={() => { setOpenSlug(null); load(); }} onChanged={load} />;
  }

  return (
    <div className="galleries">
      <div className="admin__bar">
        <div>
          <h2>Client galleries</h2>
          <p className="muted small">Private photo galleries for your clients. Click a gallery to see and manage its photos.</p>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => setShowNew((v) => !v)} aria-expanded={showNew}>
          {showNew ? 'Close' : '+ New gallery'}
        </button>
      </div>

      {showNew && (
        <form className="panel form newgal" onSubmit={create}>
          <div className="newgal__head">
            <h3>New client gallery</h3>
            <p className="muted small">You’ll get the login details to share right after creating. Passwords are stored encrypted.</p>
          </div>
          <div className="newgal__grid">
            <label><span>Title *</span><input value={form.title} onChange={set('title')} placeholder="Riya & Arjun · Wedding" required /></label>
            <label><span>Client name *</span><input value={form.clientName} onChange={set('clientName')} placeholder="Riya Sharma" required /></label>
            <label><span>Client phone / WhatsApp</span><input value={form.clientPhone} onChange={set('clientPhone')} type="tel" placeholder="+91 98765 43210" /></label>
            <label><span>Client email</span><input value={form.clientEmail} onChange={set('clientEmail')} type="email" placeholder="riya@example.com" /></label>
            <label>
              <span>Gallery name (login) *</span>
              <input value={form.slug} onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })); }} placeholder="riya-arjun-wedding" pattern="[a-z0-9-]{3,60}" required />
              <small className="muted">The client types this to log in. Filled from the title.</small>
            </label>
            <label>
              <span>Password</span>
              <span className="pw-row">
                <input value={form.password} onChange={set('password')} minLength={6} placeholder="Auto if empty" />
                <button type="button" className="btn btn--ghost btn--sm" onClick={genPassword}>Generate</button>
              </span>
              <small className="muted">Leave empty and we’ll create an easy one, e.g. riya-4827.</small>
            </label>
          </div>

          <details className="newgal__more">
            <summary>More options <small className="muted">event date, album limit, free hosting</small></summary>
            <div className="newgal__grid newgal__grid--3">
              <label><span>Event date</span><DatePicker value={form.eventDate} onChange={(v) => set('eventDate')({ target: { value: v } })} ariaLabel="Event date" /></label>
              <label><span>Album pick limit</span><input type="number" min="0" value={form.selectionLimit} onChange={set('selectionLimit')} placeholder="0 = unlimited" /></label>
              <label><span>Free hosting (days)</span><input type="number" min="1" value={form.freeDays} onChange={set('freeDays')} placeholder="90 (default)" /></label>
            </div>
          </details>
          <label>
            <span>Google Drive folder link</span>
            <textarea rows={2} value={form.driveLinks} onChange={set('driveLinks')} placeholder={'https://drive.google.com/drive/folders/…  (optional, you can add it later)'} />
            <small className="muted">Photos are added only from Google Drive. Share the folder as <b>“Anyone with the link can view”</b>; photos inside sub-folders need their own folder link.</small>
          </label>

          {msg && <p className="note note--error">{msg}</p>}
          <div className="newgal__actions">
            <button type="button" className="btn btn--ghost" onClick={() => { setShowNew(false); setForm(NEW_GALLERY); setSlugTouched(false); setMsg(''); }}>Cancel</button>
            <button className="btn btn--primary">Create gallery</button>
          </div>
        </form>
      )}

      {!rows ? <p className="muted">Loading…</p> : rows.length === 0 ? (
        <p className="muted">No client galleries yet. Click “+ New gallery” to create one.</p>
      ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Gallery</th><th>Client</th><th>Photos</th><th>Selected</th><th>Status</th><th>Hosting</th><th /></tr></thead>
              <tbody>
                {rows.map((g) => (
                  <tr key={g._id}>
                    <td>
                      <button className="gal-open" onClick={() => setOpenSlug(g.slug)}>
                        <span className="gal-open__thumb">{g.cover ? <img src={g.cover} alt="" loading="lazy" /> : null}</span>
                        <span><strong>{g.title}</strong><small className="muted">{g.slug}</small></span>
                      </button>
                      <button className="link-btn table__action" onClick={() => setOpenSlug(g.slug)}>🖼 View photos</button>
                    </td>
                    <td>
                      {g.clientName}
                      {g.clientPhone && <><br /><a href={`tel:${g.clientPhone}`}><small>{g.clientPhone}</small></a></>}
                      <br /><button className="link-btn table__action" onClick={() => setCreds(g)}>🔑 Login details</button>
                    </td>
                    <td>{g.photoCount}</td>
                    <td>{g.favoriteCount}{g.selectionLimit ? `/${g.selectionLimit}` : ''}</td>
                    <td>
                      {g.selectionSubmittedAt ? (
                        <>Submitted {fmtDate(g.selectionSubmittedAt)}<br /><button className="link-btn" onClick={() => reopen(g.slug)}>Re-open</button></>
                      ) : 'Selecting'}
                    </td>
                    <td>
                      <span className={`access-chip access-chip--${g.access.locked ? 'locked' : g.access.status}`}>
                        {g.access.locked ? 'Locked' : ACCESS_LABEL[g.access.status] || g.access.status}
                        {g.access.planCode && !g.access.locked ? ` · ${g.access.planCode}` : ''}
                      </span>
                      <br />
                      <small className="muted">{g.access.locked ? 'ended' : 'until'} {fmtDate(g.access.until)}</small>
                      <br />
                      <button className="link-btn" onClick={() => extend(g.slug)}>+ Extend</button>
                    </td>
                    <td><button className="link-btn" onClick={() => remove(g.slug)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {creds && <CredentialsModal gallery={creds} call={call} onClose={() => setCreds(null)} onReset={load} />}
    </div>
  );
}

function Testimonials({ call }) {
  const dialog = useDialog();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ name: '', event: '', quote: '' });
  const load = useCallback(() => call('/admin/testimonials').then(setRows), [call]);
  useEffect(() => { load(); }, [load]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function add(e) {
    e.preventDefault();
    await call('/admin/testimonials', { method: 'POST', body: { ...form, published: true } });
    setForm({ name: '', event: '', quote: '' });
    load();
  }
  async function toggle(t) {
    await call(`/admin/testimonials/${t._id}`, { method: 'PATCH', body: { published: !t.published } });
    load();
  }
  async function remove(id) {
    if (!(await dialog.confirm({ title: 'Delete this testimonial?', message: 'It will be removed from the website.', tone: 'danger', confirmLabel: 'Delete' }))) return;
    await call(`/admin/testimonials/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="admin__cols">
      <div>
        <h2>Testimonials</h2>
        <p className="muted small">Published testimonials appear on the homepage. Only add real client reviews (with their permission).</p>
        {rows?.length === 0 && <p className="muted">None yet.</p>}
        {rows?.map((t) => (
          <div key={t._id} className="panel admin__quote">
            <p>“{t.quote}”</p>
            <p><strong>{t.name}</strong> <span className="muted">{t.event}</span></p>
            <button className="link-btn" onClick={() => toggle(t)}>{t.published ? 'Unpublish' : 'Publish'}</button>{' '}
            <button className="link-btn" onClick={() => remove(t._id)}>Delete</button>
          </div>
        ))}
      </div>
      <form className="panel form" onSubmit={add}>
        <h3>Add testimonial</h3>
        <label><span>Client name *</span><input value={form.name} onChange={set('name')} required /></label>
        <label><span>Event</span><input value={form.event} onChange={set('event')} placeholder="Wedding · Jaipur, 2025" /></label>
        <label><span>Quote *</span><textarea rows={4} value={form.quote} onChange={set('quote')} required /></label>
        <button className="btn btn--primary">Add & publish</button>
      </form>
    </div>
  );
}

const cms = (config) => function CmsPanel(props) { return <Collection config={config} {...props} />; };

const I = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
const ICONS = {
  dashboard: <svg {...I}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>,
  inquiries: <svg {...I}><path d="M4 5h16v11H8l-4 4V5Z" /><path d="M8 10h8M8 13h5" /></svg>,
  giftcards: <svg {...I}><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 12h18M12 8S10.5 3 8 3.5 7 8 12 8Zm0 0s1.5-5 4-4.5S17 8 12 8Z" /></svg>,
  galleries: <svg {...I}><rect x="3" y="5" width="18" height="15" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m3 17 5-4 4 3 3-2 6 4" /></svg>,
  plans: <svg {...I}><path d="M4 7h16M4 12h16M4 17h10" /></svg>,
  applications: <svg {...I}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5M16 4.5a3.5 3.5 0 0 1 0 7M18 13.7c2 .8 3.5 2.9 3.5 5.3" /></svg>,
  invitations: <svg {...I}><rect x="3" y="6" width="18" height="13" rx="1.5" /><path d="m3 7 9 7 9-7" /></svg>,
  invitepackages: <svg {...I}><path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9-9-9Z" /><circle cx="7.5" cy="7.5" r="1.4" /></svg>,
  settings: <svg {...I}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 15H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3Z" /></svg>,
  media: <svg {...I}><path d="M4 4h10l6 6v10H4Z" /><path d="M14 4v6h6" /><circle cx="9" cy="13" r="1.5" /><path d="m4 19 5-4 3 2 3-2 5 4" /></svg>,
  portfolio: <svg {...I}><rect x="7" y="3" width="14" height="14" rx="2" /><path d="M17 21H6a3 3 0 0 1-3-3V7" /></svg>,
  films: <svg {...I}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3Z" /></svg>,
  music: <svg {...I}><path d="M9 18V5l11-2v13" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></svg>,
  reels: <svg {...I}><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="m10.5 9.5 4 2.5-4 2.5Z" /></svg>,
  packages: <svg {...I}><path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" /><path d="M3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5" /></svg>,
  faqs: <svg {...I}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01" /></svg>,
  jobs: <svg {...I}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" /></svg>,
  testimonials: <svg {...I}><path d="M7 17c-2 0-3-1.5-3-3.5C4 10 6 7 9 6l.6 1.2C8 8 7.2 9.3 7 10.6c1.8 0 3 1.2 3 3s-1.2 3.4-3 3.4Zm9 0c-2 0-3-1.5-3-3.5 0-3.5 2-6.5 5-7.5l.6 1.2c-1.6.8-2.4 2.1-2.6 3.4 1.8 0 3 1.2 3 3s-1.2 3.4-3 3.4Z" /></svg>,
  security: <svg {...I}><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5M12 14.5v2.5" /></svg>,
  blog: <svg {...I}><path d="M5 4h10l4 4v12H5Z" /><path d="M15 4v4h4M8 12h8M8 16h6" /></svg>,
  awards: <svg {...I}><circle cx="12" cy="9" r="6" /><path d="m8.5 14.5-1.5 7 5-3 5 3-1.5-7" /></svg>,
};

/** Admin navigation, grouped. Each panel receives { call, token, go }. */
const NAV_GROUPS = [
  { title: '', items: [['dashboard', 'Dashboard', Dashboard]] },
  {
    title: 'Bookings & clients',
    items: [
      ['inquiries', 'Enquiries', Inquiries],
      ['giftcards', 'Gift cards', GiftCardsAdmin],
      ['galleries', 'Client galleries', Galleries],
      ['plans', 'Hosting plans', Plans],
      ['applications', 'Job applications', Applications],
      ['security', 'Login security', LoginSecurity],
    ],
  },
  {
    title: 'Invites by Guide Studio',
    items: [
      ['invitations', 'Invitations', InvitationsAdmin],
      ['invitepackages', 'Invite packages', InvitePackagesAdmin],
      ['music', 'Music library', cms(MUSIC)],
    ],
  },
  {
    title: 'Website content',
    items: [
      ['settings', 'Site settings', SettingsEditor],
      ['media', 'Media library', MediaLibrary],
      ['portfolio', 'Portfolio', cms(CATEGORIES)],
      ['films', 'Films', cms(FILMS)],
      ['reels', 'Reels', cms(REELS)],
      ['blog', 'Blog', cms(BLOG)],
      ['packages', 'Packages', cms(PACKAGES)],
      ['faqs', 'FAQs', cms(FAQS)],
      ['jobs', 'Careers roles', cms(JOBS)],
      ['testimonials', 'Testimonials', cms(TESTIMONIALS)],
      ['awards', 'Awards', cms(AWARDS)],
    ],
  },
];
const PANELS = Object.fromEntries(NAV_GROUPS.flatMap((g) => g.items.map(([k, label, C]) => [k, { label, C }])));

export default function Admin() {
  useTitle('Admin');
  const [token, setToken] = useState(() => tokenStore.get(TOKEN_KEY));
  const [tab, setTab] = useState(() => {
    try { return sessionStorage.getItem('gps-admin-tab') || 'dashboard'; } catch { return 'dashboard'; }
  });
  const [menu, setMenu] = useState(false);
  const [badges, setBadges] = useState({});

  useEffect(() => {
    // /admin renders outside <Layout>, so the public site's light theme class can linger
    // after client-side navigation — drop it, or panel text ends up light-on-cream.
    document.body.classList.remove('ed', 'ed--white');
    document.body.classList.add('adm-body');
    return () => document.body.classList.remove('adm-body');
  }, []);

  const go = useCallback((k) => {
    setTab(k); setMenu(false);
    try { sessionStorage.setItem('gps-admin-tab', k); } catch { /* ignore */ }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const logout = useCallback(() => {
    tokenStore.set(TOKEN_KEY, null);
    setToken(null);
  }, []);

  const call = useCallback(
    async (path, opts = {}) => {
      try {
        return await api(path, { ...opts, token });
      } catch (err) {
        if (err.status === 401) logout();
        throw err;
      }
    },
    [token, logout]
  );

  // "Needs attention" counts for the sidebar.
  useEffect(() => {
    if (!token) return;
    Promise.all([
      call('/admin/inquiries?status=new').catch(() => []),
      call('/admin/applications?status=new').catch(() => []),
      call('/admin/invites').catch(() => ({ invitations: [] })),
    ]).then(([inq, apps, inv]) => setBadges({
      inquiries: inq.length,
      applications: apps.length,
      invitations: (inv.invitations || []).reduce((s, i) => s + (i.stats?.pendingWishes || 0), 0),
    }));
  }, [token, tab, call]);

  if (!token) return <Login onLogin={setToken} />;
  const current = PANELS[tab] ? tab : 'dashboard';
  const { C: Panel, label } = PANELS[current];
  const group = NAV_GROUPS.find((g) => g.items.some(([k]) => k === current))?.title;

  return (
    <section className={`adm ${menu ? 'is-menu' : ''}`}>
      <aside className="adm__side" aria-label="Admin sections">
        <a href="/" className="adm__brand" target="_blank" rel="noreferrer" title="View website">
          <img src="/images/brand/logo.png" alt="Guide Photo Studio" />
          <span>Studio console</span>
        </a>
        <nav className="adm__nav">
          {NAV_GROUPS.map((g) => (
            <div key={g.title || 'top'} className="adm__group">
              {g.title && <p className="adm__gtitle">{g.title}</p>}
              {g.items.map(([k, l]) => (
                <button key={k} className={`adm__link ${current === k ? 'is-on' : ''}`} onClick={() => go(k)} aria-current={current === k ? 'page' : undefined}>
                  {ICONS[k]}<span>{l}</span>{badges[k] > 0 && <em>{badges[k]}</em>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="adm__foot">
          <a href="/" target="_blank" rel="noreferrer">View website ↗</a>
          <button onClick={logout}>Sign out</button>
        </div>
      </aside>
      <button className="adm__scrim" aria-label="Close menu" onClick={() => setMenu(false)} />

      <div className="adm__main">
        <header className="adm__top">
          <button className="adm__burger" onClick={() => setMenu(true)} aria-label="Open menu"><span /><span /><span /></button>
          <div className="adm__crumb">{group && <small>{group}</small>}<b>{label}</b></div>
          <div className="adm__top-actions">
            <a href="/" target="_blank" rel="noreferrer" className="adm__ghost">View website ↗</a>
            <button className="adm__ghost" onClick={logout}>Sign out</button>
          </div>
        </header>
        <div className="adm__content">
          <Panel key={current} call={call} token={token} go={go} />
        </div>
      </div>
    </section>
  );
}
