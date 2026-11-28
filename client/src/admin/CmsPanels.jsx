import { useCallback, useEffect, useRef, useState } from 'react';
import CollectionEditor from './CollectionEditor.jsx';
import { MediaGrid, MediaPicker, ImageField, ImageListField } from './media.jsx';
import { useToast } from '../components/Toast.jsx';
import { useDialog } from '../components/Dialog.jsx';
import DriveImport from './DriveImport.jsx';

const ytThumb = (id, size = 'hqdefault') => (id ? `https://i.ytimg.com/vi/${id}/${size}.jpg` : '');
const inr = (n) => (n == null ? 'On request' : `₹${Number(n).toLocaleString('en-IN')}`);

/* ---------------- Collection configs ---------------- */

export const FILMS = {
  key: 'films', viewUrl: () => '/films', title: 'Wedding films', singular: 'film', publishField: 'published',
  description: 'Long-form YouTube films. The first live film is the banner on the Home page and Films page.',
  itemTitle: (r) => r.title, itemSub: (r) => [r.subtitle, r.youtubeId].filter(Boolean).join(' · '),
  thumb: (r) => r.poster || ytThumb(r.youtubeId),
  defaults: { published: true, previewStart: 30, previewLength: 40 },
  fields: [
    { name: 'youtube', label: 'YouTube link or video ID', type: 'youtube', required: true, from: (r) => (r.youtubeId ? `https://youtu.be/${r.youtubeId}` : ''), placeholder: 'https://youtu.be/…' },
    { name: 'title', label: 'Title (couple / event)', type: 'text', required: true },
    { name: 'subtitle', label: 'Venue / subtitle', type: 'text' },
    { name: 'blurb', label: 'Short description', type: 'textarea' },
    { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'Destination wedding, Jaipur, 2025, 4K', hint: 'Comma separated. The last tag is highlighted in red.' },
    { name: 'poster', label: 'Poster image', type: 'image', hint: 'Leave empty to use the YouTube thumbnail.' },
    { name: 'previewStart', label: 'Background preview starts at (seconds)', type: 'number' },
    { name: 'previewLength', label: 'Preview length (seconds)', type: 'number' },
    { name: 'published', label: 'Show on website', type: 'checkbox', default: true },
  ],
};

export const REELS = {
  key: 'reels', viewUrl: () => '/films', title: 'Reels (YouTube & Instagram)', singular: 'reel', publishField: 'published',
  description: 'Vertical reels in the “Stories in motion” carousel. Paste a YouTube Shorts link (cover fetched automatically) or an Instagram reel link (add a cover).',
  itemTitle: (r) => r.title, itemSub: (r) => [r.platform === 'instagram' ? 'Instagram' : 'YouTube', r.tag].filter(Boolean).join(' · '),
  thumb: (r) => r.thumbnail || (r.youtubeId ? ytThumb(r.youtubeId, 'oar2') : ''),
  defaults: { published: true },
  fields: [
    { name: 'link', label: 'YouTube Shorts or Instagram reel link', type: 'reel', required: true, from: (r) => (r.platform === 'instagram' && r.instagramId ? `https://www.instagram.com/reel/${r.instagramId}/` : r.youtubeId ? `https://www.youtube.com/shorts/${r.youtubeId}` : ''), placeholder: 'https://www.youtube.com/shorts/…  or  https://www.instagram.com/reel/…' },
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'tag', label: 'Label', type: 'text', placeholder: 'Bride, Engagement, Maternity…' },
    { name: 'thumbnail', label: 'Cover (vertical)', type: 'image', hint: 'YouTube: fetched automatically — replace it to use your own. Instagram: required (Instagram doesn’t share covers).' },
    { name: 'published', label: 'Show on website', type: 'checkbox', default: true },
  ],
};

