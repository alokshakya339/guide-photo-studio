import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import DatePicker from '../components/DatePicker.jsx';
import Select from '../components/Select.jsx';
import { useToast } from '../components/Toast.jsx';
import { useDialog } from '../components/Dialog.jsx';
import { TEMPLATES } from '../invites/InvitePage.jsx';
import { api as publicApi } from '../api.js';

const BASE = import.meta.env.VITE_API_URL || '';
const STATUS = { draft: 'Draft', preview: 'Sent for preview', published: 'Published', archived: 'Archived' };
const EVENT_PRESETS = ['Haldi', 'Mehendi', 'Sangeet', 'Wedding', 'Reception', 'Engagement', 'Cocktail'];
/* Dress-code colour ideas per function (matched by event name). The first three are added automatically. */
const EVENT_PALETTES = [
  { match: /haldi|pithi/i, dress: 'Shades of yellow', label: 'Haldi yellows', colors: ['#f6c90e', '#ffd84d', '#f4a300', '#fff2a8', '#e8b923', '#ffb347', '#fbe7a1', '#ff9f1c'] },
  { match: /meh[ae]?n?di|mehendi/i, dress: 'Shades of green', label: 'Mehendi greens', colors: ['#2e7d32', '#66bb6a', '#a5d6a7', '#556b2f', '#9acd32', '#00a86b', '#c5e1a5', '#1b5e20'] },
  { match: /sangeet|garba|dandiya/i, dress: 'Bright & festive', label: 'Sangeet brights', colors: ['#c2185b', '#8e24aa', '#ff80ab', '#26c6da', '#ffd700', '#1a237e', '#ff7043', '#00897b'] },
  { match: /reception/i, dress: 'Evening glam', label: 'Reception evening', colors: ['#0d1b3e', '#1d1a17', '#c0c0c0', '#d4af37', '#f7e7ce', '#6a1b4d', '#37474f', '#880e4f'] },
  { match: /wedding|shaadi|phera|vivah/i, dress: 'Traditional finery', label: 'Wedding reds & golds', colors: ['#b71c1c', '#880e4f', '#d4af37', '#fff8e1', '#e65100', '#f8bbd0', '#7b1fa2', '#c62828'] },
  { match: /engage|ring|roka|sagai/i, dress: 'Soft pastels', label: 'Engagement pastels', colors: ['#f8bbd0', '#b39ddb', '#b2dfdb', '#ffe0b2', '#d7ccc8', '#e1bee7', '#c5cae9', '#fff9c4'] },
  { match: /cocktail|party/i, dress: 'Cocktail chic', label: 'Cocktail night', colors: ['#1d1a17', '#d4af37', '#4a148c', '#b71c1c', '#004d40', '#c0c0c0', '#283593', '#ad1457'] },
];
const DEFAULT_PALETTE = { label: 'Classic shades', colors: ['#fff8e1', '#d4af37', '#f8bbd0', '#9caf88', '#1f3a5f', '#6e1423', '#c0c0c0', '#1d1a17'] };
const paletteFor = (name) => EVENT_PALETTES.find((p) => p.match.test(name || '')) || DEFAULT_PALETTE;

const FONTS = [['', 'Cormorant (default)'], ['playfair', 'Playfair Display'], ['marcellus', 'Marcellus']];
const SLUG_RX = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/;
const MAX_GALLERY = 5; // mirror of server/src/invites/models.js
const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
/* What each package unlocks (mirror of server/src/invites/models.js → PACKAGE_FEATURES). */
const FEATURE_LABELS = [
  ['envelope', 'Envelope opening'], ['media', 'Gallery & film'], ['music', 'Music'], ['countdown', 'Countdown'],
  ['rsvp', 'RSVP'], ['wishes', 'Blessings'], ['customTheme', 'Custom colours & fonts'], ['animations', 'Advanced animations'],
  ['password', 'Password'], ['rsvpExport', 'RSVP export'],
];
const SIGNATURE_F = ['envelope', 'media', 'music', 'countdown', 'rsvp', 'wishes'];
const PKG_NAMES = { essential: 'Essential', signature: 'Signature', luxury: 'Luxury' };
const featuresOf = (pkg) => Object.fromEntries(FEATURE_LABELS.map(([k]) => [k, pkg === 'luxury' || (pkg !== 'essential' && SIGNATURE_F.includes(k))]));
const minPackage = (k) => (SIGNATURE_F.includes(k) ? 'Signature' : 'Luxury');

/** Shown inside a section whose feature the current package doesn't include. */
function Locked({ inv, f, what }) {
  const api = useContext(EditorApi);
  if (featuresOf(inv.package)[f]) return null;
  const customer = api?.mode === 'customer';
  const how = customer ? (inv.paymentStatus === 'pending' ? 'Choose' : 'Ask the studio to upgrade you to') : 'Upgrade to';
  const where = customer ? (inv.paymentStatus === 'pending' ? ' in the “Pay & publish” tab' : '') : ' (Publish tab)';
  return <p className="ivx__locked">🔒 {what} {what.endsWith('s') ? 'aren’t' : 'isn’t'} part of the {PKG_NAMES[inv.package] || inv.package} package, so guests won’t see it. {how} {minPackage(f)}{where} to switch it on.</p>;
}

/** Package summary above the editor tabs. */
function PackageStrip({ inv, set, readOnly }) {
  const f = featuresOf(inv.package);
  return (
    <div className="ivx__pkg">
      {readOnly ? <label><span>Package</span><strong>{PKG_NAMES[inv.package] || inv.package}</strong></label> : (
        <label><span>Package</span>
          <Select size="sm" value={inv.package} onChange={(v) => set('package', v)} options={Object.entries(PKG_NAMES).map(([value, label]) => ({ value, label }))} ariaLabel="Package" />
        </label>
      )}
      <ul>{FEATURE_LABELS.map(([k, l]) => <li key={k} className={f[k] ? 'is-on' : ''} title={f[k] ? 'Included' : `Needs ${minPackage(k)}`}>{f[k] ? '✓' : '—'} {l}</li>)}</ul>
    </div>
  );
}

const inviteUrl = (inv, preview) => `${window.location.origin}/invite/${inv.slug}${preview ? `?preview=${inv.previewToken}` : ''}`;

/**
 * Where the editor reads and writes. Admin uses the admin API with its bearer token; customers use their own
 * /api/account endpoints (session cookie) — same editor, different permissions enforced by the server.
 */
export const EditorApi = createContext(null);
const adminApi = (token) => ({
  mode: 'admin',
  one: (id) => `/admin/invites/${id}`,
  rsvps: (id) => `/admin/invites/${id}/rsvps`,
  wishes: (id) => `/admin/invites/${id}/wishes`,
  wish: (wid) => `/admin/invites/wishes/${wid}`,
  csvUrl: (id) => `${BASE}/api/admin/invites/${id}/rsvps.csv`,
  uploadUrl: () => `${BASE}/api/admin/invites/upload`,
  headers: { Authorization: `Bearer ${token}` },
});
export const customerApi = {
  mode: 'customer',
  one: (id) => `/account/invitations/${id}`,
  rsvps: (id) => `/account/invitations/${id}/rsvps`,
  wishes: (id) => `/account/invitations/${id}/wishes`,
  wish: (wid) => `/account/wishes/${wid}`,
  csvUrl: (id) => `${BASE}/api/account/invitations/${id}/rsvps.csv`,
  uploadUrl: (id) => `${BASE}/api/account/invitations/${id}/upload`,
  headers: {},
};

