import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { askConfirm } from './confirm.jsx';
import { useValidation } from '../useValidation.jsx';
import { checkEmail, checkPhone, checkUrl, checkSlug, RX } from '../validation.js';

/* Checks for content-editor fields (empty is always allowed unless noted). */
const isLink = (v) => (!v || /^(\/[^\s]*|#[\w-]+|https?:\/\/\S+|tel:\+?\d+|mailto:\S+@\S+)$/.test(String(v).trim()) ? '' : 'Use a page path like /contact or a full https:// link.');
const isFocus = (v) => (!v || /^\d{1,3}% \d{1,3}%$/.test(String(v).trim()) ? '' : 'Use two percentages, e.g. "50% 30%".');
const isSlug = (v) => (!v ? '' : checkSlug(v));
const isPrice = (v) => (!v || /^[\d,]+$/.test(String(v).trim()) ? '' : 'Numbers only, e.g. 9,999.');
const isReel = (v) => {
  const s = String(v || '').trim();
  if (!s) return 'Add the reel link.';
  if (/(youtube\.com\/(shorts\/|watch\?(.*&)?v=|embed\/|live\/)|youtu\.be\/)[\w-]{11}/.test(s)) return ''; // YouTube Shorts / video
  if (/^(https:\/\/(www\.)?instagram\.com\/([\w.]+\/)?(reels?|p|tv)\/)?[A-Za-z0-9_-]{6,40}\/?(\?\S*)?$/.test(s)) return ''; // Instagram
  return 'Paste an Instagram reel link (instagram.com/reel/…) or a YouTube Shorts link (youtube.com/shorts/…).';
};
const CHECKS = {
  link: isLink, link2: isLink, href1: isLink, href2: isLink, pos1: isFocus, pos2: isFocus,
  phone: (v) => (!v ? '' : checkPhone(v)),
  phoneHref: (v) => (!v || RX.telHref.test(String(v).trim()) ? '' : 'Use the format tel:+919205128749.'),
  whatsapp: (v) => (!v || RX.whatsapp.test(String(v).trim()) ? '' : 'Digits only with country code — e.g. 919205128749.'),
  email: (v) => checkEmail(v),
  instagram: (v) => checkUrl(v, { kind: 'instagram' }),
  instagramHandle: (v) => (!v || RX.instagramHandle.test(String(v).trim()) ? '' : 'Start with @ — e.g. @babystepsbyguide.'),
};
/** Attach checks to schema fields by section (same key can mean different things in different sections). */
const withChecks = (sectionId, fields) => fields.map((f) => {
  if (sectionId === 'blog' && f.key === 'slug') return { ...f, check: isSlug };
  if (sectionId === 'sessions' && f.key === 'slug') return { ...f, check: (v) => checkSlug(v, { required: true }) };
  if (sectionId === 'sessions' && f.key === 'from') return { ...f, check: isPrice };
  if (sectionId === 'reels' && f.key === 'id') return { ...f, check: isReel };
  if ((sectionId === 'hero' || sectionId === 'studio') && CHECKS[f.key]) return { ...f, check: CHECKS[f.key] };
  return f;
});
/** First problem in the draft content, as "Section › item: message" — or ''. */
function contentProblem(draft, sections) {
  for (const sec of sections) {
    if (!sec.fields || !draft?.[sec.id]) continue;
    const fields = withChecks(sec.id, sec.fields).filter((f) => f.check);
    const rows = sec.kind === 'list' ? draft[sec.id] : [draft[sec.id]];
    for (let i = 0; i < rows.length; i += 1) {
      for (const f of fields) {
        const msg = f.check(rows[i]?.[f.key]);
        if (msg) return `${sec.label}${sec.kind === 'list' ? ` › ${sec.item} ${i + 1}` : ''} › ${f.label}: ${msg}`;
      }
    }
  }
  return '';
}

const LOGIN_RULES = {
  email: (v) => checkEmail(v, { required: true }),
  password: (v) => (v ? '' : 'Please enter your password.'),
};
import { api } from '../api.js';
import { DEFAULTS, applyContent } from '../content.js';
import { Field, ListEditor } from './fields.jsx';
import GalleryBulkAdd from './GalleryBulkAdd.jsx';
import { Logo } from '../Decor.jsx';
import Galleries from './Galleries.jsx';
import Enquiries from './Enquiries.jsx';
import GiftCardsAdmin from './GiftCardsAdmin.jsx';
import Newsletter from './Newsletter.jsx';
import Backup from './Backup.jsx';
import LoginSecurity from './LoginSecurity.jsx';
import Dashboard from './Dashboard.jsx';

// Sections that manage their own data (saved instantly), not the website content draft.
const CUSTOM = { dashboard: Dashboard, galleries: Galleries, enquiries: Enquiries, giftcards: GiftCardsAdmin, newsletter: Newsletter, backup: Backup, security: LoginSecurity };
import '../admin.css';

const TOKEN_KEY = 'babysteps-admin';
const store = {
  get() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(t) { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};
const clone = (v) => JSON.parse(JSON.stringify(v));

const CATS = [['newborn', 'Newborn'], ['maternity', 'Maternity'], ['milestone', 'Milestones'], ['cake', 'Cake Smash'], ['birthday', 'Pre-Birthday'], ['family', 'Family']];
const PKG = [['maternity', 'Maternity packages'], ['newborn', 'Newborn packages'], ['baby', 'Baby & Milestones packages']];

/* What each section edits. kind: 'object' (one form) | 'list' (repeatable items) | 'packages'. */
const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏡', kind: 'dashboard', intro: 'Today at a glance: new enquiries, galleries that need you and gift cards.' },
  { id: 'enquiries', label: 'Enquiries', icon: '📥', kind: 'enquiries', intro: 'Every booking form submission, saved even if the WhatsApp message is never sent. Track each one from new to booked.' },
  { id: 'newsletter', label: 'Newsletter', icon: '📣', kind: 'newsletter', intro: 'Email your subscribers: offers, new sets and open booking dates. Each email is branded, personal, and has an unsubscribe link.' },
  { id: 'galleries', label: 'Client galleries', icon: '🔒', kind: 'galleries', intro: 'Create private galleries, add photos and films, share logins and manage access. Changes save instantly.' },
  {
    id: 'hero', label: 'Hero banner', icon: '🌅', kind: 'list', item: 'slide',
    intro: 'The banner at the top of the home page: script headline on the left, two captioned photos and a starburst badge on the right. Slides rotate automatically.',
    summary: { title: 'title', image: 'img1', sub: 'kicker' },
    fields: [
      { key: 'kicker', label: 'Small script line', placeholder: 'Anything for your little one' },
      { key: 'title', label: 'Headline (script)', placeholder: 'Tiny Moments' },
      { key: 'text', label: 'Text', type: 'textarea', wide: true, rows: 2 },
      { key: 'cta', label: 'Main button text', placeholder: 'Book a Session' },
      { key: 'link', label: 'Main button link', placeholder: '/contact#book' },
      { key: 'cta2', label: 'Second link text', placeholder: 'View Packages' },
      { key: 'link2', label: 'Second link', placeholder: '/services' },
      { key: 'img1', label: 'Left photo (shorter)', type: 'image', wide: true },
      { key: 'label1', label: 'Left caption', placeholder: 'Newborn Sessions' },
      { key: 'sub1', label: 'Left caption small text', placeholder: 'from ₹9,999' },
      { key: 'href1', label: 'Left photo link', placeholder: '/portfolio/newborn' },
      { key: 'pos1', label: 'Left photo focus', placeholder: '50% 50%' },
      { key: 'img2', label: 'Right photo (taller)', type: 'image', wide: true },
      { key: 'label2', label: 'Right caption', placeholder: 'Maternity Shoots' },
      { key: 'sub2', label: 'Right caption small text', placeholder: 'from ₹5,999' },
      { key: 'href2', label: 'Right photo link', placeholder: '/portfolio/maternity' },
      { key: 'pos2', label: 'Right photo focus', placeholder: '50% 30%', help: '"50% 30%" keeps the upper third in view.' },
      { key: 'badgeTop', label: 'Badge top line', placeholder: 'Starting' },
      { key: 'badgeBig', label: 'Badge big text', placeholder: '₹3,999', help: 'Leave empty to hide the starburst badge.' },
      { key: 'badgeBottom', label: 'Badge bottom line', placeholder: 'only' },
    ],
    makeNew: () => ({ kicker: '', title: '', text: '', cta: 'Book a Session', link: '/contact#book', cta2: 'View Packages', link2: '/services', img1: '', label1: '', sub1: '', href1: '', pos1: '50% 50%', img2: '', label2: '', sub2: '', href2: '', pos2: '50% 30%', badgeTop: '', badgeBig: '', badgeBottom: '' }),
  },
  {
    id: 'blog', label: 'Blog', icon: '📝', kind: 'list', item: 'post',
    intro: 'Articles on /blog (newest first) — the latest three also appear on the home page. Switch “Published” off to keep a draft hidden.',
    summary: { title: 'title', image: 'cover', sub: (p) => `${p.published === false ? 'Draft · ' : ''}${p.category || ''} · ${p.date || ''}` },
    fields: [
      { key: 'ai', type: 'aiwriter' },
      { key: 'title', label: 'Title', wide: true },
      { key: 'slug', label: 'URL name', help: 'Lowercase with dashes. Leave empty to create it from the title.' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'category', label: 'Category', type: 'select', options: ['Newborn', 'Maternity', 'Milestones', 'Parenting', 'Studio'].map((c) => [c, c]) },
      { key: 'author', label: 'Author', placeholder: 'Tanya & Sarthak' },
      { key: 'published', label: 'Status', type: 'bool', on: 'Published' },
      { key: 'cover', label: 'Cover image', type: 'image', wide: true },
      { key: 'excerpt', label: 'Short summary', type: 'textarea', wide: true, rows: 2, help: 'Shown on the blog cards and at the top of the post.' },
      { key: 'body', label: 'Post', type: 'markdown', wide: true },
      { key: 'tags', label: 'Tags', type: 'tags', wide: true },
    ],
    makeNew: () => ({ title: '', slug: '', date: new Date().toISOString().slice(0, 10), category: 'Newborn', author: 'Tanya & Sarthak', published: false, cover: '', excerpt: '', body: '', tags: [] }),
  },
  { id: 'giftcards', label: 'Gift cards', icon: '🎁', kind: 'giftcards', intro: 'Create gift card codes, send them on WhatsApp and mark them redeemed when used. Families can check a code at /gift-cards.' },
  {
    id: 'studio', label: 'Studio details', icon: '🏠', kind: 'object',
    intro: 'Contact details shown in the header, footer, contact page and WhatsApp buttons.',
    fields: [
      { key: 'name', label: 'Studio name' },
      { key: 'parent', label: 'Parent brand' },
      { key: 'phone', label: 'Phone (as shown)', placeholder: '+91 92051 28749' },
      { key: 'phoneHref', label: 'Phone link', placeholder: 'tel:+919205128749' },
      { key: 'whatsapp', label: 'WhatsApp number', help: 'Digits only, with country code — e.g. 919205128749' },
      { key: 'email', label: 'Email' },
      { key: 'instagram', label: 'Instagram URL' },
      { key: 'instagramHandle', label: 'Instagram handle', placeholder: '@babystepsbyguide' },
      { key: 'address', label: 'Address', wide: true },
      { key: 'mapQuery', label: 'Google Maps search', wide: true, help: 'What Google Maps should search for the map and directions links.' },
      { key: 'postalCode', label: 'PIN code', placeholder: '201303' },
      { key: 'geo', label: 'Map pin (latitude, longitude)', placeholder: '28.5670, 77.3420', help: 'Google Maps → right-click the studio → click the numbers to copy them. Helps Google & AI search place the studio.' },
      { key: 'hours', label: 'Opening hours', placeholder: 'Mo-Sa 10:00-18:00', help: 'Format: first day-last day open-close, e.g. Mo-Sa 10:00-18:00' },
    ],
  },
  {
    id: 'images', label: 'Key photos', icon: '🖼️', kind: 'object',
    intro: 'The six signature photos used in the hero cards, session pages, collages and footer. Changing one updates it everywhere it appears.',
    fields: CATS.map(([k, l]) => ({ key: k === 'cake' ? 'cake' : k, label: l, type: 'image' })),
  },
  {
    id: 'sessions', label: 'Sessions', icon: '📸', kind: 'list', item: 'session',
    intro: 'Each session gets its own page at /portfolio/<url name>, and appears in the sessions list, menu and footer.',
    summary: { title: 'title', image: 'img', sub: (s) => `${s.when || ''}${s.from ? ` · from ₹${s.from}` : ''}` },
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'slug', label: 'URL name', help: 'Lowercase, dashes — e.g. cake-smash' },
      { key: 'stage', label: 'Stage label', placeholder: 'First days' },
      { key: 'when', label: 'Best time', placeholder: '5 – 15 days old' },
      { key: 'from', label: 'Starting price (₹)', placeholder: '9,999' },
      { key: 'pkg', label: 'Packages shown on its page', type: 'select', options: PKG },
      { key: 'text', label: 'Description', type: 'textarea', wide: true },
      { key: 'perks', label: 'Included highlights', type: 'tags', wide: true },
      { key: 'img', label: 'Photo', type: 'image', wide: true },
    ],
    makeNew: () => ({ title: '', slug: '', stage: '', when: '', from: '', pkg: 'baby', text: '', perks: [], img: '' }),
  },
  { id: 'packages', label: 'Packages & prices', icon: '💰', kind: 'packages', intro: 'The three pricing tabs. Mark one plan per tab as “Most loved”.' },
  {
    id: 'gallery', label: 'Gallery', icon: '🌸', kind: 'list', item: 'photo',
    intro: 'Photos on the Portfolio page, session pages and the home “Featured work” grid (the first six are featured).',
    summary: { title: (g) => CATS.find(([k]) => k === g.cat)?.[1] || 'No category', image: 'src' },
    fields: [
      { key: 'src', label: 'Photo', type: 'image', wide: true },
      { key: 'cat', label: 'Category', type: 'select', options: CATS },
    ],
    makeNew: () => ({ src: '', cat: 'newborn' }),
  },
  {
    id: 'reels', label: 'Reels', icon: '🎬', kind: 'list', item: 'reel',
    intro: 'Reels in “Stories in motion” — Instagram reels or YouTube Shorts. Paste the link; Instagram reels need a cover image (YouTube covers load automatically).',
    summary: { title: 'title', image: 'cover', sub: (r) => [/youtu/.test(r.id || '') ? 'YouTube' : 'Instagram', r.tag].filter(Boolean).join(' · ') },
    fields: [
      { key: 'id', label: 'Instagram reel or YouTube Shorts link', wide: true, placeholder: 'https://www.instagram.com/reel/…  or  https://youtube.com/shorts/…' },
      { key: 'tag', label: 'Label', placeholder: 'Behind the scenes' },
      { key: 'title', label: 'Title' },
      { key: 'cover', label: 'Cover image (9:16)', type: 'image', wide: true, help: 'Needed for new Instagram reels. YouTube Shorts use their own cover if you leave this empty.' },
    ],
    makeNew: () => ({ id: '', tag: '', title: '', cover: '' }),
  },
  {
    id: 'testimonials', label: 'Reviews', icon: '💬', kind: 'list', item: 'review',
    summary: { title: 'name', sub: 'shoot' },
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'shoot', label: 'Session', placeholder: 'Newborn' },
      { key: 'text', label: 'Review', type: 'textarea', wide: true, rows: 4 },
    ],
    makeNew: () => ({ name: '', shoot: '', text: '' }),
  },
  {
    id: 'faqs', label: 'FAQs', icon: '❓', kind: 'list', item: 'question',
    summary: { title: 'q' },
    fields: [
      { key: 'q', label: 'Question', wide: true },
      { key: 'a', label: 'Answer', type: 'textarea', wide: true, rows: 4 },
    ],
    makeNew: () => ({ q: '', a: '' }),
  },
  {
    id: 'features', label: 'Studio experience', icon: '✨', kind: 'list', item: 'point',
    intro: 'The four points in “Luxury studio, gentle hands”.',
    summary: { title: 'title' },
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'icon', label: 'Icon', type: 'select', options: [['shield', 'Shield'], ['sun', 'Sun'], ['gift', 'Gift'], ['heart', 'Heart'], ['sparkle', 'Sparkle']] },
      { key: 'text', label: 'Text', type: 'textarea', wide: true },
    ],
    makeNew: () => ({ title: '', icon: 'heart', text: '', tint: 'var(--blush)' }),
  },
  {
    id: 'steps', label: 'How it works', icon: '👣', kind: 'list', item: 'step',
    summary: { title: 'title', sub: 'n' },
    fields: [
      { key: 'n', label: 'Number', placeholder: '01' },
      { key: 'title', label: 'Title' },
      { key: 'text', label: 'Text', type: 'textarea', wide: true },
    ],
    makeNew: () => ({ n: '', title: '', text: '' }),
  },
  { id: 'security', label: 'Login security', icon: '🔐', kind: 'security', intro: 'To stop password guessing, admin and client-gallery logins are limited (10 and 20 wrong passwords in 15 minutes). See who is blocked and unlock them. Correct logins never count.' },
  { id: 'backup', label: 'Backup & storage', icon: '💾', kind: 'backup', intro: 'See how much space you use, download backups and restore them.' },
];