export const MUSIC = {
  key: 'music', viewUrl: () => '/invites', title: 'Music library', singular: 'track', publishField: 'published',
  description: 'Songs offered for digital invitations. Live tracks appear in the invitation editor (Admin and the couple’s account) under Photos & music → Music, ready to pick with one click. Use licence-free music or music you have the rights to.',
  itemTitle: (r) => r.title, itemSub: (r) => [r.artist, r.mood].filter(Boolean).join(' · ') || 'Music',
  defaults: { published: true },
  fields: [
    { name: 'url', label: 'Audio file', type: 'audio', required: true, hint: 'MP3 or M4A, up to 12 MB. A 1–3 minute loop works best — it repeats while guests read.' },
    { name: 'title', label: 'Track title', type: 'text', required: true },
    { name: 'artist', label: 'Artist / composer', type: 'text' },
    { name: 'mood', label: 'Mood', type: 'select', options: [{ value: '', label: 'Any' }, ...['Romantic', 'Shehnai', 'Instrumental', 'Festive', 'Sufi', 'Classical', 'Modern', 'Calm'].map((m) => ({ value: m, label: m }))] },
    { name: 'published', label: 'Offer in the invitation editor', type: 'checkbox', default: true },
  ],
};

export const PACKAGES = {
  key: 'packages', viewUrl: () => '/services', title: 'Packages & pricing', singular: 'package', publishField: 'published', defaults: { published: true },
  itemTitle: (r) => r.title, itemSub: (r) => `${inr(r.startingPrice)}${r.unit ? ` ${r.unit}` : ''}${r.highlight ? ' · Most booked' : ''}`,
  fields: [
    { name: 'title', label: 'Package name', type: 'text', required: true },
    { name: 'startingPrice', label: 'Starting price (₹)', type: 'number', nullable: true, hint: 'Leave empty to show “On request”.' },
    { name: 'unit', label: 'Price unit', type: 'text', placeholder: 'per day' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'includes', label: 'What’s included', type: 'list' },
    { name: 'category', label: 'Portfolio category slug', type: 'text', placeholder: 'wedding' },
    { name: 'highlight', label: 'Highlight as “Most booked”', type: 'checkbox' },
  ],
};

export const FAQS = {
  key: 'faqs', viewUrl: () => '/services', title: 'FAQs', singular: 'question',
  itemTitle: (r) => r.question, itemSub: (r) => `${(r.answer || '').slice(0, 90)}…`,
  fields: [
    { name: 'question', label: 'Question', type: 'text', required: true },
    { name: 'answer', label: 'Answer', type: 'textarea', required: true },
  ],
};

export const JOBS = {
  key: 'jobs', viewUrl: () => '/careers', title: 'Careers · open roles', singular: 'role', publishField: 'open',
  itemTitle: (r) => r.title, itemSub: (r) => `${r.location}${r.open ? '' : ' · closed'}`,
  defaults: { open: true, icon: 'camera', location: 'Noida studio' },
  fields: [
    { name: 'title', label: 'Role title', type: 'text', required: true },
    { name: 'icon', label: 'Icon', type: 'select', options: [{ value: 'video', label: 'Video / clapper' }, { value: 'photo', label: 'Photo' }, { value: 'megaphone', label: 'Megaphone' }, { value: 'camera', label: 'Camera' }] },
    { name: 'location', label: 'Location / type', type: 'text', placeholder: 'Noida studio · Full-time' },
    { name: 'summary', label: 'Summary', type: 'textarea' },
    { name: 'duties', label: 'What you’ll do', type: 'list' },
    { name: 'skills', label: 'Skills (tags)', type: 'list' },
    { name: 'open', label: 'Accepting applications', type: 'checkbox', default: true },
  ],
};

export const TESTIMONIALS = {
  key: 'testimonials', viewUrl: () => '/', title: 'Testimonials', singular: 'testimonial', publishField: 'published',
  description: 'Only add real client reviews, with their permission.',
  itemTitle: (r) => r.name, itemSub: (r) => [r.event, `“${(r.quote || '').slice(0, 60)}…”`].filter(Boolean).join(' · '),
  thumb: (r) => r.photo,
  defaults: { published: true, rating: 5 },
  fields: [
    { name: 'name', label: 'Client name', type: 'text', required: true },
    { name: 'event', label: 'Event', type: 'text', placeholder: 'Wedding · Jaipur, 2025' },
    { name: 'quote', label: 'Quote', type: 'textarea', required: true },
    { name: 'photo', label: 'Photo', type: 'image' },
    { name: 'published', label: 'Show on website', type: 'checkbox', default: true },
  ],
};