async function uploadFiles(api, files, folder) {
  const fd = new FormData();
  [...files].forEach((f) => fd.append('files', f));
  fd.append('folder', folder);
  const res = await fetch(api.uploadUrl(api.invId), { method: 'POST', headers: api.headers, credentials: 'same-origin', body: fd });
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

/* ---------------- list ---------------- */
export default function InvitationsAdmin({ call, token }) {
  const api = useMemo(() => adminApi(token), [token]);
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null); // id
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');
  const load = useCallback(() => call('/admin/invites').then(setData).catch((e) => setErr(e.message)), [call]);
  useEffect(() => { load(); }, [load]);

  if (editing) return <Editor id={editing} call={call} api={api} onBack={() => { setEditing(null); load(); }} />;
  const list = data?.invitations || [];
  const totals = list.reduce((a, i) => ({ views: a.views + (i.views || 0), guests: a.guests + (i.stats?.guests || 0), live: a.live + (i.status === 'published' ? 1 : 0) }), { views: 0, guests: 0, live: 0 });

  return (
    <div className="ivx">
      <div className="ivx__top">
        <div>
          <h2>Invitations</h2>
          <p className="muted small">Wedding invitation websites at <code>/invite/couple-name</code>. Create, preview, publish and track RSVPs — no developer needed.</p>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => setCreating(true)}>+ New invitation</button>
      </div>
      {data && !data.storage && <p className="note note--error">Photo storage isn’t configured (STORAGE_* in server/.env) — uploads will fail.</p>}
      {err && <p className="note note--error">{err}</p>}
      <div className="ivx__stats">
        <div><b>{list.length}</b><span>Invitations</span></div>
        <div><b>{totals.live}</b><span>Published</span></div>
        <div><b>{totals.views.toLocaleString('en-IN')}</b><span>Total views</span></div>
        <div><b>{totals.guests}</b><span>Guests attending</span></div>
      </div>
      {creating && <CreateForm call={call} onClose={() => setCreating(false)} onCreated={(inv) => { setCreating(false); setEditing(inv._id); }} />}
      {!data ? <p className="muted">Loading…</p> : list.length === 0 ? (
        <p className="note">No invitations yet. Click “New invitation” to create the first one.</p>
      ) : (
        <div className="ivx__grid">
          {list.map((i) => (
            <article key={i._id} className="ivx__card">
              <button className="ivx__thumb" onClick={() => setEditing(i._id)} style={i.coverPhoto ? { backgroundImage: `url(${i.coverPhoto})` } : undefined} aria-label={`Edit ${i.partner1} & ${i.partner2}`}>
                <span className={`ivx__status is-${i.status}`}>{STATUS[i.status]}</span>
              </button>
              <div className="ivx__body">
                <strong>{i.partner1} &amp; {i.partner2}</strong>
                <small className="muted">/invite/{i.slug} · {TEMPLATES[i.template]?.name || i.template}</small>
                <small className="muted">{i.weddingDate ? fmt(i.weddingDate) : 'No date yet'} · {i.views || 0} views · {i.stats.responses} RSVPs ({i.stats.guests} guests){i.stats.pendingWishes ? ` · ${i.stats.pendingWishes} wishes to approve` : ''}</small>
                {i.owner && <small className="muted">Created by customer: {i.owner.name} · {i.owner.email}{i.owner.phone ? ` · ${i.owner.phone}` : ''}</small>}
                {i.submittedAt && i.status !== 'published' && <small className="ivx__review">● Sent for review {fmt(i.submittedAt)} · payment {i.paymentStatus}</small>}
                <div className="ivx__actions">
                  <button className="link-btn" onClick={() => setEditing(i._id)}>Edit</button>
                  <a className="link-btn" href={inviteUrl(i, i.status !== 'published')} target="_blank" rel="noreferrer">{i.status === 'published' ? 'Open live ↗' : 'Preview ↗'}</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateForm({ call, onClose, onCreated }) {
  const [f, setF] = useState({ partner1: '', partner2: '', slug: '', template: 'royal', weddingDate: '' });
  const [touched, setTouched] = useState(false);
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => {
    const v = e.target.value;
    setF((x) => {
      const n = { ...x, [k]: v };
      if (!touched && (k === 'partner1' || k === 'partner2')) n.slug = slugify(`${k === 'partner1' ? v : x.partner1}-${k === 'partner2' ? v : x.partner2}`.split(' ').join('-'));
      return n;
    });
    if (k === 'slug') setTouched(true);
    setErrs((x) => ({ ...x, [k]: '' }));
  };
  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.partner1.trim()) er.partner1 = 'Required';
    if (!f.partner2.trim()) er.partner2 = 'Required';
    if (!SLUG_RX.test(f.slug)) er.slug = '3–60 lowercase letters, numbers and dashes';
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try { onCreated(await call('/admin/invites', { method: 'POST', body: { ...f, headline: 'We’re getting married', events: [] } })); }
    catch (e2) { setErrs(e2.data?.fields || {}); setBusy(false); }
  };
  return (
    <form className="panel ivx__create" onSubmit={submit} noValidate>
      <h3>New invitation</h3>
      <div className="ivx__row">
        <Field label="Bride / partner 1 *" err={errs.partner1}><input value={f.partner1} onChange={set('partner1')} placeholder="Riya" maxLength={60} /></Field>
        <Field label="Groom / partner 2 *" err={errs.partner2}><input value={f.partner2} onChange={set('partner2')} placeholder="Raman" maxLength={60} /></Field>
      </div>
      <div className="ivx__row">
        <Field label="Link *" err={errs.slug} hint={`${window.location.origin}/invite/${f.slug || 'riya-raman'}`}><input value={f.slug} onChange={set('slug')} placeholder="riya-raman" maxLength={60} /></Field>
        <Field label="Wedding date"><DatePicker value={f.weddingDate} onChange={(v) => set('weddingDate')({ target: { value: v } })} ariaLabel="Wedding date" /></Field>
      </div>
      <Field label="Theme"><select value={f.template} onChange={set('template')}>{Object.entries(TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.name}</option>)}</select></Field>
      <div className="ivx__btns"><button className="btn btn--primary btn--sm" disabled={busy}>{busy ? 'Creating…' : 'Create & edit'}</button><button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Cancel</button></div>
    </form>
  );
}

function Field({ label, err, hint, children, wide }) {
  return (
    <label className={`form-field ${wide ? 'ivx__wide' : ''}`}>
      <span>{label}</span>
      {children}
      {err ? <small className="form__err">{err}</small> : hint ? <small className="muted">{hint}</small> : null}
    </label>
  );
}

/** One theme colour: tap the swatch for the full picker, or pick a preset. Empty value = theme default. */
const COLOR_PRESETS = {
  primary: ['#6e1423', '#8b1e3f', '#1f3a5f', '#2e4a3a', '#5b3a6b', '#1d1a17'],
  accent: ['#c9a24f', '#b8860b', '#d4a5a5', '#a5843f', '#9caf88', '#c0c0c0'],
  background: ['#fbf5ea', '#fffdf9', '#f4ece1', '#f7f0f5', '#eef3f0', '#1d1a17'],
};
function ColorField({ k, label, def, value, onChange }) {
  const cur = value || def;
  return (
    <div className="ivx__color">
      <label className="ivx__swatch" style={{ '--c': cur }} title="Choose any colour">
        <input type="color" value={cur} onChange={(e) => onChange(e.target.value)} aria-label={`${label}: choose a colour`} />
      </label>
      <div className="ivx__color-text">
        <span>{label}</span>
        <small>{value ? value.toUpperCase() : `Theme default · ${def.toUpperCase()}`}</small>
      </div>
      {value && <button type="button" className="link-btn ivx__color-reset" onClick={() => onChange('')}>Reset</button>}
      <div className="ivx__presets" role="group" aria-label={`${label} presets`}>
        {COLOR_PRESETS[k].map((c) => (
          <button type="button" key={c} style={{ '--c': c }} className={cur.toLowerCase() === c ? 'is-on' : ''} onClick={() => onChange(c === def ? '' : c)} aria-label={c} title={c} />
        ))}
      </div>
    </div>
  );
}

/* ---------------- editor ---------------- */
const TABS = [['details', 'Details'], ['sections', 'Couple & story'], ['events', 'Events'], ['media', 'Photos & music'], ['look', 'Look'], ['guests', 'Guests'], ['publish', 'Client & publish']];
const CUSTOMER_TABS = [...TABS.slice(0, -1), ['share', 'Pay & publish']];

/**
 * The invitation editor. Admin: every field + publishing. Customer (api.mode === 'customer'): same editor, but the
 * package is read-only and the last tab is "Share & send" (renderShare), where they send it to the studio.
 */
export function Editor({ id, call, api, onBack, backLabel = '← All invitations', renderShare }) {
  const customer = api.mode === 'customer';
  const ctx = useMemo(() => ({ ...api, invId: id }), [api, id]);
  const toast = useToast();
  const dialog = useDialog();
  const [inv, setInv] = useState(null);
  const [saved, setSaved] = useState(null);
  const [tab, setTab] = useState(() => (api.mode === 'customer' && new URLSearchParams(window.location.search).get('tab') === 'share' ? 'share' : 'details'));
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState('');
  const [device, setDevice] = useState('mobile');
  const [frameKey, setFrameKey] = useState(0);
  const [password, setPassword] = useState('');
  const [sheet, setSheet] = useState(false); // phones/tablets: preview opens full screen
  const tabsRef = useRef(null);
  // While editing, hide the site's bottom tab bar & chat button on phones (the editor has its own bar).
  useEffect(() => { document.body.classList.add('ivx-editing'); return () => document.body.classList.remove('ivx-editing'); }, []);
  useEffect(() => { tabsRef.current?.querySelector('.is-on')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }, [tab]);
  useEffect(() => {
    if (!sheet) return undefined;
    const esc = (e) => e.key === 'Escape' && setSheet(false);
    document.addEventListener('keydown', esc);
    document.body.classList.add('ivx-sheet-open');
    return () => { document.removeEventListener('keydown', esc); document.body.classList.remove('ivx-sheet-open'); };
  }, [sheet]);

  const [loadErr, setLoadErr] = useState('');
  useEffect(() => { call(api.one(id)).then((d) => { setInv(d); setSaved(JSON.stringify(d)); }).catch((e) => setLoadErr(e.message)); }, [id, call, api]);
  const dirty = inv && saved !== JSON.stringify(inv);
  const set = (k, v) => { setInv((x) => ({ ...x, [k]: v })); setErrs((x) => ({ ...x, [k]: '' })); };

  const save = async (extra = {}) => {
    setBusy('Saving…'); setErrs({});
    try {
      const body = { ...inv, ...extra };
      ['_id', 'views', 'createdAt', 'updatedAt', 'hasPassword', 'previewToken', 'owner', 'submittedAt', 'statusLabel', '__v'].forEach((k) => delete body[k]);
      const d = await call(api.one(id), { method: 'PUT', body });
      const next = { ...d, hasPassword: extra.password !== undefined ? Boolean(extra.password) : inv.hasPassword };
      setInv(next); setSaved(JSON.stringify(next)); setFrameKey((k) => k + 1);
      return next;
    } catch (e) { setErrs(e.data?.fields || {}); toast({ title: 'Couldn’t save', message: e.message, type: 'error' }); throw e; }
    finally { setBusy(''); }
  };
  const doSave = () => save().then(() => toast({ title: 'Saved', message: 'The preview has been updated.' })).catch(() => {});
  const setStatus = async (status, msg) => { try { await save({ status }); toast({ title: msg }); } catch { /* shown */ } };
  const copy = async (text, what) => { try { await navigator.clipboard.writeText(text); toast({ title: `${what} copied` }); } catch { /* ignore */ } };
  const remove = async () => {
    if (!(await dialog.confirm({ title: `Delete ${inv.partner1} & ${inv.partner2}?`, message: 'The invitation, its RSVPs and blessings are deleted for good. Consider “Archive” instead.', tone: 'danger', confirmLabel: 'Delete invitation' }))) return;
    await call(api.one(id), { method: 'DELETE' }); onBack();
  };

  if (loadErr) return <div className="ivx"><button className="link-btn" onClick={onBack}>{backLabel}</button><p className="note note--error">{loadErr}</p></div>;
  if (!inv) return <p className="muted">Loading…</p>;
  const previewSrc = `/invite/${inv.slug}?preview=${inv.previewToken}`;
  const clientWa = inv.client?.phone ? `https://wa.me/${String(inv.client.phone).replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}?text=${encodeURIComponent(`Hi ${inv.client?.name || ''}! Here is the preview of your wedding invitation from Guide Studio 💌\n${inviteUrl(inv, true)}\n\nPlease have a look and tell us if you'd like any changes.`)}` : '';

  return (
    <EditorApi.Provider value={ctx}>
    <div className={`ivx ivx--edit ${customer ? 'ivx--customer' : ''}`}>
      <div className="ivx__top">
        <div>
          <button className="link-btn" onClick={async () => { if (!dirty || (await dialog.confirm({ title: 'Leave without saving?', message: 'Your unsaved changes will be lost.', confirmLabel: 'Leave' }))) onBack(); }}>{backLabel}</button>
          <h2>{inv.partner1} &amp; {inv.partner2} <span className={`ivx__status is-${inv.status}`}>{customer ? inv.statusLabel || STATUS[inv.status] : STATUS[inv.status]}</span></h2>
          <p className="muted small">/invite/{inv.slug} · {inv.views || 0} views</p>
        </div>
        <div className="ivx__btns">
          {busy && <span className="muted small">{busy}</span>}
          <button className="btn btn--primary btn--sm" onClick={doSave} disabled={!dirty || Boolean(busy)}>{dirty ? 'Save changes' : 'Saved'}</button>
        </div>
      </div>

      <div className="ivx__split">
        <div className="ivx__form">
          <PackageStrip inv={inv} set={set} readOnly={customer} />
          <div className="ivx__tabs" role="tablist" ref={tabsRef}>{(customer ? CUSTOMER_TABS : TABS).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

          {tab === 'details' && (
            <div className="ivx__pane">
              <div className="ivx__row">
                <Field label="Bride / partner 1" err={errs.partner1}><input value={inv.partner1 || ''} onChange={(e) => set('partner1', e.target.value)} maxLength={60} /></Field>
                <Field label="Groom / partner 2" err={errs.partner2}><input value={inv.partner2 || ''} onChange={(e) => set('partner2', e.target.value)} maxLength={60} /></Field>
              </div>
              <div className="ivx__row">
                <Field label="Wedding date (countdown)" err={errs.weddingDate}><DatePicker value={inv.weddingDate || ''} onChange={(v) => set('weddingDate', v)} ariaLabel="Wedding date" invalid={Boolean(errs.weddingDate)} /></Field>
                <Field label="City / place"><input value={inv.city || ''} onChange={(e) => set('city', e.target.value)} placeholder="Mussoorie" maxLength={80} /></Field>
              </div>
              <Field label="Headline"><input value={inv.headline || ''} onChange={(e) => set('headline', e.target.value)} placeholder="We’re getting married" maxLength={120} /></Field>
              <Field label="Families line" hint="Shown under “Together with their families”."><textarea rows={2} value={inv.families || ''} onChange={(e) => set('families', e.target.value)} placeholder="Mr. & Mrs. Sharma and Mr. & Mrs. Kapoor request the pleasure of your company…" maxLength={240} /></Field>
              <Field label="Our story" hint="Leave a blank line between paragraphs."><textarea rows={6} value={inv.story || ''} onChange={(e) => set('story', e.target.value)} maxLength={2000} /></Field>
            </div>
          )}

          {tab === 'sections' && <SectionsPane inv={inv} set={set} errs={errs} />}
          {tab === 'events' && <EventsPane inv={inv} set={set} errs={errs} />}
          {tab === 'media' && <MediaPane inv={inv} set={set} errs={errs} />}

          {tab === 'look' && (
            <div className="ivx__pane">
              <Locked inv={inv} f="customTheme" what="Custom colours and fonts" />
              <Field label="Theme"><Select value={inv.template} onChange={(v) => set('template', v)} options={Object.entries(TEMPLATES).map(([value, t]) => ({ value, label: t.name }))} ariaLabel="Theme" /></Field>
              <p className="muted small">Colours override the theme’s defaults. Tap a swatch to pick any colour, or choose a preset.</p>
              <div className="ivx__colors">
                {[['primary', 'Main colour', '#6e1423'], ['accent', 'Accent (gold)', '#c9a24f'], ['background', 'Paper / background', '#fbf5ea']].map(([k, l, d]) => (
                  <ColorField key={k} k={k} label={l} def={d} value={inv.theme?.[k] || ''} onChange={(v) => set('theme', { ...inv.theme, [k]: v })} />
                ))}
              </div>
              <Field label="Heading font"><Select value={inv.theme?.font || ''} onChange={(v) => set('theme', { ...inv.theme, font: v })} options={FONTS.map(([value, label]) => ({ value, label }))} ariaLabel="Heading font" /></Field>
            </div>
          )}

          {tab === 'guests' && (
            <GuestsPane inv={inv} set={set} call={call} password={password} setPassword={setPassword} save={save} toast={toast} dialog={dialog} />
          )}

          {tab === 'share' && customer && renderShare?.({ inv, setInv, setSaved, save, dirty })}

          {tab === 'publish' && !customer && (
            <div className="ivx__pane">
              <h4>Client</h4>
              <div className="ivx__row">
                <Field label="Client name"><input value={inv.client?.name || ''} onChange={(e) => set('client', { ...inv.client, name: e.target.value })} maxLength={120} /></Field>
                <Field label="Client WhatsApp" err={errs.clientPhone}><input value={inv.client?.phone || ''} onChange={(e) => set('client', { ...inv.client, phone: e.target.value })} inputMode="tel" maxLength={18} /></Field>
              </div>
              <div className="ivx__row">
                <Field label="Client email" err={errs.clientEmail}><input type="email" value={inv.client?.email || ''} onChange={(e) => set('client', { ...inv.client, email: e.target.value })} maxLength={160} /></Field>
                <Field label="Package"><Select value={inv.package} onChange={(v) => set('package', v)} options={Object.entries(PKG_NAMES).map(([value, label]) => ({ value, label }))} ariaLabel="Package" /></Field>
              </div>
              <div className="ivx__row">
                <Field label="Payment"><Select value={inv.paymentStatus} onChange={(v) => set('paymentStatus', v)} options={[{ value: 'pending', label: 'Pending' }, { value: 'paid', label: 'Paid' }, { value: 'waived', label: 'Waived / complimentary' }]} ariaLabel="Payment" /></Field>
                <Field label="Client approved">{inv.clientApprovedAt ? <span>✓ {fmt(inv.clientApprovedAt)}</span> : <button type="button" className="btn btn--ghost btn--sm" onClick={() => save({ clientApproved: true }).then(() => toast({ title: 'Marked as approved' })).catch(() => {})}>Mark approved</button>}</Field>
              </div>
              <Field label="Internal notes"><textarea rows={3} value={inv.notes || ''} onChange={(e) => set('notes', e.target.value)} maxLength={4000} /></Field>

              <h4>Links</h4>
              <div className="ivx__link"><span>Preview (private)</span><code>{inviteUrl(inv, true)}</code><button className="link-btn" onClick={() => copy(inviteUrl(inv, true), 'Preview link')}>Copy</button>{clientWa && <a className="link-btn" href={clientWa} target="_blank" rel="noreferrer">Send to client on WhatsApp</a>}</div>
              <div className="ivx__link"><span>Live link</span><code>{inviteUrl(inv, false)}</code><button className="link-btn" onClick={() => copy(inviteUrl(inv, false), 'Live link')}>Copy</button></div>

              <h4>Status</h4>
              <div className="ivx__btns">
                {inv.status !== 'preview' && inv.status !== 'published' && <button className="btn btn--ghost btn--sm" onClick={() => setStatus('preview', 'Marked as sent for preview')}>Mark “sent for preview”</button>}
                {inv.status !== 'published' && <button className="btn btn--primary btn--sm" onClick={async () => { if (await dialog.confirm({ title: 'Publish this invitation?', message: `Anyone with the link /invite/${inv.slug} will be able to open it.${inv.clientApprovedAt ? '' : ' The client hasn’t approved it yet.'}`, confirmLabel: 'Publish' })) setStatus('published', 'Published — the live link works now'); }}>Publish</button>}
                {inv.status === 'published' && <button className="btn btn--ghost btn--sm" onClick={() => setStatus('draft', 'Unpublished')}>Unpublish</button>}
                {inv.status !== 'archived' && <button className="btn btn--ghost btn--sm" onClick={() => setStatus('archived', 'Archived')}>Archive</button>}
                <button className="btn btn--ghost btn--sm ivx__danger" onClick={remove}>Delete</button>
              </div>
            </div>
          )}
        </div>

        <div className={`ivx__preview ${sheet ? 'is-open' : ''}`} role={sheet ? 'dialog' : undefined} aria-modal={sheet || undefined} aria-label={sheet ? 'Invitation preview' : undefined}>
          <div className="ivx__pbar">
            <button type="button" className="ivx__sheet-close" onClick={() => setSheet(false)} aria-label="Close preview">×</button>
            <div className="ivx__seg">
              <button className={device === 'mobile' ? 'is-on' : ''} onClick={() => setDevice('mobile')}>Phone</button>
              <button className={device === 'desktop' ? 'is-on' : ''} onClick={() => setDevice('desktop')}>Desktop</button>
            </div>
            <span className="muted small">{dirty ? 'Save to update the preview' : 'Live preview'}</span>
            <a className="link-btn" href={previewSrc} target="_blank" rel="noreferrer">Open ↗</a>
          </div>
          <DeviceFrame device={device} src={previewSrc} reloadKey={frameKey} />
        </div>
      </div>

      {/* Phones & tablets: actions always within reach */}
      <div className="ivx__mbar">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSheet(true)}>Preview</button>
        <span className="muted small">{busy || (dirty ? 'Unsaved changes' : 'All changes saved')}</span>
        <button type="button" className="btn btn--primary btn--sm" onClick={doSave} disabled={!dirty || Boolean(busy)}>{dirty ? 'Save' : 'Saved'}</button>
      </div>
    </div>
    </EditorApi.Provider>
  );
}

/**
 * The live preview. The invitation is rendered at a real device size (phone 390×844, desktop 1440×900) and
 * scaled down to fit, so it looks exactly like it will for guests — not like a squeezed, in-between width.
 */
const DEVICES = { mobile: { w: 390, h: 844 }, desktop: { w: 1440, h: 900 } };
function DeviceFrame({ device, src, reloadKey }) {
  const box = useRef(null);
  const [avail, setAvail] = useState(0);
  const { w, h } = DEVICES[device] || DEVICES.mobile;
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setAvail(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Fit the width of the panel, and keep the phone no taller than the screen allows.
  const maxH = Math.max(420, (typeof window !== 'undefined' ? window.innerHeight : 900) - 190);
  const scale = avail ? Math.min(1, avail / w, device === 'mobile' ? maxH / h : 1) : 0;
  return (
    <div ref={box} className={`ivx__devbox is-${device}`}>
      <div className={`ivx__device is-${device}`} style={{ width: w * scale, height: h * scale, visibility: scale ? 'visible' : 'hidden' }}>
        <iframe key={reloadKey} src={src} title="Invitation preview" width={w} height={h} style={{ width: w, height: h, transform: `scale(${scale})` }} />
      </div>
      <p className="ivx__devnote">{device === 'mobile' ? 'Phone' : 'Desktop'} · shown at {w}×{h}{scale && scale < 1 ? `, scaled to ${Math.round(scale * 100)}%` : ''}</p>
    </div>
  );
}

function EventsPane({ inv, set, errs }) {
  const events = inv.events || [];
  const upd = (i, k, v) => set('events', events.map((e, j) => (j === i ? { ...e, [k]: v } : e)));
  const add = (name) => {
    const pal = name ? paletteFor(name) : null; // e.g. Haldi → yellows, Mehendi → greens
    set('events', [...events, { name, date: inv.weddingDate || '', time: '', venue: '', address: '', mapUrl: '', dressCode: pal?.dress || '', note: '', colors: pal?.colors ? pal.colors.slice(0, 3) : [] }]);
  };
  const move = (i, d) => { const n = [...events]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); set('events', n); };
  return (
    <div className="ivx__pane">
      <div className="ivx__chips"><span className="muted small">Add:</span>{EVENT_PRESETS.map((p) => <button key={p} type="button" onClick={() => add(p)}>+ {p}</button>)}<button type="button" onClick={() => add('')}>+ Other</button></div>
      {events.length === 0 && <p className="note">No events yet. Add Haldi, Mehendi, Sangeet, Wedding, Reception…</p>}
      {events.map((e, i) => (
        <fieldset key={i} className="ivx__event">
          <legend>{e.name || `Event ${i + 1}`}</legend>
          {errs[`event${i}`] && <small className="form__err">{errs[`event${i}`]}</small>}
          <div className="ivx__row">
            <Field label="Name"><input value={e.name} onChange={(ev) => upd(i, 'name', ev.target.value)} maxLength={60} /></Field>
            <Field label="Date"><DatePicker value={e.date || ''} onChange={(v) => upd(i, 'date', v)} ariaLabel="Event date" /></Field>
          </div>
          <div className="ivx__row">
            <Field label="Time"><input value={e.time || ''} onChange={(ev) => upd(i, 'time', ev.target.value)} placeholder="7:00 PM onwards" maxLength={40} /></Field>
            <Field label="Dress code"><input value={e.dressCode || ''} onChange={(ev) => upd(i, 'dressCode', ev.target.value)} placeholder="Shades of yellow" maxLength={120} /></Field>
          </div>
          <div className="ivx__row">
            <Field label="Venue"><input value={e.venue || ''} onChange={(ev) => upd(i, 'venue', ev.target.value)} placeholder="JW Marriott" maxLength={120} /></Field>
            <Field label="Address"><input value={e.address || ''} onChange={(ev) => upd(i, 'address', ev.target.value)} maxLength={240} /></Field>
          </div>
          <Field label="Google Maps link (optional)" hint="Leave empty to search the venue + address."><input value={e.mapUrl || ''} onChange={(ev) => upd(i, 'mapUrl', ev.target.value)} placeholder="https://maps.app.goo.gl/…" maxLength={500} /></Field>
          <Field label="Note (optional)"><input value={e.note || ''} onChange={(ev) => upd(i, 'note', ev.target.value)} maxLength={400} /></Field>
          <DressColors e={e} onChange={(colors) => upd(i, 'colors', colors)} />
          <div className="ivx__btns">
            {i > 0 && <button type="button" className="link-btn" onClick={() => move(i, -1)}>↑ Move up</button>}
            {i < events.length - 1 && <button type="button" className="link-btn" onClick={() => move(i, 1)}>↓ Move down</button>}
            <button type="button" className="link-btn ivx__danger" onClick={() => set('events', events.filter((_, j) => j !== i))}>Remove</button>
          </div>
        </fieldset>
      ))}
    </div>
  );
}

/** Dress-code colours for one event: suggested shades for the function (tap to add / remove) + custom colours. Max 5. */
function DressColors({ e, onChange }) {
  const colors = e.colors || [];
  const pal = paletteFor(e.name);
  const has = (c) => colors.some((x) => x.toLowerCase() === c.toLowerCase());
  const toggle = (c) => onChange(has(c) ? colors.filter((x) => x.toLowerCase() !== c.toLowerCase()) : colors.length < 5 ? [...colors, c] : colors);
  const custom = colors.filter((c) => !pal.colors.some((p) => p.toLowerCase() === c.toLowerCase()));
  return (
    <div className="ivx__dress">
      <div className="ivx__dress-head">
        <span>Dress-code colours <small className="muted">· {colors.length}/5 · shown to guests</small></span>
        {colors.length > 0 && <button type="button" className="link-btn" onClick={() => onChange([])}>Clear</button>}
      </div>
      <p className="muted small">{pal.label} — tap to add or remove:</p>
      <div className="ivx__dress-row" role="group" aria-label={`${pal.label} suggestions`}>
        {pal.colors.map((c) => (
          <button type="button" key={c} style={{ '--c': c }} className={`ivx__dot ${has(c) ? 'is-on' : ''}`} onClick={() => toggle(c)} disabled={!has(c) && colors.length >= 5} aria-pressed={has(c)} aria-label={c} title={c} />
        ))}
      </div>
      <div className="ivx__dress-row">
        {custom.map((c) => (
          <span key={c} className="ivx__sw">
            <label className="ivx__dot is-on is-custom" style={{ '--c': c }} title="Change colour">
              <input type="color" value={c} onChange={(ev) => onChange(colors.map((x) => (x === c ? ev.target.value : x)))} aria-label={`Custom colour ${c}`} />
            </label>
            <button type="button" className="link-btn" onClick={() => onChange(colors.filter((x) => x !== c))} aria-label="Remove colour">×</button>
          </span>
        ))}
        {colors.length < 5 && (
          <label className="ivx__dot ivx__dot--add" title="Pick any colour">
            <input type="color" value="#a5843f" onChange={(ev) => onChange([...colors, ev.target.value])} aria-label="Add a custom colour" />
            <span aria-hidden="true">+</span>
          </label>
        )}
        <span className="muted small">Any colour</span>
      </div>
    </div>
  );
}

/** Repeating rows (timeline, family, contacts). */
function Rows({ rows, onChange, blank, max, addLabel, render }) {
  const upd = (i, k, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <>
      {rows.map((r, i) => (
        <div key={i} className="ivx__rowcard">
          {render(r, (k, v) => upd(i, k, v), i)}
          <div className="ivx__btns">
            {i > 0 && <button type="button" className="link-btn" onClick={() => { const n = [...rows]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); }}>↑ Up</button>}
            <button type="button" className="link-btn ivx__danger" onClick={() => onChange(rows.filter((_, j) => j !== i))}>Remove</button>
          </div>
        </div>
      ))}
      {rows.length < max && <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange([...rows, { ...blank }])}>{addLabel}</button>}
    </>
  );
}

/** Couple cards, story timeline, families, contacts, hashtag — shown by the Guide Studio Editorial theme. */
function SectionsPane({ inv, set, errs }) {
  const c = inv.couple || {};
  const setC = (k, v) => set('couple', { ...c, [k]: v });
  const folder = inv.slug;
  const person = (n, label) => (
    <div className="ivx__rowcard">
      <h5>{label}: {inv[`partner${n}`] || '—'}</h5>
      <div className="ivx__person">
        <span className="ivx__avatar" style={c[`p${n}Photo`] ? { backgroundImage: `url(${c[`p${n}Photo`]})` } : undefined} />
        <div>
          <Uploader label={c[`p${n}Photo`] ? 'Replace photo' : 'Add photo'} folder={folder} onDone={(o) => o[0] && setC(`p${n}Photo`, o[0].url)} hint="Optional — the initial is shown without one." />
          {c[`p${n}Photo`] && <button type="button" className="link-btn ivx__danger" onClick={() => setC(`p${n}Photo`, '')}>Remove photo</button>}
        </div>
      </div>
      <Field label="Parents line"><input value={c[`p${n}Parents`] || ''} onChange={(e) => setC(`p${n}Parents`, e.target.value)} placeholder={n === 1 ? 'Daughter of Mr. & Mrs. Sharma' : 'Son of Mr. & Mrs. Kapoor'} maxLength={160} /></Field>
      <Field label="A line about them"><textarea rows={2} value={c[`p${n}Bio`] || ''} onChange={(e) => setC(`p${n}Bio`, e.target.value)} maxLength={300} /></Field>
    </div>
  );
  return (
    <div className="ivx__pane">
      {inv.template === 'royal' && <p className="ivx__locked">These sections don’t appear in the <b>Royal Indian</b> design. Switch the design in the Look tab to use them (Editorial shows all of them; Blush Garden, Marigold Mela, Midnight Deco and Modern Minimal show the couple, timeline and contacts).</p>}
      <h4>The couple</h4>
      {person(1, 'Partner 1')}
      {person(2, 'Partner 2')}

      <h4>Story timeline</h4>
      <p className="muted small">Milestones shown as a timeline. Leave empty to show the “Our story” text from Details instead.</p>
      <Rows rows={inv.timeline || []} onChange={(v) => set('timeline', v)} blank={{ year: '', title: '', text: '' }} max={12} addLabel="+ Add milestone"
        render={(r, u) => (<>
          <div className="ivx__row">
            <Field label="Year / when"><input value={r.year} onChange={(e) => u('year', e.target.value)} placeholder="2020" maxLength={20} /></Field>
            <Field label="Title"><input value={r.title} onChange={(e) => u('title', e.target.value)} placeholder="First hello" maxLength={80} /></Field>
          </div>
          <Field label="What happened"><textarea rows={2} value={r.text} onChange={(e) => u('text', e.target.value)} maxLength={400} /></Field>
        </>)} />

      <h4>Our families</h4>
      <Rows rows={inv.family || []} onChange={(v) => set('family', v)} blank={{ name: '', relation: '', photo: '' }} max={12} addLabel="+ Add family member"
        render={(r, u) => (
          <div className="ivx__row">
            <Field label="Name"><input value={r.name} onChange={(e) => u('name', e.target.value)} placeholder="Mr. & Mrs. Sharma" maxLength={80} /></Field>
            <Field label="Relation"><input value={r.relation} onChange={(e) => u('relation', e.target.value)} placeholder="Parents of the bride" maxLength={80} /></Field>
          </div>
        )} />

      <h4>Contacts for guests</h4>
      <Rows rows={inv.contacts || []} onChange={(v) => set('contacts', v)} blank={{ name: '', role: '', phone: '' }} max={6} addLabel="+ Add contact"
        render={(r, u, i) => (
          <div className="ivx__row ivx__row--3">
            <Field label="Name"><input value={r.name} onChange={(e) => u('name', e.target.value)} maxLength={80} /></Field>
            <Field label="Role"><input value={r.role} onChange={(e) => u('role', e.target.value)} placeholder="Bride’s family" maxLength={80} /></Field>
            <Field label="Mobile" err={errs[`contact${i}`]}><input value={r.phone} onChange={(e) => u('phone', e.target.value)} inputMode="tel" placeholder="+91 98…" maxLength={18} /></Field>
          </div>
        )} />

      <h4>Hashtag</h4>
      <Field label="Wedding hashtag (optional)"><input value={inv.hashtag || ''} onChange={(e) => set('hashtag', e.target.value)} placeholder="#RiyaWedsRaman" maxLength={60} /></Field>
    </div>
  );
}

function Uploader({ label, folder, accept = 'image/*', multiple, onDone, hint }) {
  const api = useContext(EditorApi);
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pick = async (files) => {
    if (!files?.length) return;
    setBusy(true); setErr('');
    try {
      const out = await uploadFiles(api, files, folder);
      const bad = out.filter((o) => o.error);
      if (bad.length) setErr(bad.map((b) => `${b.name}: ${b.error}`).join(' · '));
      onDone(out.filter((o) => o.url));
    } catch (e) { setErr(e.message); } finally { setBusy(false); if (ref.current) ref.current.value = ''; }
  };
  return (
    <div className="ivx__up">
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => ref.current?.click()} disabled={busy}>{busy ? 'Uploading…' : label}</button>
      <input ref={ref} type="file" accept={accept} multiple={multiple} hidden onChange={(e) => pick(e.target.files)} />
      {hint && <small className="muted">{hint}</small>}
      {err && <small className="form__err">{err}</small>}
    </div>
  );
}