/* ---------- Login ---------- */
function Login({ onIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const lv = useValidation(LOGIN_RULES);
  const submit = async (e) => {
    e.preventDefault();
    if (!lv.check({ email, password }, e.currentTarget)) return;
    setBusy(true); setErr('');
    try { const { token } = await api('/admin/login', { method: 'POST', body: { email: email.trim(), password } }); store.set(token); onIn(token); }
    catch (e2) { setErr(e2.status === 429 ? 'Too many attempts — wait a few minutes.' : e2.message); }
    finally { setBusy(false); }
  };
  return (
    <div className="ad-login">
      <form className="ad-login-card" onSubmit={submit} noValidate>
        <Logo className="ad-login-logo" />
        <h1>Studio admin</h1>
        <p>Sign in to manage the BabySteps website and client galleries.</p>
        <label className="ad-field wide"><span className="ad-label">Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required maxLength={160} {...lv.field('email', 'ad-input')} />{lv.error('email')}</label>
        <label className="ad-field wide"><span className="ad-label">Password</span>
          <span className="ad-pw">
            <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck="false" required maxLength={200} {...lv.field('password', 'ad-input')} />
            <button type="button" className="ad-pw-toggle" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'} aria-pressed={showPw} title={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10.4 10.4 0 0112 5c5 0 9 4.5 10 7a12.7 12.7 0 01-3.2 4.3M6.6 6.6C4.4 8 2.8 10.1 2 12c1 2.5 5 7 10 7 1.6 0 3.1-.4 4.4-1.1" /></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
              )}
            </button>
          </span>
          {lv.error('password')}
        </label>
        {err && <p className="ad-error">{err}</p>}
        <button className="ad-btn primary block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <Link className="ad-back" to="/">← Back to website</Link>
      </form>
    </div>
  );
}

