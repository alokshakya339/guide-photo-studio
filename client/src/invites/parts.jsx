/* Building blocks shared by every invitation theme. Themes decide layout + look; these handle the behaviour. */
import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

export const fmtDate = (d, opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) =>
  (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', opts) : '');
export const initials = (inv) => `${(inv.partner1 || '?')[0]}${(inv.partner2 || '?')[0]}`.toUpperCase();
const ymd = (d) => d.replace(/-/g, '');
const nextDay = (d) => { const x = new Date(`${d}T00:00:00`); x.setDate(x.getDate() + 1); return x.toISOString().slice(0, 10).replace(/-/g, ''); };
export const mapLink = (e) => e.mapUrl || (e.address || e.venue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([e.venue, e.address].filter(Boolean).join(', '))}` : '');

/** Reveal-on-scroll for elements with [data-inv-reveal] inside the invitation. */
export function useInviteReveal(dep) {
  useEffect(() => {
    const els = [...document.querySelectorAll('[data-inv-reveal]:not([data-in])')];
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { els.forEach((e) => e.setAttribute('data-in', '')); return undefined; }
    const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { e.target.setAttribute('data-in', ''); io.unobserve(e.target); } }), { threshold: 0.12 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [dep]);
}

/** Days / hours / minutes / seconds until the wedding. */
export function Countdown({ date, labels = ['Days', 'Hours', 'Minutes', 'Seconds'] }) {
  const target = date ? new Date(`${date}T00:00:00`).getTime() : 0;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!target) return null;
  const diff = Math.max(0, target - now);
  if (!diff) return <p className="inv-count__done">Today is the day ✨</p>;
  const parts = [Math.floor(diff / 864e5), Math.floor(diff / 36e5) % 24, Math.floor(diff / 6e4) % 60, Math.floor(diff / 1e3) % 60];
  return (
    <div className="inv-count" role="timer" aria-label="Countdown to the wedding">
      {parts.map((n, i) => (
        <div key={labels[i]} className="inv-count__cell"><b key={n}>{String(n).padStart(2, '0')}</b><span>{labels[i]}</span></div>
      ))}
    </div>
  );
}

/** Add-to-calendar: Google link + downloadable .ics (works on iPhone / Outlook). */
export function CalendarButtons({ inv, event }) {
  if (!event.date) return null;
  const title = `${event.name} · ${inv.partner1} & ${inv.partner2}`;
  const where = [event.venue, event.address].filter(Boolean).join(', ');
  const details = [event.time && `Time: ${event.time}`, event.dressCode && `Dress code: ${event.dressCode}`, `Invitation: ${window.location.href.split('?')[0]}`].filter(Boolean).join('\n');
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${ymd(event.date)}/${nextDay(event.date)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(where)}`;
  const ics = () => {
    const esc = (s) => String(s).replace(/[,;\\]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Guide Studio//Invites//EN', 'BEGIN:VEVENT', `UID:${ymd(event.date)}-${encodeURIComponent(event.name)}@guidephotostudio`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART;VALUE=DATE:${ymd(event.date)}`, `DTEND;VALUE=DATE:${nextDay(event.date)}`, `SUMMARY:${esc(title)}`, `LOCATION:${esc(where)}`, `DESCRIPTION:${esc(details)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
    a.download = `${event.name.replace(/\W+/g, '-').toLowerCase()}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <span className="inv-cal">
      <a href={google} target="_blank" rel="noreferrer">Google Calendar</a>
      <button type="button" onClick={ics}>Apple / Outlook</button>
    </span>
  );
}

/** Floating music toggle. Starts only after the guest opens the invitation (browsers block autoplay). */
export function MusicToggle({ src, title, playing, setPlaying }) {
  const audio = useRef(null);
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    if (playing) a.play().catch(() => setPlaying(false)); else a.pause();
  }, [playing, setPlaying]);
  if (!src) return null;
  return (
    <>
      <audio ref={audio} src={src} loop preload="none" />
      <button type="button" className={`inv-music ${playing ? 'is-on' : ''}`} onClick={() => setPlaying((p) => !p)} aria-pressed={playing} aria-label={playing ? 'Pause music' : 'Play music'} title={title || 'Music'}>
        <span className="inv-music__bars" aria-hidden="true"><i /><i /><i /><i /></span>
        <span className="inv-music__label">{playing ? 'Music on' : 'Play music'}</span>
      </button>
    </>
  );
}

/** Gallery grid with a simple lightbox. */
export function Gallery({ photos }) {
  const [open, setOpen] = useState(-1);
  useEffect(() => {
    if (open < 0) return undefined;
    const k = (e) => { if (e.key === 'Escape') setOpen(-1); if (e.key === 'ArrowRight') setOpen((i) => (i + 1) % photos.length); if (e.key === 'ArrowLeft') setOpen((i) => (i - 1 + photos.length) % photos.length); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, photos.length]);
  if (!photos?.length) return null;
  return (
    <>
      <div className="inv-gallery">
        {photos.map((src, i) => (
          <button key={src} type="button" className="inv-gallery__item" onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1}`}>
            <img src={src} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      {open >= 0 && (
        <div className="inv-lightbox" role="dialog" aria-modal="true" onClick={() => setOpen(-1)}>
          <img src={photos[open]} alt="" onClick={(e) => e.stopPropagation()} />
          <button type="button" className="inv-lightbox__close" onClick={() => setOpen(-1)} aria-label="Close">×</button>
          {photos.length > 1 && <>
            <button type="button" className="inv-lightbox__nav is-prev" onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + photos.length) % photos.length); }} aria-label="Previous">‹</button>
            <button type="button" className="inv-lightbox__nav is-next" onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % photos.length); }} aria-label="Next">›</button>
          </>}
        </div>
      )}
    </>
  );
}