/** Songs from the studio's music library (Admin → Music library), with preview and one-click pick. */
function MusicLibrary({ value, onPick }) {
  const [tracks, setTracks] = useState(null);
  const [playing, setPlaying] = useState('');
  const audio = useRef(null);
  useEffect(() => { publicApi('/invites/music').then(setTracks).catch(() => setTracks([])); }, []);
  useEffect(() => () => audio.current?.pause(), []);
  const toggle = (url) => {
    const a = audio.current;
    if (!a) return;
    if (playing === url) { a.pause(); setPlaying(''); return; }
    a.src = url;
    a.play().then(() => setPlaying(url)).catch(() => setPlaying(''));
  };
  if (!tracks) return <p className="muted small">Loading the music library…</p>;
  if (!tracks.length) return <p className="muted small">No songs in the studio’s music library yet — you can upload your own below.</p>;
  return (
    <div className="ivx__tracks" role="list" aria-label="Music library">
      <audio ref={audio} onEnded={() => setPlaying('')} hidden />
      {tracks.map((t) => {
        const on = value === t.url;
        const isPlaying = playing === t.url;
        return (
          <div key={t._id} role="listitem" className={`ivx__track ${on ? 'is-on' : ''}`}>
            <button type="button" className="ivx__track-play" onClick={() => toggle(t.url)} aria-label={`${isPlaying ? 'Pause' : 'Play'} ${t.title}`} aria-pressed={isPlaying}>{isPlaying ? '❚❚' : '▶'}</button>
            <div className="ivx__track-info"><b>{t.title}</b>{(t.artist || t.mood) && <small>{[t.artist, t.mood].filter(Boolean).join(' · ')}</small>}</div>
            {on ? <span className="ivx__track-sel">✓ Selected</span> : <button type="button" className="btn btn--ghost btn--sm" onClick={() => onPick(t)}>Use this</button>}
          </div>
        );
      })}
    </div>
  );
}

