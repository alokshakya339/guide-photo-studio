import { useEffect, useMemo, useRef, useState } from 'react';
import { Countdown, CalendarButtons, MusicToggle, Gallery, Film, Rsvp, Wishes, Share, fmtDate, initials, mapLink, useInviteReveal } from '../parts.jsx';

/** Gold ornament divider. */
const Ornament = () => (
  <svg className="roy-orn" viewBox="0 0 220 24" aria-hidden="true">
    <path d="M0 12h86M134 12h86" />
    <path d="M110 2c4 6 4 14 0 20-4-6-4-14 0-20Z" />
    <circle cx="96" cy="12" r="2.5" /><circle cx="124" cy="12" r="2.5" />
  </svg>
);

/** Luxury: drifting rose & gold petals over the invitation (decorative, pointer-events none). */
export function Petals({ count = 16 }) {
  const petals = useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: Math.round(Math.random() * 100), delay: (Math.random() * 14).toFixed(1), dur: (11 + Math.random() * 9).toFixed(1),
    size: Math.round(9 + Math.random() * 10), drift: Math.round(-60 + Math.random() * 120), gold: i % 3 === 0,
  })), [count]);
  return (
    <div className="roy-petals" aria-hidden="true">
      {petals.map((p, i) => (
        <span key={i} className={p.gold ? 'is-gold' : ''} style={{ left: `${p.left}%`, width: p.size, height: p.size * 0.8, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, '--drift': `${p.drift}px` }} />
      ))}
    </div>
  );
}

/** Luxury: names written letter by letter. */
export const Letters = ({ text, start = 0 }) => [...String(text || '')].map((c, i) => (
  <span key={i} className="roy-l" style={{ '--i': start + i }}>{c === ' ' ? '\u00a0' : c}</span>
));

