import { useEffect, useRef, useState } from 'react';
import { Countdown, CalendarButtons, MusicToggle, fmtDate, mapLink, useInviteReveal } from '../parts.jsx';
import { Tilt, useOpening, useParallax, useScrollProgress, Lightbox, paragraphs } from '../three.jsx';
import Tail from '../tail.jsx';
import { Petals } from './Royal.jsx';

/**
 * Blush Garden — a secret garden: blush, sage, ivory and rose.
 * Opening: a 3D rosebud (three rings of petals) blooms open around the couple's names.
 * Hero: an arched garden doorway under hanging vines that sway at different depths (pointer parallax).
 * Story: a vine draws itself down the page as you scroll, blooming at each milestone.
 * Events: pressed-flower notes taped to the page; gallery: photos fanned like a bouquet.
 */

const RINGS = [
  { n: 6, w: 70, h: 92, closed: -68, open: -6, delay: 0.5, tone: 'is-in' },
  { n: 8, w: 92, h: 128, closed: -60, open: -14, delay: 0.3, tone: 'is-mid' },
  { n: 10, w: 104, h: 160, closed: -52, open: -22, delay: 0.1, tone: 'is-out' },
];

function Bloom({ open, children }) {
  return (
    <div className={`gdn-bloom ${open ? 'is-open' : ''}`} aria-hidden="true">
      {RINGS.map((r, ri) => Array.from({ length: r.n }, (_, i) => (
        <span
          key={`${ri}-${i}`}
          className={`gdn-petal ${r.tone}`}
          style={{ '--a': `${(360 / r.n) * i + ri * 17}deg`, '--w': `${r.w}px`, '--h': `${r.h}px`, '--c': `${r.closed}deg`, '--o': `${r.open}deg`, '--dl': `${r.delay + i * 0.03}s` }}
        />
      )))}
      <span className="gdn-bloom__heart">{children}</span>
    </div>
  );
}

const Sprig = ({ className = '' }) => (
  <svg className={`gdn-sprig ${className}`} viewBox="0 0 120 40" aria-hidden="true">
    <path d="M6 30C30 18 60 16 114 22" className="is-stem" />
    {[[24, 24, -30], [42, 19, 20], [62, 18, -20], [82, 19, 25], [98, 21, -15]].map(([x, y, a], i) => <ellipse key={i} cx={x} cy={y + (i % 2 ? 5 : -5)} rx="7" ry="3" transform={`rotate(${a} ${x} ${y})`} className="is-leaf" />)}
    {Array.from({ length: 5 }, (_, i) => <ellipse key={i} cx="60" cy="9" rx="3.4" ry="6" className="is-petal" transform={`rotate(${i * 72} 60 15)`} />)}
    <circle cx="60" cy="15" r="2.6" className="is-heart" />
  </svg>
);

const Pressed = ({ className = '', hue = 0 }) => (
  <svg className={`gdn-pressed ${className}`} viewBox="0 0 80 90" style={{ '--hue': `${hue}deg` }} aria-hidden="true">
    <path d="M40 88C40 64 38 46 40 26" className="is-stem" />
    <ellipse cx="30" cy="62" rx="9" ry="4" transform="rotate(-35 30 62)" className="is-leaf" />
    <ellipse cx="50" cy="52" rx="9" ry="4" transform="rotate(30 50 52)" className="is-leaf" />
    {Array.from({ length: 6 }, (_, i) => <ellipse key={i} cx="40" cy="12" rx="6" ry="10" className="is-petal" transform={`rotate(${i * 60} 40 22)`} />)}
    <circle cx="40" cy="22" r="4" className="is-heart" />
  </svg>
);

const VINES = [
  { x: 4, len: 34, z: 0.4, d: 0 }, { x: 12, len: 22, z: 1, d: -1.4 }, { x: 22, len: 14, z: 0.6, d: -2.2 },
  { x: 78, len: 16, z: 0.6, d: -0.8 }, { x: 88, len: 28, z: 1, d: -2.6 }, { x: 96, len: 38, z: 0.4, d: -1.9 },
];