/** YouTube film, loads only when tapped. */
export function Film({ id, poster }) {
  const [play, setPlay] = useState(false);
  if (!id) return null;
  return (
    <div className="inv-film">
      {play ? (
        <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title="Our film" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      ) : (
        <button type="button" onClick={() => setPlay(true)} aria-label="Play our film">
          <img src={poster || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
          <span className="inv-film__play">▶</span>
        </button>
      )}
    </div>
  );
}

const NAME_RX = /^[\p{L}\p{M}][\p{L}\p{M} .'’&-]*$/u;
const PHONE_OK = (v) => { const p = String(v || '').replace(/[\s().-]/g, ''); return !p || /^(?:\+?91|0)?[6-9]\d{9}$/.test(p) || /^\+(?!91)[1-9]\d{7,14}$/.test(p); };

/** Guest RSVP form. */
export function Rsvp({ inv, slug, token, preview }) {
  const [f, setF] = useState({ name: '', phone: '', attending: '', guests: 1, events: inv.events.map((e) => e.name), message: '', marketingConsent: false });
  const [errs, setErrs] = useState({});
  const [state, setState] = useState('idle');
  const [err, setErr] = useState('');
  const closed = inv.rsvpDeadline && new Date(`${inv.rsvpDeadline}T23:59:59`) < new Date();
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErrs((x) => ({ ...x, [k]: '' })); };
  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.name.trim().length < 2 || !NAME_RX.test(f.name.trim())) er.name = 'Please enter your name.';
    if (!PHONE_OK(f.phone)) er.phone = 'Please enter a valid mobile number.';
    if (!f.attending) er.attending = 'Please choose an option.';
    setErrs(er);
    if (Object.keys(er).length) return;
    setState('sending'); setErr('');
    try {
      await api(`/invites/${slug}/rsvp${preview ? `?preview=${preview}` : ''}`, { method: 'POST', body: f, headers: token ? { 'x-invite-token': token } : undefined });
      setState('sent');
    } catch (e2) { setErr(e2.message); setErrs(e2.data?.fields || {}); setState('idle'); }
  };
  if (!inv.rsvpEnabled) return null;
  if (inv.preview && inv.status !== 'published') return <p className="inv-note">This is a preview. Guests can RSVP here once the invitation is published.</p>;
  if (closed) return <p className="inv-note">RSVPs closed on {fmtDate(inv.rsvpDeadline, { day: 'numeric', month: 'long' })}. Please contact the family directly.</p>;
  if (state === 'sent') {
    return (
      <div className="inv-rsvp__done" role="status">
        <b>{f.attending === 'no' ? 'Thank you for letting us know' : 'Thank you! We can’t wait to celebrate with you'}</b>
        <span>{f.attending === 'no' ? 'You’ll be missed — your blessings mean the world.' : `We’ve noted ${f.guests} ${f.guests > 1 ? 'guests' : 'guest'}.`}</span>
      </div>
    );
  }
  return (
    <form className="inv-rsvp" onSubmit={submit} noValidate>
      <div className="inv-rsvp__row">
        <label><span>Your name</span><input value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={80} autoComplete="name" aria-invalid={errs.name ? true : undefined} />{errs.name && <small>{errs.name}</small>}</label>
        <label><span>Mobile (optional)</span><input value={f.phone} onChange={(e) => set('phone', e.target.value.replace(/[^\d+\s()-]/g, ''))} inputMode="tel" maxLength={18} autoComplete="tel" aria-invalid={errs.phone ? true : undefined} />{errs.phone && <small>{errs.phone}</small>}</label>
      </div>
      <fieldset className="inv-rsvp__choice">
        <legend>Will you join us?</legend>
        {[['yes', 'Joyfully accept'], ['maybe', 'Not sure yet'], ['no', 'Regretfully decline']].map(([v, l]) => (
          <button key={v} type="button" className={f.attending === v ? 'is-on' : ''} aria-pressed={f.attending === v} onClick={() => set('attending', v)}>{l}</button>
        ))}
        {errs.attending && <small>{errs.attending}</small>}
      </fieldset>
      {f.attending !== 'no' && (
        <>
          <label className="inv-rsvp__guests"><span>Number of guests (including you)</span>
            <span className="inv-step">
              <button type="button" onClick={() => set('guests', Math.max(1, f.guests - 1))} aria-label="Fewer guests">−</button>
              <b>{f.guests}</b>
              <button type="button" onClick={() => set('guests', Math.min(20, f.guests + 1))} aria-label="More guests">+</button>
            </span>
          </label>
          {inv.events.length > 1 && (
            <fieldset className="inv-rsvp__events">
              <legend>Which functions will you attend?</legend>
              {inv.events.map((ev) => (
                <label key={ev.name} className="inv-check"><input type="checkbox" checked={f.events.includes(ev.name)} onChange={(e) => set('events', e.target.checked ? [...f.events, ev.name] : f.events.filter((x) => x !== ev.name))} /> {ev.name}</label>
              ))}
            </fieldset>
          )}
        </>
      )}
      <label><span>A note for the couple (optional)</span><textarea rows={3} value={f.message} onChange={(e) => set('message', e.target.value)} maxLength={600} /></label>
      <label className="inv-check inv-check--small"><input type="checkbox" checked={f.marketingConsent} onChange={(e) => set('marketingConsent', e.target.checked)} /> Guide Studio may contact me about their photography services (optional)</label>
      {err && <p className="inv-err" role="alert">{err}</p>}
      <button className="inv-btn" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send RSVP'}</button>
    </form>
  );
}

