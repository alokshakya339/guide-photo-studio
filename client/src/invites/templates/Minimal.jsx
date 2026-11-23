import { useEffect, useRef, useState } from 'react';
import { Countdown, CalendarButtons, MusicToggle, fmtDate, initials, mapLink, useInviteReveal } from '../parts.jsx';
import { useOpening, useParallax, Lightbox, paragraphs } from '../three.jsx';
import Tail from '../tail.jsx';

/**
 * Modern Minimal — paper white, ink black, one vermilion accent, big type.
 * Opening: five blinds flip open in 3D.
 * Hero: oversized names that tilt back in 3D as you scroll, beside a photo revealed with a wipe.
 * Story scrolls sideways while you scroll down (sticky horizontal track); events are numbered rows
 * that flip in; the gallery is a deck you deal through.
 */

const BLINDS = 5;
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Vertical scroll drives a horizontal track while the section is pinned. */
function useSideScroll(ref, on) {
  const [flat, setFlat] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !on) return undefined;
    if (reduced()) { setFlat(true); return undefined; }
    const track = el.querySelector('.min-track');
    let raf = 0;
    const tick = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      const max = Math.max(0, track.scrollWidth - window.innerWidth);
      el.style.setProperty('--tx', `${(-p * max).toFixed(1)}px`);
      el.style.setProperty('--hp', p.toFixed(3));
    };
    const size = () => { el.style.setProperty('--len', `${Math.max(1, track.scrollWidth / window.innerWidth)}`); tick(); };
    const q = () => { if (!raf) raf = requestAnimationFrame(tick); };
    size();
    window.addEventListener('scroll', q, { passive: true });
    window.addEventListener('resize', size);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', q); window.removeEventListener('resize', size); };
  }, [ref, on]);
  return flat;
}