export const BLOG_CATEGORIES = ['Weddings', 'Pre-Wedding', 'Planning tips', 'Films', 'Portraits', 'Corporate', 'Studio'];
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export const BLOG = {
  key: 'blog', viewUrl: (r) => (r?.slug ? `/blog/${r.slug}` : '/blog'), title: 'Blog', singular: 'post', publishField: 'published',
  description: 'Articles on /blog, newest first. The latest three also appear on the Home page. New posts start hidden: switch them Live when ready.',
  noReorder: true, orderNote: 'Posts are listed newest first, by their date.',
  itemTitle: (r) => r.title, itemSub: (r) => [r.published ? null : 'Draft', r.category, fmtDay(r.date)].filter(Boolean).join(' · '),
  thumb: (r) => r.cover,
  defaults: { published: false, category: 'Weddings', author: 'Sandeep & Sarthak Chopra' },
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'How to plan your wedding day timeline for photos' },
    { name: 'slug', label: 'URL name', type: 'text', placeholder: 'wedding-day-timeline-for-photos', hint: 'Lowercase with dashes, e.g. /blog/wedding-day-timeline. Leave empty to make it from the title. Changing it later breaks old links.' },
    { name: 'date', label: 'Date', type: 'date', default: 'today' },
    { name: 'category', label: 'Category', type: 'select', options: BLOG_CATEGORIES.map((c) => ({ value: c, label: c })) },
    { name: 'author', label: 'Author', type: 'text', placeholder: 'Sandeep & Sarthak Chopra' },
    { name: 'cover', label: 'Cover image', type: 'image', hint: 'Shown on the blog card, at the top of the post and when the link is shared.' },
    { name: 'excerpt', label: 'Short summary', type: 'textarea', hint: 'One or two sentences. Shown on blog cards, at the top of the post and in Google results.' },
    { name: 'body', label: 'Post', type: 'markdown', rows: 18 },
    { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'Noida wedding, candid photography, planning' },
    { name: 'published', label: 'Show on website (Live)', type: 'checkbox' },
  ],
};

export const AWARDS = {
  key: 'awards', viewUrl: () => '/about', title: 'Awards & recognition', singular: 'award', publishField: 'published',
  description: 'Awards, honours and press features. The section appears on the Home and Our Studio pages once at least one is live.',
  itemTitle: (r) => r.title, itemSub: (r) => [r.category, r.org, r.year].filter(Boolean).join(' · '),
  thumb: (r) => r.image,
  defaults: { published: true },
  fields: [
    { name: 'title', label: 'Award / honour', type: 'text', required: true, placeholder: 'Best Wedding Photographer' },
    { name: 'org', label: 'Awarded by', type: 'text', placeholder: 'Organisation, magazine or event' },
    { name: 'year', label: 'Year', type: 'text', placeholder: '2025' },
    { name: 'category', label: 'Label', type: 'text', placeholder: 'Winner, Finalist, Featured…' },
    { name: 'note', label: 'Short note (optional)', type: 'textarea', hint: 'One line, e.g. the category or what the work was.' },
    { name: 'image', label: 'Badge, logo or trophy photo', type: 'image', hint: 'Shown inside the laurel. A square image works best. Leave empty for a trophy icon.' },
    { name: 'link', label: 'Link (optional)', type: 'text', placeholder: 'https://… certificate, article or announcement' },
    { name: 'published', label: 'Show on website', type: 'checkbox', default: true },
  ],
};

/* ---------------- Portfolio: categories + their photos ---------------- */