/* ---------- Packages editor ---------- */
function PackagesEditor({ value, onChange, token }) {
  const [tab, setTab] = useState('maternity');
  const g = value[tab] || {};
  const setG = (k, v) => onChange({ ...value, [tab]: { ...g, [k]: v } });
  return (
    <>
      <div className="ad-subtabs">{PKG.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l.replace(' packages', '')}</button>)}</div>
      <div className="ad-grid">
        <Field f={{ key: 'label', label: 'Tab name' }} value={g.label} onChange={(v) => setG('label', v)} />
        <Field f={{ key: 'emoji', label: 'Emoji' }} value={g.emoji} onChange={(v) => setG('emoji', v)} />
        <Field f={{ key: 'blurb', label: 'Intro line', wide: true }} value={g.blurb} onChange={(v) => setG('blurb', v)} />
      </div>
      <h4 className="ad-h4">Plans</h4>
      <ListEditor
        token={token} title="plan" items={g.plans || []} onChange={(v) => setG('plans', v)}
        summary={{ title: 'name', sub: (p) => `₹${p.price || '—'}${p.popular ? ' · Most loved' : ''}` }}
        fields={[
          { key: 'name', label: 'Plan name' },
          { key: 'price', label: 'Price (₹)', placeholder: '6,999' },
          { key: 'icon', label: 'Emoji', placeholder: '🌸' },
          { key: 'popular', label: 'Highlight', type: 'bool', on: 'Most loved' },
          { key: 'features', label: 'What’s included', type: 'tags', wide: true },
        ]}
        makeNew={() => ({ name: '', price: '', icon: '', popular: false, features: [] })}
      />
      <h4 className="ad-h4">Add-ons</h4>
      <Field f={{ key: 'addons', type: 'pairs', label: '', labels: ['Add-on', 'Price'], wide: true }} value={g.addons} onChange={(v) => setG('addons', v)} />
    </>
  );
}