/** A deck of photos: tap the top card to deal it to the back; "View" opens it full screen. */
function Deck({ photos }) {
  const [order, setOrder] = useState(photos.map((_, i) => i));
  const [leaving, setLeaving] = useState(false);
  const [big, setBig] = useState(-1);
  const deal = () => {
    if (leaving) return;
    if (reduced()) { setOrder((o) => [...o.slice(1), o[0]]); return; }
    setLeaving(true);
    setTimeout(() => { setOrder((o) => [...o.slice(1), o[0]]); setLeaving(false); }, 520);
  };
  return (
    <div className="min-deck" data-inv-reveal>
      <div className="min-deck__pile">
        {order.map((idx, pos) => (
          <button
            key={photos[idx]}
            type="button"
            className={`min-deck__card ${pos === 0 && leaving ? 'is-leaving' : ''}`}
            style={{ '--pos': pos, zIndex: photos.length - pos }}
            onClick={pos === 0 ? deal : undefined}
            tabIndex={pos === 0 ? 0 : -1}
            aria-label={pos === 0 ? 'Next photo' : undefined}
            aria-hidden={pos === 0 ? undefined : true}
          >
            <img src={photos[idx]} alt="" loading="lazy" draggable="false" />
          </button>
        ))}
      </div>
      <div className="min-deck__bar">
        <span>{String(order[0] + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}</span>
        <button type="button" onClick={deal}>Next →</button>
        <button type="button" onClick={() => setBig(order[0])}>View</button>
      </div>
      <Lightbox photos={photos} index={big} setIndex={setBig} />
    </div>
  );
}

export default function Minimal({ inv, slug, token, preview }) {
  const { f, opened, leaving, open, playing, setPlaying } = useOpening(inv, 1900);
  const root = useRef(null);
  const story = useRef(null);
  useParallax(root, opened);
  useInviteReveal(opened);
  const flat = useSideScroll(story, opened);

  const c = inv.couple || {};
  const hasCouple = c.p1Bio || c.p2Bio || c.p1Parents || c.p2Parents;
  const date = fmtDate(inv.weddingDate, { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' . ');
  const long = fmtDate(inv.weddingDate);
  const photos = [...(inv.gallery || []), inv.couplePhoto].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 8);
  const head = (k, t) => (
    <div className="min-head" data-inv-reveal>
      <p className="min-k"><span />{k}</p>
      <h2 className="min-h2">{t}</h2>
    </div>
  );

  return (
    <div ref={root} className={`min ${opened ? 'is-open' : ''} ${leaving || opened ? 'is-in' : ''}`}>
      {!opened && (
        <div className={`min-open ${leaving ? 'is-opening' : ''}`} role="dialog" aria-label="Open the invitation">
          <div className="min-blinds" aria-hidden="true">
            {Array.from({ length: BLINDS }, (_, i) => <span key={i} style={{ '--i': i }} />)}
          </div>
          <div className="min-open__card">
            <span className="min-open__k">Save the date</span>
            <span className="min-open__mono">{initials(inv).split('').join(' / ')}</span>
            <span className="min-open__names">{inv.partner1} &amp; {inv.partner2}</span>
            {date && <span className="min-open__date">{date}</span>}
            <button type="button" className="min-btn" onClick={open}>Open{inv.music ? ' ♪' : ''}</button>
          </div>
        </div>
      )}

      <MusicToggle src={inv.music} title={inv.musicTitle} playing={playing} setPlaying={setPlaying} />

      <header className="min-hero">
        <div className="min-hero__type">
          <p className="min-kicker">{inv.headline || 'We’re getting married'}</p>
          <h1 className="min-names">
            <span className="is-1">{inv.partner1}</span>
            <span className="is-amp">&amp;</span>
            <span className="is-2">{inv.partner2}</span>
          </h1>
          <div className="min-hero__meta">
            {date && <span>{date}</span>}
            {inv.city && <span>{inv.city}</span>}
            {inv.hashtag && <span>{inv.hashtag}</span>}
          </div>
        </div>
        {inv.coverPhoto && <div className="min-hero__photo"><img src={inv.coverPhoto} alt="" /></div>}
        <span className="min-hero__side" aria-hidden="true">Wedding invitation — {inv.weddingDate?.slice(0, 4)}</span>
      </header>

      {inv.families && (
        <section className="min-sec min-intro" data-inv-reveal>
          <p className="min-intro__text">{inv.families}</p>
        </section>
      )}

      {hasCouple && (
        <section className="min-sec min-sec--wide">
          <div className="min-couple">
            {[1, 2].map((n) => (
              <article key={n} className="min-person" data-inv-reveal style={{ '--d': `${(n - 1) * 140}ms` }}>
                <span className="min-person__ghost" aria-hidden="true">{(inv[`partner${n}`] || '?')[0]}</span>
                {c[`p${n}Photo`] && <img className="min-person__pic" src={c[`p${n}Photo`]} alt={inv[`partner${n}`]} loading="lazy" />}
                <h3>{inv[`partner${n}`]}</h3>
                {c[`p${n}Parents`] && <p className="min-person__par">{c[`p${n}Parents`]}</p>}
                {c[`p${n}Bio`] && <p>{c[`p${n}Bio`]}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {f.countdown && inv.weddingDate && (
        <section className="min-sec min-sec--wide min-countdown" data-inv-reveal>
          <p className="min-k"><span />Countdown</p>
          <Countdown date={inv.weddingDate} />
        </section>
      )}

      {(inv.timeline?.length > 0 || inv.story) && (
        inv.timeline?.length > 0 ? (
          <section ref={story} className={`min-story ${flat ? 'is-flat' : ''}`}>
            <div className="min-story__pin">
              <div className="min-story__head">
                <p className="min-k"><span />Our story</p>
                <h2 className="min-h2">Us, so far</h2>
                <span className="min-story__bar"><i /></span>
              </div>
              <div className="min-track">
                {inv.timeline.map((t, i) => (
                  <article key={i} className="min-chapter">
                    <span className="min-chapter__y">{t.year}</span>
                    <h3>{t.title}</h3>
                    {t.text && <p>{t.text}</p>}
                  </article>
                ))}
                {inv.couplePhoto && <div className="min-chapter min-chapter--photo"><img src={inv.couplePhoto} alt={`${inv.partner1} and ${inv.partner2}`} loading="lazy" /></div>}
              </div>
            </div>
          </section>
        ) : (
          <section className="min-sec">
            {head('Our story', 'Us, so far')}
            <div className="min-prose" data-inv-reveal>{paragraphs(inv.story).map((p, i) => <p key={i}>{p}</p>)}</div>
          </section>
        )
      )}

      {inv.events?.length > 0 && (
        <section className="min-sec min-sec--wide">
          {head('Schedule', 'The weekend')}
          <ol className="min-rows">
            {inv.events.map((e, i) => (
              <li key={`${e.name}-${i}`} className="min-row" data-inv-reveal style={{ '--d': `${i * 90}ms` }}>
                <span className="min-row__n">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-row__what">
                  <h3>{e.name}</h3>
                  <p>{[e.date && fmtDate(e.date, { weekday: 'short', day: 'numeric', month: 'short' }), e.time].filter(Boolean).join(' — ')}</p>
                </div>
                <div className="min-row__where">
                  {e.venue && <b>{e.venue}</b>}
                  {e.address && <span>{e.address}</span>}
                  {(e.dressCode || e.colors?.length > 0) && <span className="min-row__dress">{e.dressCode}{e.colors?.length > 0 && <span className="anc-swatches">{e.colors.map((col) => <i key={col} style={{ background: col }} title={col} />)}</span>}</span>}
                  {e.note && <span className="min-row__note">{e.note}</span>}
                </div>
                <div className="min-row__go">
                  {mapLink(e) && <a href={mapLink(e)} target="_blank" rel="noreferrer">Map ↗</a>}
                  <CalendarButtons inv={inv} event={e} />
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {photos.length > 1 && (
        <section className="min-sec min-sec--wide">
          {head('Photographs', 'Deal the deck')}
          <Deck photos={photos} />
        </section>
      )}

      <Tail inv={inv} slug={slug} token={token} preview={preview} p="min" head={head} words={{ rsvpK: 'RSVP', wishK: 'Notes', wishT: 'Leave a line', contacts: 'Questions', close: 'See you there' }} closeExtra={long ? <p className="min-close__date">{long}</p> : null} />
    </div>
  );
}