/** Photos fanned like a bouquet; they spread when the fan scrolls into view. */
function Bouquet({ photos }) {
  const [big, setBig] = useState(-1);
  const n = photos.length;
  return (
    <>
      <div className="gdn-bouquet" data-inv-reveal style={{ '--n': n }}>
        {photos.map((src, i) => (
          <button key={src} type="button" className="gdn-bouquet__card" style={{ '--i': i - (n - 1) / 2 }} onClick={() => setBig(i)} aria-label={`Open photo ${i + 1}`}>
            <img src={src} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      <Lightbox photos={photos} index={big} setIndex={setBig} />
    </>
  );
}

export default function Garden({ inv, slug, token, preview }) {
  const { f, lux, opened, leaving, open, playing, setPlaying } = useOpening(inv, 3000);
  const root = useRef(null);
  useParallax(root, opened);
  useScrollProgress(root, opened);
  useInviteReveal(opened);
  const vine = useRef(null);
  useEffect(() => {
    const el = vine.current;
    if (!el || !opened) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.style.setProperty('--vp', '1'); return undefined; }
    let raf = 0;
    const tick = () => { raf = 0; const r = el.getBoundingClientRect(); el.style.setProperty('--vp', Math.min(1, Math.max(0, (window.innerHeight * 0.75 - r.top) / r.height)).toFixed(3)); };
    const q = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick(); window.addEventListener('scroll', q, { passive: true }); window.addEventListener('resize', q);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', q); window.removeEventListener('resize', q); };
  }, [opened]);

  const c = inv.couple || {};
  const hasCouple = c.p1Bio || c.p2Bio || c.p1Parents || c.p2Parents;
  const date = fmtDate(inv.weddingDate);
  const head = (k, t) => (
    <div className="gdn-head" data-inv-reveal>
      <p className="gdn-k">{k}</p>
      <h2 className="gdn-h2">{t}</h2>
      <Sprig />
    </div>
  );

  return (
    <div ref={root} className={`gdn ${opened ? 'is-open' : ''}`}>
      {!opened && (
        <div className={`gdn-open ${leaving ? 'is-opening' : ''}`} role="dialog" aria-label="Open the invitation">
          <div className="gdn-open__stage" onClick={open}>
            <Bloom open={leaving}>
              <span className="gdn-open__k">With love, you are invited</span>
              <span className="gdn-open__names">{inv.partner1}<i>&amp;</i>{inv.partner2}</span>
            </Bloom>
          </div>
          <button type="button" className="gdn-open__btn" onClick={open}>Tap to bloom{inv.music ? ' · with music' : ''}</button>
        </div>
      )}

      <MusicToggle src={inv.music} title={inv.musicTitle} playing={playing} setPlaying={setPlaying} />
      {lux && opened && <Petals count={12} />}

      <header className="gdn-hero">
        <div className="gdn-vines" aria-hidden="true">
          {VINES.map((v, i) => (
            <span key={i} className="gdn-vine" style={{ '--x': `${v.x}%`, '--len': `${v.len}vh`, '--z': v.z, '--dl': `${v.d}s`, zIndex: v.z === 1 ? 3 : 1 }}>
              {Array.from({ length: Math.round(v.len / 5) }, (_, k) => <i key={k} className={k % 3 === 2 ? 'is-flower' : ''} style={{ '--k': k }} />)}
            </span>
          ))}
        </div>
        <div className="gdn-hero__inner">
          <div className="gdn-door">
            <div className="gdn-door__arch">{inv.coverPhoto ? <img src={inv.coverPhoto} alt="" /> : null}</div>
            <Sprig className="gdn-door__sprig" />
          </div>
          <div className="gdn-hero__text">
            <p className="gdn-kicker">{inv.headline || 'We’re getting married'}</p>
            <h1 className="gdn-names"><span>{inv.partner1}</span><i>&amp;</i><span>{inv.partner2}</span></h1>
            {date && <p className="gdn-date">{date}</p>}
            {inv.city && <p className="gdn-city">{inv.city}</p>}
            {inv.hashtag && <p className="gdn-tag">{inv.hashtag}</p>}
          </div>
        </div>
      </header>

      {inv.families && (
        <section className="gdn-sec gdn-intro" data-inv-reveal>
          <p className="gdn-script">Together with their families</p>
          <p className="gdn-intro__text">{inv.families}</p>
        </section>
      )}

      {hasCouple && (
        <section className="gdn-sec">
          <div className="gdn-notes gdn-notes--couple">
            {[1, 2].map((n) => (
              <div key={n} data-inv-reveal style={{ '--d': `${(n - 1) * 140}ms` }}>
                <Tilt as="article" className="gdn-note" max={6} style={{ '--r': n === 1 ? '-2deg' : '2deg' }}>
                  <span className="gdn-tape" aria-hidden="true" />
                  {c[`p${n}Photo`] ? <img className="gdn-note__photo" src={c[`p${n}Photo`]} alt={inv[`partner${n}`]} loading="lazy" /> : <Pressed className="gdn-note__flower" hue={n === 1 ? 0 : 40} />}
                  <h3>{inv[`partner${n}`]}</h3>
                  {c[`p${n}Parents`] && <p className="gdn-note__par">{c[`p${n}Parents`]}</p>}
                  {c[`p${n}Bio`] && <p>{c[`p${n}Bio`]}</p>}
                </Tilt>
              </div>
            ))}
          </div>
        </section>
      )}

      {f.countdown && inv.weddingDate && (
        <section className="gdn-sec gdn-countdown" data-inv-reveal>
          <p className="gdn-k">Until we say I do</p>
          <Countdown date={inv.weddingDate} />
        </section>
      )}

      {(inv.timeline?.length > 0 || inv.story) && (
        <section className="gdn-sec gdn-story">
          {head('Our story', 'How it grew')}
          {inv.timeline?.length > 0 ? (
            <div className="gdn-vinepath" ref={vine}>
              <svg className="gdn-vinepath__svg" viewBox="0 0 40 400" preserveAspectRatio="none" aria-hidden="true">
                <path pathLength="1" d="M20 0C36 50 4 100 20 150S36 250 20 300 4 370 20 400" />
              </svg>
              <ol>
                {inv.timeline.map((t, i) => (
                  <li key={i} className={i % 2 ? 'is-r' : 'is-l'} data-inv-reveal>
                    <span className="gdn-vinepath__bud" aria-hidden="true" />
                    <div className="gdn-vinepath__card">
                      <span className="gdn-vinepath__y">{t.year}</span>
                      <h3>{t.title}</h3>
                      {t.text && <p>{t.text}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="gdn-prose" data-inv-reveal>{paragraphs(inv.story).map((p, i) => <p key={i}>{p}</p>)}</div>
          )}
        </section>
      )}

      {inv.events?.length > 0 && (
        <section className="gdn-sec gdn-sec--wide">
          {head('The celebrations', 'Join us in the garden')}
          <div className="gdn-notes">
            {inv.events.map((e, i) => (
              <div key={`${e.name}-${i}`} data-inv-reveal style={{ '--d': `${(i % 3) * 110}ms` }}>
                <Tilt as="article" className="gdn-note gdn-event" max={6} style={{ '--r': `${[-1.6, 1.2, -0.8, 1.8][i % 4]}deg` }}>
                  <span className="gdn-tape" aria-hidden="true" />
                  <Pressed className="gdn-event__flower" hue={[0, 30, 300, 60][i % 4]} />
                  <h3>{e.name}</h3>
                  {e.date && <p className="gdn-event__date">{fmtDate(e.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>}
                  {e.time && <p className="gdn-event__time">{e.time}</p>}
                  {(e.venue || e.address) && <p className="gdn-event__venue"><b>{e.venue}</b>{e.address && <span>{e.address}</span>}</p>}
                  {(e.dressCode || e.colors?.length > 0) && (
                    <p className="gdn-event__dress"><span>Dress code</span>{e.dressCode}
                      {e.colors?.length > 0 && <span className="anc-swatches">{e.colors.map((col) => <i key={col} style={{ background: col }} title={col} />)}</span>}
                    </p>
                  )}
                  {e.note && <p className="gdn-event__note">{e.note}</p>}
                  <div className="gdn-event__actions">
                    {mapLink(e) && <a href={mapLink(e)} target="_blank" rel="noreferrer">Directions</a>}
                    <CalendarButtons inv={inv} event={e} />
                  </div>
                </Tilt>
              </div>
            ))}
          </div>
        </section>
      )}

      {(inv.gallery?.length > 0 || inv.couplePhoto) && (
        <section className="gdn-sec gdn-sec--wide">
          {head('Moments', 'A bouquet of memories')}
          <Bouquet photos={[...(inv.gallery || []), ...(inv.gallery?.includes(inv.couplePhoto) || !inv.couplePhoto ? [] : [inv.couplePhoto])].slice(0, 7)} />
        </section>
      )}

      <Tail inv={inv} slug={slug} token={token} preview={preview} p="gdn" head={head} words={{ wishK: 'Blessings', wishT: 'Plant a wish', close: 'With all our love' }} closeExtra={<Sprig className="gdn-close__sprig" />} />
    </div>
  );
}