/** Luxury: gentle parallax on the hero photo. */
function useParallax(on) {
  const ref = useRef(null);
  useEffect(() => {
    if (!on || !ref.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let raf = 0;
    const tick = () => { raf = 0; if (ref.current) ref.current.style.transform = `translate3d(0, ${Math.min(window.scrollY, 900) * 0.28}px, 0) scale(1.08)`; };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    window.addEventListener('scroll', onScroll, { passive: true });
    tick();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [on]);
  return ref;
}

/** Luxury: twinkling gold dust (hero). */
export function GoldDust({ count = 26 }) {
  const dots = useMemo(() => Array.from({ length: count }, () => ({
    left: Math.random() * 100, top: Math.random() * 100, s: 2 + Math.random() * 3.5, d: (Math.random() * 4).toFixed(2), t: (2.5 + Math.random() * 3).toFixed(2),
  })), [count]);
  return <div className="roy-dust" aria-hidden="true">{dots.map((x, i) => <i key={i} style={{ left: `${x.left}%`, top: `${x.top}%`, width: x.s, height: x.s, animationDelay: `${x.d}s`, animationDuration: `${x.t}s` }} />)}</div>;
}

/** Luxury: slowly turning gold mandala behind the names. */
const Mandala = () => (
  <svg className="roy-mandala" viewBox="0 0 200 200" aria-hidden="true">
    <circle cx="100" cy="100" r="96" /><circle cx="100" cy="100" r="78" /><circle cx="100" cy="100" r="40" />
    {Array.from({ length: 24 }, (_, i) => <path key={i} transform={`rotate(${i * 15} 100 100)`} d="M100 22c7 12 7 26 0 38-7-12-7-26 0-38Z" />)}
    {Array.from({ length: 12 }, (_, i) => <circle key={`c${i}`} transform={`rotate(${i * 30} 100 100)`} cx="100" cy="8" r="2.4" className="is-dot" />)}
  </svg>
);

/** Luxury: thin gold thread at the top that fills as guests scroll. */
export function ScrollThread() {
  const ref = useRef(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => { raf = 0; const h = document.documentElement.scrollHeight - window.innerHeight; if (ref.current) ref.current.style.transform = `scaleX(${h > 0 ? Math.min(1, window.scrollY / h) : 0})`; };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    window.addEventListener('scroll', on, { passive: true }); tick();
    return () => { window.removeEventListener('scroll', on); cancelAnimationFrame(raf); };
  }, []);
  return <div className="roy-thread" aria-hidden="true"><span ref={ref} /></div>;
}

/** Luxury: a little burst of gold sparkles wherever a guest taps. */
export function useTapSparkles(on) {
  useEffect(() => {
    if (!on || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const tap = (e) => {
      const n = 8;
      for (let i = 0; i < n; i += 1) {
        const el = document.createElement('i');
        el.className = 'roy-spark';
        const a = (Math.PI * 2 * i) / n + Math.random() * 0.4; const r = 26 + Math.random() * 26;
        el.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;--x:${Math.cos(a) * r}px;--y:${Math.sin(a) * r}px`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 800);
      }
    };
    window.addEventListener('pointerdown', tap);
    return () => window.removeEventListener('pointerdown', tap);
  }, [on]);
}

/**
 * Theme: Royal Indian — deep maroon, ivory and gold, Allura script + Cormorant.
 * Opens with a sealed envelope; tapping it reveals the invitation and starts the music (a user gesture,
 * so browsers allow it).
 */
export default function Royal({ inv, slug, token, preview }) {
  // What the couple's package includes (older invitations without this get everything).
  const f = inv.features || { envelope: true, countdown: true, animations: false };
  const lux = Boolean(f.animations);
  const [opened, setOpened] = useState(!f.envelope);
  const [leaving, setLeaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  useInviteReveal(opened);
  const heroImg = useParallax(lux);
  useTapSparkles(lux && opened);

  const open = () => {
    setLeaving(true);
    if (inv.music) setPlaying(true);
    setTimeout(() => setOpened(true), 2100);
  };
  const date = fmtDate(inv.weddingDate);

  return (
    <div className={`roy ${lux ? 'roy--lux' : ''} ${opened ? 'is-open' : ''}`}>
      {lux && opened && <Petals />}
      {lux && opened && <ScrollThread />}
      {!opened && (
        <div className={`roy-env ${leaving ? 'is-opening' : ''}`} role="dialog" aria-label="Open the invitation">
          <div className="roy-env__bg" style={inv.coverPhoto ? { backgroundImage: `url(${inv.coverPhoto})` } : undefined} />
          <p className="roy-env__to">You are cordially invited</p>
          <button type="button" className="roy-env__card" onClick={open} aria-label="Tap to open the invitation">
            <span className="roy-env__flap" />
            <span className="roy-env__letter">
              <em>{inv.partner1}</em>
              <i>&amp;</i>
              <em>{inv.partner2}</em>
            </span>
            <span className="roy-env__pocket" />
            <span className="roy-env__seal"><b className="is-l" /><b className="is-r" /><span>{initials(inv)}</span></span>
            <span className="roy-env__burst" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--a': `${i * 30}deg` }} />)}</span>
          </button>
          <p className="roy-env__hint">Tap to open{inv.music ? ' · with music' : ''}</p>
        </div>
      )}

      <MusicToggle src={inv.music} title={inv.musicTitle} playing={playing} setPlaying={setPlaying} />

      {/* Hero */}
      <header className="roy-hero">
        {inv.coverPhoto && <img ref={heroImg} className="roy-hero__img" src={inv.coverPhoto} alt="" />}
        <div className="roy-hero__shade" />
        {lux && <GoldDust />}
        <div className="roy-hero__inner">
          {lux && <Mandala />}
          <p className="roy-kicker">{inv.headline || 'We’re getting married'}</p>
          {lux ? (
            <h1 className="roy-names" aria-label={`${inv.partner1} and ${inv.partner2}`}>
              <span aria-hidden="true"><Letters text={inv.partner1} /></span>
              <i aria-hidden="true" className="roy-l" style={{ '--i': String(inv.partner1 || '').length + 1 }}>&amp;</i>
              <span aria-hidden="true"><Letters text={inv.partner2} start={String(inv.partner1 || '').length + 3} /></span>
            </h1>
          ) : (
            <h1 className="roy-names"><span>{inv.partner1}</span><i>&amp;</i><span>{inv.partner2}</span></h1>
          )}
          <Ornament />
          {date && <p className="roy-date">{date}</p>}
          {inv.city && <p className="roy-city">{inv.city}</p>}
        </div>
      </header>

      {inv.families && (
        <section className="roy-sec roy-intro" data-inv-reveal>
          <p className="roy-script">Together with their families</p>
          <p className="roy-intro__text">{inv.families}</p>
        </section>
      )}

      {f.countdown && inv.weddingDate && (
        <section className="roy-sec roy-countdown" data-inv-reveal>
          <p className="roy-label">Counting down to forever</p>
          <Countdown date={inv.weddingDate} />
        </section>
      )}

      {(inv.story || inv.couplePhoto) && (
        <section className="roy-sec roy-story" data-inv-reveal>
          {inv.couplePhoto && <div className="roy-story__photo"><img src={inv.couplePhoto} alt={`${inv.partner1} and ${inv.partner2}`} loading="lazy" /></div>}
          <div className="roy-story__text">
            <p className="roy-label">Our story</p>
            <h2 className="roy-h2">How it <em>began</em></h2>
            {String(inv.story || '').split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </section>
      )}

      {inv.events?.length > 0 && (
        <section className="roy-sec roy-events">
          <div className="roy-head" data-inv-reveal>
            <p className="roy-label">The celebrations</p>
            <h2 className="roy-h2">Join us <em>for</em></h2>
            <Ornament />
          </div>
          <div className="roy-events__grid">
            {inv.events.map((e, i) => (
              <article key={`${e.name}-${i}`} className="roy-event" data-inv-reveal style={{ '--d': `${(i % 3) * 90}ms` }}>
                <span className="roy-event__num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{e.name}</h3>
                {e.date && <p className="roy-event__date">{fmtDate(e.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>}
                {e.time && <p className="roy-event__time">{e.time}</p>}
                {(e.venue || e.address) && <p className="roy-event__venue"><b>{e.venue}</b>{e.address && <span>{e.address}</span>}</p>}
                {(e.dressCode || e.colors?.length > 0) && (
                  <div className="roy-event__dress">
                    <span>Dress code</span>{e.dressCode}
                    {e.colors?.length > 0 && <div className="roy-swatches" aria-label="Dress-code colours">{e.colors.map((col) => <i key={col} style={{ background: col }} title={col} />)}</div>}
                  </div>
                )}
                {e.note && <p className="roy-event__note">{e.note}</p>}
                <div className="roy-event__actions">
                  {mapLink(e) && <a href={mapLink(e)} target="_blank" rel="noreferrer">Directions</a>}
                  <CalendarButtons inv={inv} event={e} />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {inv.gallery?.length > 0 && (
        <section className="roy-sec roy-gallery">
          <div className="roy-head" data-inv-reveal>
            <p className="roy-label">Moments</p>
            <h2 className="roy-h2">Our <em>pre-wedding</em></h2>
          </div>
          <div data-inv-reveal><Gallery photos={inv.gallery} /></div>
        </section>
      )}

      {inv.videoId && (
        <section className="roy-sec roy-filmsec" data-inv-reveal>
          <p className="roy-label">Our film</p>
          <Film id={inv.videoId} poster={inv.couplePhoto} />
        </section>
      )}

      {inv.rsvpEnabled && (
        <section className="roy-sec roy-rsvp" id="rsvp">
          <div className="roy-head" data-inv-reveal>
            <p className="roy-label">Kindly respond</p>
            <h2 className="roy-h2">Will you <em>join us?</em></h2>
            {inv.rsvpDeadline && <p className="roy-sub">Please reply by {fmtDate(inv.rsvpDeadline, { day: 'numeric', month: 'long' })}</p>}
          </div>
          <div className="roy-card" data-inv-reveal><Rsvp inv={inv} slug={slug} token={token} preview={preview} /></div>
        </section>
      )}

      {inv.wishesEnabled && (
        <section className="roy-sec roy-wishsec">
          <div className="roy-head" data-inv-reveal>
            <p className="roy-label">Blessings</p>
            <h2 className="roy-h2">Leave your <em>wishes</em></h2>
          </div>
          <div data-inv-reveal><Wishes slug={slug} preview={preview} draft={inv.preview && inv.status !== 'published'} /></div>
        </section>
      )}

      <section className="roy-sec roy-close" data-inv-reveal>
        <p className="roy-script">With love,</p>
        <p className="roy-close__names">{lux ? <span className="roy-write">{inv.partner1} &amp; {inv.partner2}</span> : <>{inv.partner1} &amp; {inv.partner2}</>}</p>
        <Share inv={inv} />
      </section>

      <footer className="roy-foot">
        <a href="/" target="_blank" rel="noreferrer">Invitation crafted by <b>Guide Studio</b></a>
        {inv.showStudioCta && <a className="roy-foot__cta" href="/contact?type=Wedding" target="_blank" rel="noreferrer">Planning your own wedding? Explore our photography →</a>}
      </footer>
    </div>
  );
}