function MediaPane({ inv, set, errs }) {
  const folder = inv.slug;
  const gallery = inv.gallery || [];
  return (
    <div className="ivx__pane">
      <div className="ivx__media2">
        <div>
          <h4>Cover photo</h4>
          <p className="muted small">Envelope background, hero and WhatsApp preview.</p>
          {inv.coverPhoto && <img className="ivx__img" src={inv.coverPhoto} alt="" />}
          <Uploader label={inv.coverPhoto ? 'Replace cover' : 'Upload cover'} folder={folder} onDone={(o) => o[0] && set('coverPhoto', o[0].url)} hint="Landscape works best. Auto-optimised." />
        </div>
        <div>
          <h4>Couple photo</h4>
          <p className="muted small">Shown next to “Our story”.</p>
          {inv.couplePhoto && <img className="ivx__img" src={inv.couplePhoto} alt="" />}
          <Uploader label={inv.couplePhoto ? 'Replace photo' : 'Upload photo'} folder={folder} onDone={(o) => o[0] && set('couplePhoto', o[0].url)} hint="Portrait works best." />
        </div>
      </div>
      <h4>Gallery ({gallery.length}/{MAX_GALLERY})</h4>
      <Locked inv={inv} f="media" what="Gallery and film" />
      {gallery.length < MAX_GALLERY ? (
        <Uploader label="Add photos" multiple folder={folder} onDone={(o) => set('gallery', [...gallery, ...o.map((x) => x.url)].slice(0, MAX_GALLERY))} hint={`Up to ${MAX_GALLERY} photos — ${MAX_GALLERY - gallery.length} more can be added. If you pick more, only the first ones are kept. Each is resized and compressed automatically.`} />
      ) : (
        <p className="muted small">The gallery is full ({MAX_GALLERY} photos). Remove one (×) to add another.</p>
      )}
      {gallery.length > 0 && (
        <div className="ivx__gal">
          {gallery.map((src, i) => (
            <div key={src} className="ivx__gal-item">
              <img src={src} alt="" loading="lazy" />
              <div>
                {i > 0 && <button type="button" onClick={() => { const n = [...gallery]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; set('gallery', n); }} aria-label="Move left">‹</button>}
                <button type="button" onClick={() => set('gallery', gallery.filter((_, j) => j !== i))} aria-label="Remove">×</button>
                {i < gallery.length - 1 && <button type="button" onClick={() => { const n = [...gallery]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; set('gallery', n); }} aria-label="Move right">›</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      <Field label="Pre-wedding film (YouTube link)" err={errs.videoId}><input value={inv.videoId || ''} onChange={(e) => set('videoId', e.target.value)} placeholder="https://youtu.be/…" /></Field>
      <h4>Music</h4>
      <Locked inv={inv} f="music" what="Music" />
      <p className="ivx__sub">Pick a song from our library</p>
      <MusicLibrary value={inv.music} onPick={(t) => { set('music', t.url); set('musicTitle', [t.title, t.artist].filter(Boolean).join(' — ')); }} />
      <p className="ivx__sub">Or upload your own</p>
      {inv.music && <audio controls src={inv.music} className="ivx__audio" />}
      <div className="ivx__row">
        <Uploader label={inv.music ? 'Replace music' : 'Upload music'} accept="audio/*" folder={folder} onDone={(o) => o[0] && set('music', o[0].url)} hint="MP3/M4A up to 12 MB. Use licence-free music or music the couple owns." />
        <Field label="Song title (optional)"><input value={inv.musicTitle || ''} onChange={(e) => set('musicTitle', e.target.value)} maxLength={120} /></Field>
      </div>
      {inv.music && <button type="button" className="link-btn ivx__danger" onClick={() => set('music', '')}>Remove music</button>}
    </div>
  );
}

function GuestsPane({ inv, set, call, password, setPassword, save, toast, dialog }) {
  const api = useContext(EditorApi);
  const [rsvps, setRsvps] = useState(null);
  const [wishes, setWishes] = useState(null);
  const load = useCallback(() => {
    call(api.rsvps(inv._id)).then(setRsvps).catch(() => setRsvps([]));
    call(api.wishes(inv._id)).then(setWishes).catch(() => setWishes([]));
  }, [call, api, inv._id]);
  useEffect(() => { load(); }, [load]);
  const sum = useMemo(() => (rsvps || []).reduce((a, r) => ({ yes: a.yes + (r.attending === 'yes' ? 1 : 0), no: a.no + (r.attending === 'no' ? 1 : 0), maybe: a.maybe + (r.attending === 'maybe' ? 1 : 0), guests: a.guests + (r.attending === 'yes' ? r.guests : 0) }), { yes: 0, no: 0, maybe: 0, guests: 0 }), [rsvps]);
  const csv = async () => {
    const res = await fetch(api.csvUrl(inv._id), { headers: api.headers, credentials: 'same-origin' });
    if (!res.ok) { toast({ type: 'error', title: 'Couldn’t download', message: (await res.json().catch(() => ({}))).error || 'Please try again.' }); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await res.blob()); a.download = `rsvps-${inv.slug}.csv`; a.click();
  };
  const wish = async (w, approved) => { await call(api.wish(w._id), { method: 'PATCH', body: { approved } }); load(); };
  const delWish = async (w) => { if (await dialog.confirm({ title: 'Delete this blessing?', message: `From ${w.name}.`, tone: 'danger', confirmLabel: 'Delete' })) { await call(api.wish(w._id), { method: 'DELETE' }); load(); } };

  return (
    <div className="ivx__pane">
      <h4>Settings</h4>
      <Locked inv={inv} f="rsvp" what="RSVP" />
      <Locked inv={inv} f="wishes" what="Blessings" />
      <label className="ivx__check"><input type="checkbox" checked={inv.rsvpEnabled} onChange={(e) => set('rsvpEnabled', e.target.checked)} /> RSVP form</label>
      <Field label="RSVP by (optional)"><DatePicker value={inv.rsvpDeadline || ''} onChange={(v) => set('rsvpDeadline', v)} ariaLabel="RSVP by" /></Field>
      <label className="ivx__check"><input type="checkbox" checked={inv.wishesEnabled} onChange={(e) => set('wishesEnabled', e.target.checked)} /> Blessings wall (you approve each message)</label>
      <label className="ivx__check"><input type="checkbox" checked={inv.showStudioCta} onChange={(e) => set('showStudioCta', e.target.checked)} /> Small “Explore our photography” link in the footer</label>
      <Locked inv={inv} f="password" what="Password protection" />
      <div className="ivx__row ivx__pw">
        <Field label={inv.hasPassword ? 'Password (set) — enter a new one to change' : 'Password protect (optional)'}><input value={password} onChange={(e) => setPassword(e.target.value)} placeholder={inv.hasPassword ? '••••••' : 'e.g. riya2026'} maxLength={100} /></Field>
        <div className="ivx__btns">
          <button type="button" className="btn btn--ghost btn--sm" disabled={!password} onClick={() => save({ password }).then(() => { setPassword(''); toast({ title: 'Password set', message: 'Guests must enter it to open the invitation.' }); }).catch(() => {})}>Set password</button>
          {inv.hasPassword && <button type="button" className="link-btn" onClick={() => save({ password: '' }).then(() => toast({ title: 'Password removed' })).catch(() => {})}>Remove password</button>}
        </div>
      </div>

      <h4>RSVPs {rsvps && <span className="muted small">· {sum.yes} attending ({sum.guests} guests) · {sum.maybe} maybe · {sum.no} declined</span>}</h4>
      {rsvps?.length > 0 && (featuresOf(inv.package).rsvpExport
        ? <button type="button" className="btn btn--ghost btn--sm" onClick={csv}>Download CSV (Excel)</button>
        : <p className="muted small">RSVP export (CSV for the planner) is part of the Luxury package.</p>)}
      {!rsvps ? <p className="muted">Loading…</p> : rsvps.length === 0 ? <p className="note">No RSVPs yet.</p> : (
        <div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Reply</th><th>Guests</th><th>Events</th><th>Note</th><th>When</th></tr></thead><tbody>
          {rsvps.map((r) => <tr key={r._id}><td><strong>{r.name}</strong>{r.phone && <><br /><small className="muted">{r.phone}</small></>}</td><td>{r.attending}</td><td>{r.attending === 'yes' ? r.guests : '—'}</td><td><small>{(r.events || []).join(', ')}</small></td><td className="table__msg">{r.message}</td><td><small>{fmt(r.createdAt)}</small></td></tr>)}
        </tbody></table></div>
      )}

      <h4>Blessings</h4>
      {!wishes ? <p className="muted">Loading…</p> : wishes.length === 0 ? <p className="note">No blessings yet.</p> : (
        <ul className="ivx__wishes">
          {wishes.map((w) => (
            <li key={w._id} className={w.approved ? 'is-ok' : ''}>
              <p>“{w.message}” <small className="muted">— {w.name}</small></p>
              <span className="ivx__btns">
                {w.approved ? <button className="link-btn" onClick={() => wish(w, false)}>Hide</button> : <button className="link-btn" onClick={() => wish(w, true)}>Approve</button>}
                <button className="link-btn ivx__danger" onClick={() => delWish(w)}>Delete</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- packages ---------------- */
export function InvitePackagesAdmin({ call }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState({});
  const load = useCallback(() => call('/admin/invites/packages').then(setRows), [call]);
  useEffect(() => { load(); }, [load]);
  const save = async (p) => {
    const e = edit[p.code] || {};
    try {
      await call(`/admin/invites/packages/${p.code}`, { method: 'PUT', body: { ...e, features: e.featuresText !== undefined ? e.featuresText.split('\n') : undefined } });
      setEdit((x) => ({ ...x, [p.code]: undefined })); toast({ title: `${p.name} saved` }); load();
    } catch (err) { toast({ title: 'Couldn’t save', message: err.message, type: 'error' }); }
  };
  return (
    <div className="ivx">
      <h2>Invitation packages</h2>
      <p className="muted small">Shown on the Invites landing page. Prices are in rupees.</p>
      {!rows ? <p className="muted">Loading…</p> : (
        <div className="ivx__pkgs">
          {rows.map((p) => {
            const e = edit[p.code] || {};
            const setE = (k, v) => setEdit((x) => ({ ...x, [p.code]: { ...x[p.code], [k]: v } }));
            return (
              <div key={p.code} className="panel ivx__pkg">
                <Field label="Name"><input value={e.name ?? p.name} onChange={(ev) => setE('name', ev.target.value)} /></Field>
                <Field label="Price (₹)"><input inputMode="numeric" value={e.price ?? p.price} onChange={(ev) => setE('price', ev.target.value.replace(/\D/g, ''))} /></Field>
                <Field label="Tagline"><input value={e.tagline ?? p.tagline} onChange={(ev) => setE('tagline', ev.target.value)} /></Field>
                <Field label="Features (one per line)"><textarea rows={6} value={e.featuresText ?? p.features.join('\n')} onChange={(ev) => setE('featuresText', ev.target.value)} /></Field>
                <label className="ivx__check"><input type="checkbox" checked={e.active ?? p.active} onChange={(ev) => setE('active', ev.target.checked)} /> Offered</label>
                <label className="ivx__check"><input type="checkbox" checked={e.highlight ?? p.highlight} onChange={(ev) => setE('highlight', ev.target.checked)} /> Highlight as “Most loved”</label>
                <button className="btn btn--primary btn--sm" disabled={!edit[p.code]} onClick={() => save(p)}>Save</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