/* ---------- Admin ---------- */
export default function Admin() {
  const [token, setToken] = useState(store.get());
  const [saved, setSaved] = useState(null);   // last saved raw content from the server
  const [draft, setDraft] = useState(null);   // working copy (defaults + saved)
  const [section, setSection] = useState('dashboard');
  const [status, setStatus] = useState('');
  const [err, setErr] = useState('');
  const [menu, setMenu] = useState(false);

  useEffect(() => { document.title = 'Admin · BabySteps Guide Studio'; }, []);
  useEffect(() => {
    if (!token) return;
    api('/admin/cms/babysteps', { token })
      .then((data) => { setSaved(data); setDraft({ ...clone(DEFAULTS), ...clone(data) }); })
      .catch((e) => { if (e.status === 401) { store.set(null); setToken(null); } else setErr(e.message); });
  }, [token]);

  const dirty = useMemo(() => draft && saved && JSON.stringify({ ...clone(DEFAULTS), ...saved }) !== JSON.stringify(draft), [draft, saved]);
  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (!token) return <Login onIn={setToken} />;
  if (!draft) return <div className="ad-loading">{err || 'Loading content…'}</div>;

  const sec = SECTIONS.find((s) => s.id === section);
  const set = (v) => setDraft((d) => ({ ...d, [section]: v }));

  const save = async () => {
    const problem = contentProblem(draft, SECTIONS);
    if (problem) { setErr(`Can't save yet — ${problem}`); return; }
    setStatus('Saving…'); setErr('');
    try {
      // Only store sections that differ from the defaults, so untouched sections keep improving with site updates.
      const body = Object.fromEntries(Object.entries(draft).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(DEFAULTS[k])));
      const data = await api('/admin/cms/babysteps', { method: 'PUT', token, body });
      setSaved(data); setDraft({ ...clone(DEFAULTS), ...clone(data) });
      applyContent(data);
      setStatus('Saved ✓ — changes are live');
      setTimeout(() => setStatus(''), 3500);
    } catch (e) {
      if (e.status === 401) { store.set(null); setToken(null); return; }
      setStatus(''); setErr(e.message);
    }
  };
  const go = (id) => { setSection(id); setMenu(false); window.scrollTo(0, 0); };
  const discard = async () => { if (await askConfirm({ title: 'Discard unsaved changes?', message: 'All edits since your last save will be lost.', confirmLabel: 'Discard', danger: true })) setDraft({ ...clone(DEFAULTS), ...clone(saved) }); };
  const resetSection = async () => { if (await askConfirm({ title: `Reset “${sec.label}”?`, message: 'This section goes back to the original website content. Nothing is saved until you click Save.', confirmLabel: 'Reset', danger: true })) set(clone(DEFAULTS[section])); };
  const logout = async () => { if (!dirty || await askConfirm({ title: 'Sign out?', message: 'You have unsaved changes. They will be lost if you sign out.', confirmLabel: 'Sign out anyway', danger: true })) { store.set(null); setToken(null); setDraft(null); } };

  return (
    <div className="ad">
      <aside className={`ad-side ${menu ? 'open' : ''}`}>
        <div className="ad-brand"><Logo className="ad-logo" /><span>Admin</span></div>
        <nav>
          {SECTIONS.map((s) => (
            <button key={s.id} className={s.id === section ? 'on' : ''} onClick={() => go(s.id)}>
              <span aria-hidden="true">{s.icon}</span>{s.label}
              {JSON.stringify(draft[s.id]) !== JSON.stringify({ ...clone(DEFAULTS), ...saved }[s.id]) && <i className="ad-dot" title="Unsaved changes" />}
            </button>
          ))}
        </nav>
        <div className="ad-side-foot">
          <a href="/" target="_blank" rel="noreferrer">View website ↗</a>
          <a href="/client" target="_blank" rel="noreferrer">Client login page ↗</a>
          <p>BabySteps runs on its own server and database.</p>
          <button onClick={logout}>Sign out</button>
        </div>
      </aside>

      {menu && <button type="button" className="ad-backdrop" aria-label="Close menu" onClick={() => setMenu(false)} />}
      <main className="ad-main">
        <header className="ad-top">
          <button className="ad-menu" onClick={() => setMenu((m) => !m)} aria-label="Sections" aria-expanded={menu}>☰</button>
          <div>
            <h1>{sec.icon} {sec.label}</h1>
            {sec.intro && <p>{sec.intro}</p>}
          </div>
          <div className="ad-top-actions">
            {status && <span className="ad-status">{status}</span>}
            {dirty && !status && <span className="ad-status warn">Unsaved changes</span>}
            {!CUSTOM[sec.kind] && <button className="ad-btn ghost" onClick={resetSection}>Reset section</button>}
            {dirty && <button className="ad-btn ghost" onClick={discard}>Discard</button>}
            {(!CUSTOM[sec.kind] || dirty) && <button className="ad-btn primary" onClick={save} disabled={!dirty}>Save changes</button>}
          </div>
        </header>
        {sec.intro && <p className="ad-intro-m">{sec.intro}</p>}
        {err && <p className="ad-error">{err}</p>}

        {CUSTOM[sec.kind] && (() => { const C = CUSTOM[sec.kind]; return <C token={token} go={go} />; })()}
        <section className="ad-panel" hidden={!!CUSTOM[sec.kind]}>
          {sec.kind === 'object' && (
            <div className={`ad-grid ${section === 'images' ? 'images' : ''}`}>
              {withChecks(sec.id, sec.fields).map((f) => <Field key={f.key} f={f} value={draft[section]?.[f.key]} onChange={(v) => set({ ...draft[section], [f.key]: v })} token={token} />)}
            </div>
          )}
          {section === 'gallery' && (
            <GalleryBulkAdd token={token} cats={CATS} onAdd={(srcs, cat) => set([...(draft.gallery || []), ...srcs.map((src) => ({ src, cat }))])} />
          )}
          {sec.kind === 'list' && (
            <ListEditor token={token} title={sec.item} items={draft[section] || []} onChange={set} fields={withChecks(sec.id, sec.fields)} makeNew={sec.makeNew} summary={sec.summary} />
          )}
          {sec.kind === 'packages' && <PackagesEditor value={draft.packages || {}} onChange={set} token={token} />}
        </section>
      </main>
    </div>
  );
}