/** Blessings wall: approved wishes + a form (new wishes wait for moderation). */
export function Wishes({ slug, preview, draft }) {
  const [list, setList] = useState(null);
  const [f, setF] = useState({ name: '', message: '' });
  const [state, setState] = useState('idle');
  const [err, setErr] = useState('');
  useEffect(() => { api(`/invites/${slug}/wishes${preview ? `?preview=${preview}` : ''}`).then(setList).catch(() => setList([])); }, [slug, preview]);
  const submit = async (e) => {
    e.preventDefault();
    if (f.name.trim().length < 2 || !NAME_RX.test(f.name.trim())) { setErr('Please enter your name.'); return; }
    if (f.message.trim().length < 3) { setErr('Please write a short message.'); return; }
    setState('sending'); setErr('');
    try { await api(`/invites/${slug}/wishes${preview ? `?preview=${preview}` : ''}`, { method: 'POST', body: f }); setState('sent'); setF({ name: '', message: '' }); }
    catch (e2) { setErr(e2.message); setState('idle'); }
  };
  return (
    <div className="inv-wishes">
      {list?.length > 0 && (
        <ul className="inv-wishes__list">
          {list.map((w, i) => <li key={i}><p>“{w.message}”</p><span>— {w.name}</span></li>)}
        </ul>
      )}
      {draft ? (
        <p className="inv-note">This is a preview. Guests can send blessings here once the invitation is published.</p>
      ) : state === 'sent' ? (
        <p className="inv-note">Thank you! Your blessing will appear here once the couple approves it. 💛</p>
      ) : (
        <form className="inv-wishes__form" onSubmit={submit} noValidate>
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Your name" maxLength={80} aria-label="Your name" />
          <textarea value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Write your blessing…" rows={3} maxLength={500} aria-label="Your blessing" />
          {err && <p className="inv-err" role="alert">{err}</p>}
          <button className="inv-btn inv-btn--line" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send blessings'}</button>
        </form>
      )}
    </div>
  );
}

/** WhatsApp share + copy link. */
export function Share({ inv }) {
  const [copied, setCopied] = useState(false);
  const url = window.location.href.split('?')[0];
  const text = `You're invited to the wedding of ${inv.partner1} & ${inv.partner2}${inv.weddingDate ? ` on ${fmtDate(inv.weddingDate, { day: 'numeric', month: 'long', year: 'numeric' })}` : ''} 💐\n${url}`;
  return (
    <div className="inv-share">
      <a className="inv-btn" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>
      <button type="button" className="inv-btn inv-btn--line" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ } }}>{copied ? 'Link copied ✓' : 'Copy link'}</button>
    </div>
  );
}