function CategoryPhotos({ category, call, token, onChanged }) {
  const [cat, setCat] = useState(null);
  const [picker, setPicker] = useState(false);
  const dragFrom = useRef(null);
  const toast = useToast();
  const dialog = useDialog();
  const view = { label: 'View on website', href: `/portfolio/${category.slug}` };
  const load = useCallback(() => call(`/admin/cms/categories/${category._id}`).then(setCat), [call, category._id]);
  useEffect(() => { load(); }, [load]);

  const done = (c) => { setCat(c); onChanged?.(); };
  const add = async (urls) => {
    done(await call(`/admin/cms/categories/${category._id}/images`, { method: 'POST', body: { images: urls.map((src) => ({ src })) } }));
    toast({ title: `${urls.length} photo${urls.length === 1 ? '' : 's'} added to ${category.title}`, message: 'They appear at the end of the gallery. Drag to reorder.', action: view });
  };
  const patch = async (img, body, note) => {
    done(await call(`/admin/cms/categories/${category._id}/images/${img._id}`, { method: 'PATCH', body }));
    if (note) toast(note);
  };
  const del = async (img) => {
    const ok = await dialog.confirm({
      title: `Remove from ${category.title}?`, message: 'The photo stays in your media library, so you can add it back any time.',
      tone: 'danger', images: [img.src], confirmLabel: 'Remove photo',
    });
    if (!ok) return;
    done(await call(`/admin/cms/categories/${category._id}/images/${img._id}`, { method: 'DELETE' }));
    toast({ title: 'Photo removed', message: `Removed from ${category.title}. It’s still in the media library.` });
  };
  const reorder = async (from, to) => {
    if (from == null || from === to) return;
    const next = [...cat.images];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setCat({ ...cat, images: next });
    done(await call(`/admin/cms/categories/${category._id}/images/order`, { method: 'PUT', body: { ids: next.map((i) => i._id) } }));
    toast({ type: 'info', title: 'Photo order updated', duration: 2500 });
  };

  if (!cat) return <p className="muted">Loading photos…</p>;
  return (
    <div className="catphotos">
      <div className="imglist__head">
        <span className="imgfield__label">Photos in this category ({cat.images.length})</span>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setPicker(true)}>+ Add photos</button>
      </div>
      <p className="muted small">Drag to reorder. ★ = featured (also shown in “Recent favourites” on the Home page).</p>
      <DriveImport call={call} compact saveToLibrary onAdd={add} />
      <div className="catphotos__grid">
        {cat.images.map((img, i) => (
          <div
            key={img._id}
            className={`catphotos__item ${img.featured ? 'is-featured' : ''}`}
            draggable
            onDragStart={() => { dragFrom.current = i; }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { reorder(dragFrom.current, i); dragFrom.current = null; }}
          >
            <img src={img.src} alt={img.alt || ''} loading="lazy" />
            <div className="catphotos__ctl">
              <button type="button" title={img.featured ? 'Unfeature' : 'Feature'} onClick={() => patch(img, { featured: !img.featured }, { type: img.featured ? 'info' : 'success', title: img.featured ? 'Removed from featured' : 'Photo featured ★', message: img.featured ? undefined : 'It now also appears in “Recent favourites” on the Home page.', action: img.featured ? undefined : { label: 'View on website', href: '/' } })}>{img.featured ? '★' : '☆'}</button>
              <button type="button" title="Use as cover" onClick={async () => { await call(`/admin/cms/categories/${category._id}`, { method: 'PATCH', body: { cover: img.src } }); onChanged?.(); toast({ title: 'Cover photo updated', message: `New cover for ${category.title}.`, action: { label: 'View on website', href: '/portfolio' } }); }}>Cover</button>
              <button type="button" title="Alt text" onClick={async () => { const a = await dialog.prompt({ title: 'Alt text', message: 'Describe the photo in a few words.', defaultValue: img.alt || '', images: [img.src], confirmLabel: 'Save alt text' }); if (a != null) patch(img, { alt: a }, { title: 'Alt text saved', duration: 2500 }); }}>Alt</button>
              <button type="button" title="Remove" onClick={() => del(img)}>✕</button>
            </div>
          </div>
        ))}
      </div>
      {picker && <MediaPicker call={call} token={token} multiple onClose={() => setPicker(false)} onPick={(urls) => { add(urls); setPicker(false); }} />}
    </div>
  );
}

