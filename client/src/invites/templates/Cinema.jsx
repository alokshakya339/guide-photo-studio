import { useEffect, useRef, useState } from 'react';
import { Countdown, CalendarButtons, MusicToggle, fmtDate, mapLink, useInviteReveal } from '../parts.jsx';
import { Lightbox, paragraphs } from '../three.jsx';
import Tail from '../tail.jsx';

/**
 * Cinema Reel — a film-title invitation on warm paper.
 * Signature (after MotionSites "Wild Pil"): a hairline between the couple's names opens into a slit, a circle,
 * then a wide pill — a window onto a looping film scene — pushing the names apart. With the envelope feature
 * the hero waits for a tap (which also starts the music); otherwise it plays on load.
 * Supporting motion stays quiet: words that fill in at reading pace, event cards that stack as you scroll,
 * and a gallery band that drifts with the scroll.
 */

/** Film loops for the pill window (free MotionSites backgrounds). 'photo' uses the cover photo instead. */
export const SCENES = {
  meadow: { name: 'Pink meadow at sunrise', src: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261029_084140_553c4785-d33c-496e-9702-45247fa2fcf3.mp4' },
  blossom: { name: 'Blossom on still water', src: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261029_084141_6ac02cf2-9847-4e03-9a9c-81a4ec81dd93.mp4' },
  lotus: { name: 'Glowing lotus', src: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260701_083907_581a119a-89b7-4c9f-a6ef-560625e0086f.mp4' },
  fireflies: { name: 'Firefly hills at dawn', src: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261014_144105_b4b14bc7-788f-4997-86aa-ce920dc8fe96.mp4' },
  portal: { name: 'Stone arch at sunset', src: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260815_075403_f5e02d94-0311-4ff3-bedb-81dc78803882.mp4' },
  photo: { name: 'Our cover photo', src: '' },
};

/** A drop cap would split "Mr." / "Smt." awkwardly, so those leads start plain. */
const HONORIFIC = /^(mr|mrs|ms|dr|smt|shri|sri)\b/i;
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Soft white S-curves on the paper (decorative). */
const Lines = () => (
  <svg className="cin-lines" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
    {Array.from({ length: 13 }, (_, i) => {
      const y = 980 - i * 70;
      return <path key={i} d={`M-60 ${y} C 360 ${y - 160}, 620 ${y + 60}, 900 ${y - 200} S 1380 ${y - 420}, 1520 ${y - 520}`} style={{ strokeWidth: 1.2 + ((i * 7) % 5) * 0.65, opacity: 0.55 + ((i * 3) % 4) * 0.09 }} />;
    })}
  </svg>
);

const Speaker = ({ on }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" />{on && <><path d="M16 9a4 4 0 0 1 0 6" /><path d="M18.5 6.5a8 8 0 0 1 0 11" /></>}</svg>
);
const Heart = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>;

/** Words that fill from faint to ink as the paragraph crosses the screen. */
function ReadingReveal({ text, className = '' }) {
  const ref = useRef(null);
  const words = String(text || '').split(/\s+/).filter(Boolean);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const spans = [...el.querySelectorAll('span')];
    if (reduced()) { spans.forEach((s) => { s.style.opacity = 1; }); return undefined; }
    let raf = 0;
    const tick = () => {
      raf = 0;
      const r = el.getBoundingClientRect(); const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const lit = p * spans.length;
      spans.forEach((s, i) => { s.style.opacity = (0.16 + 0.84 * Math.min(1, Math.max(0, lit - i))).toFixed(3); });
    };
    const q = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener('scroll', q, { passive: true }); window.addEventListener('resize', q);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', q); window.removeEventListener('resize', q); };
  }, [text]);
  return <p ref={ref} className={`cin-read ${className}`}>{words.map((w, i) => <span key={i}>{w} </span>)}</p>;
}

/** Event cards pin one after another; each card shrinks a little as the next one slides over it. */
function useStack(ref, dep) {
  useEffect(() => {
    const root = ref.current;
    if (!root || reduced()) return undefined;
    const cards = [...root.querySelectorAll('.cin-event')];
    let raf = 0;
    const tick = () => {
      raf = 0;
      cards.forEach((c, i) => {
        const next = cards[i + 1];
        if (!next) { c.style.setProperty('--s', '1'); return; }
        const a = c.getBoundingClientRect(); const b = next.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, 1 - (b.top - a.top) / a.height));
        c.style.setProperty('--s', (1 - p * 0.06).toFixed(4));
        c.style.setProperty('--dim', (p * 0.35).toFixed(3));
      });
    };
    const q = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener('scroll', q, { passive: true }); window.addEventListener('resize', q);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', q); window.removeEventListener('resize', q); };
  }, [ref, dep]);
}

/** Two rows of photos drifting in opposite directions with the scroll. */
function Reel({ photos, onOpen }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return undefined;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = (window.innerHeight - r.top) / (window.innerHeight + r.height);
      el.style.setProperty('--shift', `${((p - 0.5) * 22).toFixed(2)}%`);
    };
    const q = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener('scroll', q, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', q); };
  }, []);
  const half = Math.ceil(photos.length / 2);
  const rows = photos.length > 3 ? [photos.slice(0, half), photos.slice(half)] : [photos];
  return (
    <div className="cin-reel" ref={ref}>
      {rows.map((row, ri) => (
        <div key={ri} className={`cin-reel__row ${ri ? 'is-rev' : ''}`}>
          {Array.from({ length: Math.max(2, Math.ceil(12 / row.length)) }, () => row).flat().map((src, i) => {
            const idx = photos.indexOf(src);
            return (
              <button key={`${src}-${i}`} type="button" className="cin-reel__item" onClick={() => onOpen(idx)} aria-label={`Open photo ${idx + 1}`} tabIndex={i >= row.length ? -1 : 0} aria-hidden={i >= row.length ? true : undefined}>
                <img src={src} alt="" loading="lazy" />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function Cinema({ inv, slug, token, preview }) {
  const f = inv.features || { envelope: true, countdown: true, animations: false };
  const lux = Boolean(f.animations);
  const [state, setState] = useState(f.envelope ? 'closed' : 'opening'); // closed → opening → open
  const [playing, setPlaying] = useState(false);
  const video = useRef(null);
  const events = useRef(null);
  const [photo, setPhoto] = useState(-1);
  useInviteReveal(state);
  useStack(events, inv.events?.length);

  const scene = SCENES[inv.heroScene] || SCENES.meadow;
  const useVideo = Boolean(scene.src);

  useEffect(() => {
    if (state !== 'opening') return undefined;
    const t = setTimeout(() => setState('open'), reduced() ? 0 : 2300);
    return () => clearTimeout(t);
  }, [state]);
  useEffect(() => {
    document.documentElement.classList.toggle('cin-lock', state === 'closed');
    return () => document.documentElement.classList.remove('cin-lock');
  }, [state]);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (reduced()) { v.pause(); return; }
    v.play().catch(() => {});
  }, [useVideo]);

  const open = () => { if (state !== 'closed') return; setState('opening'); if (inv.music) setPlaying(true); };
  const n1 = String(inv.partner1 || ''); const n2 = String(inv.partner2 || '');
  const date = fmtDate(inv.weddingDate, { day: 'numeric', month: 'long', year: 'numeric' });
  const lead = inv.families || inv.headline || 'We’re getting married';
  const head = (k, t) => (
    <div className="cin-head" data-inv-reveal>
      <p className="cin-k">{k}</p>
      <h2 className="cin-h2">{t}</h2>
    </div>
  );

  return (
    <div className={`cin ${lux ? 'cin--lux' : ''} is-${state}`} style={{ '--chars': Math.max(n1.length + n2.length, 6), '--long': Math.max(n1.length, n2.length, 3) }}>
      <MusicToggle src={inv.music} title={inv.musicTitle} playing={playing} setPlaying={setPlaying} />

      {/* ---------- signature hero ---------- */}
      <header className="cin-hero">
        <div className="cin-paper" aria-hidden="true"><Lines /></div>
        <nav className="cin-top" aria-label="Invitation">
          <span>{inv.hashtag || 'Save the date'}</span>
          <span className="cin-top__links">
            {inv.events?.length > 0 && <a href="#events">Celebrations</a>}
            {inv.gallery?.length > 0 && <a href="#moments">Moments</a>}
            {inv.rsvpEnabled && <a href="#rsvp">RSVP</a>}
          </span>
        </nav>

        <h1 className="cin-title" aria-label={`${n1} and ${n2}`}>
          <span className="cin-name is-a" aria-hidden="true">{n1}</span>
          <span className="cin-pill" aria-hidden="true">
            {useVideo ? (
              <video ref={video} src={scene.src} poster={inv.coverPhoto || undefined} muted loop playsInline autoPlay preload="auto" />
            ) : (
              inv.coverPhoto && <img src={inv.coverPhoto} alt="" />
            )}
            <i className="cin-pill__line" />
            <b className="cin-pill__ico is-l"><Heart /></b>
            {inv.music && <button type="button" className="cin-pill__ico is-r" tabIndex={state === 'open' ? 0 : -1} onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause music' : 'Play music'}><Speaker on={playing} /></button>}
          </span>
          <span className="cin-name is-b" aria-hidden="true">{n2}</span>
        </h1>

        {state === 'closed' && (
          <button type="button" className="cin-tap" onClick={open}>
            <span>{inv.headline || 'You are invited'}</span>
            <b>Tap to open{inv.music ? ' · with music' : ''}</b>
          </button>
        )}

        <div className="cin-bottom">
          <p className="cin-lead">{HONORIFIC.test(lead) ? lead : <><b>{lead[0]}</b>{lead.slice(1)}</>}</p>
          <span className="cin-rule" aria-hidden="true" />
          <div className="cin-when">
            {date && <span>{date}</span>}
            {inv.city && <span>{inv.city}</span>}
          </div>
          {inv.rsvpEnabled && <a href="#rsvp" className="cin-cta">Kindly RSVP</a>}
        </div>
      </header>

      {/* ---------- story ---------- */}
      {(inv.story || inv.timeline?.length > 0 || inv.couplePhoto) && (
        <section className="cin-sec cin-story">
          <p className="cin-k" data-inv-reveal>Our story</p>
          {inv.story && paragraphs(inv.story).slice(0, 2).map((p, i) => <ReadingReveal key={i} text={p} />)}
          {inv.timeline?.length > 0 && (
            <ol className="cin-scenes">
              {inv.timeline.map((t, i) => (
                <li key={i} data-inv-reveal style={{ '--d': `${(i % 3) * 110}ms` }}>
                  <span className="cin-scenes__n">Scene {String(i + 1).padStart(2, '0')}{t.year && ` · ${t.year}`}</span>
                  <h3>{t.title}</h3>
                  {t.text && <p>{t.text}</p>}
                </li>
              ))}
            </ol>
          )}
          {inv.couplePhoto && <figure className="cin-still" data-inv-reveal><img src={inv.couplePhoto} alt={`${n1} and ${n2}`} loading="lazy" /></figure>}
        </section>
      )}

      {/* ---------- countdown ---------- */}
      {f.countdown && inv.weddingDate && (
        <section className="cin-sec cin-count">
          <p className="cin-k" data-inv-reveal>Opening night in</p>
          <div data-inv-reveal><Countdown date={inv.weddingDate} /></div>
        </section>
      )}

      {/* ---------- events: stacking cards ---------- */}
      {inv.events?.length > 0 && (
        <section className="cin-sec cin-events" id="events">
          {head('The programme', <>Join us <em>for</em></>)}
          <div className="cin-stack" ref={events}>
            {inv.events.map((e, i) => (
              <article key={`${e.name}-${i}`} className="cin-event" style={{ '--i': i }}>
                <div className="cin-event__side">
                  <span className="cin-event__n">{String(i + 1).padStart(2, '0')} / {String(inv.events.length).padStart(2, '0')}</span>
                  <h3>{e.name}</h3>
                  {e.date && <p className="cin-event__date">{fmtDate(e.date, { weekday: 'long', day: 'numeric', month: 'long' })}{e.time && ` · ${e.time}`}</p>}
                </div>
                <div className="cin-event__body">
                  {(e.venue || e.address) && <p className="cin-event__venue"><b>{e.venue}</b>{e.address && <span>{e.address}</span>}</p>}
                  {(e.dressCode || e.colors?.length > 0) && (
                    <div className="cin-event__dress">
                      <span>Dress code</span>{e.dressCode}
                      {e.colors?.length > 0 && <div className="cin-swatches" aria-label="Dress-code colours">{e.colors.map((c) => <i key={c} style={{ background: c }} title={c} />)}</div>}
                    </div>
                  )}
                  {e.note && <p className="cin-event__note">{e.note}</p>}
                  <div className="cin-event__actions">
                    {mapLink(e) && <a href={mapLink(e)} target="_blank" rel="noreferrer">Directions</a>}
                    <CalendarButtons inv={inv} event={e} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ---------- gallery reel ---------- */}
      {inv.gallery?.length > 0 && (
        <section className="cin-sec cin-gallery" id="moments">
          {head('Moments', <>Stills <em>from the reel</em></>)}
          <Reel photos={inv.gallery} onOpen={setPhoto} />
          <Lightbox photos={inv.gallery} index={photo} setIndex={setPhoto} />
        </section>
      )}

      <Tail inv={inv} slug={slug} token={token} preview={preview} p="cin" head={head}
        words={{ filmT: 'The trailer', rsvpT: <>Will you <em>join us?</em></>, wishT: <>Leave your <em>wishes</em></>, close: 'Roll credits — with love' }} />
    </div>
  );
}