export const CATEGORIES = {
  key: 'categories', viewUrl: (r) => `/portfolio/${r.slug}`, title: 'Portfolio', singular: 'category', publishField: 'published', defaults: { published: true },
  description: 'Collections on the Portfolio page. Open a category to manage its photos.',
  itemTitle: (r) => r.title, itemSub: (r) => `/${r.slug} · ${r.imageCount ?? r.images?.length ?? 0} photos`,
  thumb: (r) => r.cover,
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'slug', label: 'URL slug', type: 'text', placeholder: 'auto from title', hint: 'Used in the address: /portfolio/<slug>' },
    { name: 'tagline', label: 'Tagline', type: 'text' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'cover', label: 'Cover photo', type: 'image' },
  ],
  renderExtra: (row, h) => <CategoryPhotos key={row._id} category={row} call={h.call} token={h.token} onChanged={() => { h.reload(); h.onChanged?.(); }} />,
};

/* ---------------- Site settings ---------------- */

function Section({ title, children, desc }) {
  return (
    <fieldset className="settings__section">
      <legend>{title}</legend>
      {desc && <p className="muted small">{desc}</p>}
      {children}
    </fieldset>
  );
}

export function SettingsEditor({ call, token }) {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  useEffect(() => { call('/admin/cms/settings').then(setS); }, [call]);
  if (!s) return <p className="muted">Loading…</p>;

  const set = (path) => (e) => {
    const v = e?.target ? e.target.value : e;
    setS((prev) => {
      const next = structuredClone(prev);
      const keys = path.split('.');
      let o = next;
      keys.slice(0, -1).forEach((k) => { o[k] = o[k] ?? {}; o = o[k]; });
      o[keys.at(-1)] = v;
      return next;
    });
  };
  const text = (path, label, opts = {}) => {
    const v = path.split('.').reduce((o, k) => o?.[k], s) ?? '';
    return (
      <label key={path}>
        <span>{label}</span>
        {opts.area ? <textarea rows={3} value={v} onChange={set(path)} /> : <input value={v} onChange={set(path)} placeholder={opts.placeholder} />}
        {opts.hint && <small className="muted">{opts.hint}</small>}
      </label>
    );
  };

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      setS(await call('/admin/cms/settings', { method: 'PUT', body: s }));
      setMsg('');
      toast({ title: 'Settings saved successfully!', message: 'Your changes are live. Refresh the website to see them.', action: { label: 'View website', href: '/' } });
    } catch (err) {
      setMsg(err.message);
      toast({ type: 'error', title: 'Couldn’t save settings', message: err.message });
    } finally {
      setSaving(false);
    }
  }

  const team = s.team || [];
  const setTeam = (next) => setS((p) => ({ ...p, team: next }));

  return (
    <form className="form settings" onSubmit={save}>
      <div className="admin__bar">
        <div><h2>Site settings</h2><p className="muted small">Studio details, contact links and the photos used across the site.</p></div>
        <button className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save all settings'}</button>
      </div>
      {msg && <p className="note note--error">{msg}</p>}

      <Section title="Studio">
        <div className="form__row">{text('name', 'Studio name')}{text('tagline', 'Tagline')}</div>
        {text('location', 'Service area')}
      </Section>

      <Section title="Contact">
        <div className="form__row">{text('phone', 'Phone (display)', { placeholder: '+91 92051 28749' })}{text('phoneRaw', 'Phone (for calling)', { placeholder: '+919205128749' })}</div>
        <div className="form__row">{text('whatsapp', 'WhatsApp number', { placeholder: '919205128749', hint: 'Country code + number, digits only.' })}{text('email', 'Email')}</div>
        {text('hours', 'Opening hours')}
        {text('address', 'Address', { area: true })}
        {text('mapQuery', 'Google Maps search', { hint: 'What to search on the map embed.' })}
      </Section>

      <Section title="Social links">
        <div className="form__row">{text('social.instagram', 'Instagram URL')}{text('social.youtube', 'YouTube URL')}</div>
        {text('social.facebook', 'Facebook URL')}
      </Section>

      <Section title="Home hero" desc="The big headline on the Home page.">
        {text('hero.eyebrow', 'Small line above the headline')}
        <div className="form__row">{text('hero.title', 'Headline (line 1)')}{text('hero.titleAccent', 'Highlighted word', { hint: 'Separate several words with commas to rotate through them.' })}</div>
        {text('hero.titleRest', 'Headline (after the highlighted word)', { hint: 'Starting with a comma puts the rest on a new line.' })}
        {text('hero.lead', 'Intro paragraph', { area: true })}
        {text('hero.leadMobile', 'Short intro for phones')}
        <ImageListField label="Hero slideshow photos" value={s.heroSlides || []} withAlt onChange={set('heroSlides')} call={call} token={token} />
      </Section>

      <Section title="Team" desc="Shown on the Home and Our Studio pages.">
        {team.map((m, i) => (
          <div key={i} className="settings__member">
            <ImageField label="Photo" value={m.photo} onChange={(v) => setTeam(team.map((x, k) => (k === i ? { ...x, photo: v } : x)))} call={call} token={token} />
            <div className="form__row">
              <label><span>Name</span><input value={m.name || ''} onChange={(e) => setTeam(team.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} /></label>
              <label><span>Role</span><input value={m.role || ''} onChange={(e) => setTeam(team.map((x, k) => (k === i ? { ...x, role: e.target.value } : x)))} /></label>
            </div>
            <label><span>Bio</span><textarea rows={2} value={m.bio || ''} onChange={(e) => setTeam(team.map((x, k) => (k === i ? { ...x, bio: e.target.value } : x)))} /></label>
            <button type="button" className="link-btn" onClick={() => setTeam(team.filter((_, k) => k !== i))}>Remove member</button>
          </div>
        ))}
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setTeam([...team, { name: '', role: '', bio: '', photo: '' }])}>+ Add team member</button>
      </Section>

      <Section title="Our Studio photos">
        <ImageListField label="Studio interior photos" value={s.studioPhotos || []} onChange={set('studioPhotos')} call={call} token={token} />
      </Section>

      <Section title="Footer" desc="The booking headline and Instagram photo strip at the bottom of every page.">
        {text('footer.eyebrow', 'Small line above the headline', { placeholder: `Now booking ${new Date().getFullYear()}–${String(new Date().getFullYear() + 1).slice(2)} weddings`, hint: 'Leave empty to show the current booking years automatically.' })}
        <div className="form__row">{text('footer.title', 'Headline (start)', { placeholder: 'Let’s tell' })}{text('footer.titleAccent', 'Red italic words', { placeholder: 'your story' })}</div>
        {text('footer.titleRest', 'Headline (end)', { placeholder: ', beautifully.' })}
        {text('footer.instagramLabel', 'Label on the photo strip', { placeholder: '@guidephotostudio', hint: 'Leave empty to use your Instagram handle. The strip links to the Instagram URL above.' })}
        <ImageListField label="Photo strip (up to 6 — remove all to hide the strip)" value={s.footer?.strip || []} onChange={set('footer.strip')} call={call} token={token} />
      </Section>

      <Section title="Menu promo card" desc="The highlighted card in the phone menu.">
        <div className="form__row">{text('promo.label', 'Small label')}{text('promo.text', 'Main text')}</div>
        <ImageField label="Image" value={s.promo?.image} onChange={set('promo.image')} call={call} token={token} />
      </Section>

      <div className="settings__save">
        <button className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save all settings'}</button>
      </div>
    </form>
  );
}

/* ---------------- Media library page ---------------- */

export function MediaLibrary({ call, token }) {
  return (
    <div>
      <div className="admin__bar">
        <div><h2>Media library</h2><p className="muted small">Upload photos once, then pick them anywhere in the CMS. Click a photo to copy its link.</p></div>
      </div>
      <MediaGrid call={call} token={token} manage />
    </div>
  );
}

export function Collection({ config, call, token }) {
  return <CollectionEditor config={config} call={call} token={token} />;
}
