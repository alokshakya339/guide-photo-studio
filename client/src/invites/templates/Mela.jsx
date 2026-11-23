import { useRef, useState } from 'react';
import { Countdown, CalendarButtons, MusicToggle, fmtDate, mapLink, useInviteReveal } from '../parts.jsx';
import { Tilt, useOpening, useParallax, Lightbox, paragraphs } from '../three.jsx';
import Tail from '../tail.jsx';

/**
 * Marigold Mela — haldi yellow, rani pink, parrot green, marigold orange.
 * Opening: a curtain of marigold garlands parts in 3D, strand by strand, with a confetti burst.
 * Hero: sunburst sky with kites flying at different depths; names in raised 3D lettering under a toran.
 * Events are mela stalls with striped awnings; the countdown hangs on swaying bunting;
 * the gallery rides a turning ferris wheel.
 */

const STRANDS = 16;
const KITES = [
  { x: 8, y: 22, s: 0.7, c: '#d81b72', d: 0 }, { x: 84, y: 14, s: 1, c: '#3f9b3a', d: -2 },
  { x: 70, y: 52, s: 0.55, c: '#f2862a', d: -4 }, { x: 18, y: 62, s: 0.9, c: '#7b2cbf', d: -1 },
  { x: 92, y: 70, s: 0.6, c: '#0f8fb3', d: -3 },
];
const STALLS = ['#d81b72', '#f2862a', '#3f9b3a', '#7b2cbf', '#0f8fb3'];

const Toran = ({ n = 14 }) => (
  <svg className="mel-toran" viewBox={`0 0 ${n * 50} 80`} preserveAspectRatio="none" aria-hidden="true">
    <path className="is-rope" d={`M0 8 ${Array.from({ length: n }, (_, i) => `Q${i * 50 + 25} 26 ${i * 50 + 50} 8`).join(' ')}`} />
    {Array.from({ length: n }, (_, i) => (
      <g key={i} transform={`translate(${i * 50 + 25} 17)`}>
        <g className="is-sway" style={{ animationDelay: `${-i * 0.3}s` }}>
          <path className="is-leaf" d="M0 0c7 8 7 22 0 32-7-10-7-24 0-32Z" />
          <circle className={`is-bloom ${i % 2 ? 'is-alt' : ''}`} cx="0" cy="40" r="10" />
          <circle className="is-core" cx="0" cy="40" r="3.5" />
        </g>
      </g>
    ))}
  </svg>
);

const Kite = ({ c }) => (
  <svg viewBox="0 0 60 120" aria-hidden="true">
    <path d="M30 2 58 40 30 78 2 40Z" fill={c} />
    <path d="M30 2 58 40 30 40Z" fill="#fff" opacity=".25" />
    <path d="M30 2v76M2 40h56" stroke="#fff" strokeWidth="1.2" opacity=".7" />
    <path d="M30 78c-6 8 6 14 0 22s6 14 0 20" stroke={c} strokeWidth="1.6" fill="none" />
    <path d="M24 88l6 4 6-4-6-3Z M24 104l6 4 6-4-6-3Z" fill="#f7c325" />
  </svg>
);

/** Photos ride a turning ferris wheel; cabins stay upright. Tap a cabin to open it. */
function Wheel({ photos }) {
  const [big, setBig] = useState(-1);
  const n = photos.length;
  return (
    <>
      <div className="mel-wheel" style={{ '--n': n }} data-inv-reveal>
        <div className="mel-wheel__rim">
          {Array.from({ length: n }, (_, i) => <span key={i} className="mel-wheel__spoke" style={{ '--a': `${(360 / n) * i}deg` }} />)}
          {photos.map((src, i) => (
            <span key={src} className="mel-wheel__arm" style={{ '--a': `${(360 / n) * i}deg` }}>
              <button type="button" className="mel-wheel__cabin" onClick={() => setBig(i)} aria-label={`Open photo ${i + 1}`} style={{ '--c': STALLS[i % STALLS.length] }}>
                <img src={src} alt="" loading="lazy" />
              </button>
            </span>
          ))}
          <span className="mel-wheel__hub" />
        </div>
        <span className="mel-wheel__legs" aria-hidden="true" />
      </div>
      <Lightbox photos={photos} index={big} setIndex={setBig} />
    </>
  );
}

export default function Mela({ inv, slug, token, preview }) {
  const { f, opened, leaving, open, playing, setPlaying } = useOpening(inv, 2400);
  const root = useRef(null);
  useParallax(root, opened);
  useInviteReveal(opened);

  const c = inv.couple || {};
  const hasCouple = c.p1Bio || c.p2Bio || c.p1Parents || c.p2Parents;
  const date = fmtDate(inv.weddingDate);
  const short = fmtDate(inv.weddingDate, { day: 'numeric', month: 'long', year: 'numeric' });
  const photos = [...(inv.gallery || []), inv.couplePhoto].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 8);
  const head = (k, t) => (
    <div className="mel-head" data-inv-reveal>
      <p className="mel-k">{k}</p>
      <h2 className="mel-h2">{t}</h2>
      <span className="mel-dots" aria-hidden="true"><i /><i /><i /><i /><i /></span>
    </div>
  );

  return (
    <div ref={root} className={`mel ${opened ? 'is-open' : ''}`}>
      {!opened && (
        <div className={`mel-open ${leaving ? 'is-opening' : ''}`} role="dialog" aria-label="Open the invitation">
          <div className="mel-curtain" aria-hidden="true">
            {Array.from({ length: STRANDS }, (_, i) => {
              const side = i < STRANDS / 2 ? -1 : 1;
              const fromMid = side < 0 ? STRANDS / 2 - 1 - i : i - STRANDS / 2;
              return (
                <span key={i} className="mel-strand" style={{ '--x': `${(i + 0.5) * (100 / STRANDS)}%`, '--side': side, '--dl': `${fromMid * 0.06}s`, '--sw': `${-i * 0.37}s` }}>
                  {Array.from({ length: 44 }, (_, k) => <i key={k} className={k % 4 === 3 ? 'is-leaf' : k % 2 ? 'is-y' : ''} />)}
                </span>
              );
            })}
          </div>
          <div className="mel-open__card">
            <p className="mel-open__k">॥ शुभ विवाह ॥</p>
            <p className="mel-open__names">{inv.partner1} <i>&amp;</i> {inv.partner2}</p>
            {short && <p className="mel-open__date">{short}</p>}
            <button type="button" className="mel-btn" onClick={open}>Open the doors{inv.music ? ' ♪' : ''}</button>
          </div>
          <div className="mel-confetti" aria-hidden="true">{Array.from({ length: 36 }, (_, i) => <i key={i} style={{ '--a': `${i * 10}deg`, '--d': `${120 + (i * 37) % 160}px`, '--c': STALLS[i % 5] }} />)}</div>
        </div>
      )}

      <MusicToggle src={inv.music} title={inv.musicTitle} playing={playing} setPlaying={setPlaying} />

      <header className="mel-hero">
        <div className="mel-hero__sun" aria-hidden="true" />
        <Toran />
        <div className="mel-kites" aria-hidden="true">
          {KITES.map((k, i) => (
            <span key={i} className="mel-kite" style={{ '--x': `${k.x}%`, '--y': `${k.y}%`, '--s': k.s, '--d': `${k.d}s` }}><Kite c={k.c} /></span>
          ))}
        </div>
        <div className="mel-hero__inner">
          <p className="mel-kicker">{inv.headline || 'We’re getting married'}</p>
          <h1 className="mel-names"><span>{inv.partner1}</span><i>&amp;</i><span>{inv.partner2}</span></h1>
          {date && <p className="mel-date">{date}</p>}
          {inv.city && <p className="mel-city">{inv.city}</p>}
          {inv.coverPhoto && <div className="mel-hero__photo"><img src={inv.coverPhoto} alt="" /></div>}
          {inv.hashtag && <p className="mel-tag">{inv.hashtag}</p>}
        </div>
      </header>

      {inv.families && (
        <section className="mel-sec mel-intro" data-inv-reveal>
          <p className="mel-k">With the blessings of our elders</p>
          <p className="mel-intro__text">{inv.families}</p>
        </section>
      )}

      {hasCouple && (
        <section className="mel-sec">
          <div className="mel-couple">
            {[1, 2].map((n) => (
              <article key={n} className="mel-person" data-inv-reveal style={{ '--d': `${(n - 1) * 140}ms` }}>
                <span className="mel-rangoli" style={{ '--c': n === 1 ? '#d81b72' : '#f2862a' }}>
                  <span className="mel-rangoli__pic">{c[`p${n}Photo`] ? <img src={c[`p${n}Photo`]} alt={inv[`partner${n}`]} loading="lazy" /> : <b>{(inv[`partner${n}`] || '?')[0]}</b>}</span>
                </span>
                <h3>{inv[`partner${n}`]}</h3>
                {c[`p${n}Parents`] && <p className="mel-person__par">{c[`p${n}Parents`]}</p>}
                {c[`p${n}Bio`] && <p>{c[`p${n}Bio`]}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {f.countdown && inv.weddingDate && (
        <section className="mel-sec mel-countdown" data-inv-reveal>
          <p className="mel-k">The dhol starts in</p>
          <div className="mel-bunting"><Countdown date={inv.weddingDate} /></div>
        </section>
      )}

      {(inv.timeline?.length > 0 || inv.story) && (
        <section className="mel-sec">
          {head('Our story', 'Kahaani so far')}
          {inv.timeline?.length > 0 ? (
            <ol className="mel-stamps">
              {inv.timeline.map((t, i) => (
                <li key={i} data-inv-reveal style={{ '--d': `${i * 110}ms`, '--c': STALLS[(i + 1) % 5], '--r': `${[-3, 2, -1.5, 2.5][i % 4]}deg` }}>
                  <Tilt className="mel-stamp" max={8}>
                    <span className="mel-stamp__y">{t.year}</span>
                    <h3>{t.title}</h3>
                    {t.text && <p>{t.text}</p>}
                  </Tilt>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mel-prose" data-inv-reveal>{paragraphs(inv.story).map((p, i) => <p key={i}>{p}</p>)}</div>
          )}
        </section>
      )}

      {inv.events?.length > 0 && (
        <section className="mel-sec mel-sec--wide mel-fair">
          {head('The festivities', 'Come celebrate')}
          <div className="mel-stalls">
            {inv.events.map((e, i) => (
              <div key={`${e.name}-${i}`} className="mel-stalls__cell" data-inv-reveal style={{ '--d': `${(i % 4) * 110}ms` }}>
                <Tilt as="article" className="mel-stall" max={6} style={{ '--c': STALLS[i % STALLS.length] }}>
                  <div className="mel-stall__awning" aria-hidden="true" />
                  <div className="mel-stall__board"><h3>{e.name}</h3></div>
                  <div className="mel-stall__body">
                    {e.date && <p className="mel-stall__date">{fmtDate(e.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>}
                    {e.time && <p className="mel-stall__time">{e.time}</p>}
                    {(e.venue || e.address) && <p className="mel-stall__venue"><b>{e.venue}</b>{e.address && <span>{e.address}</span>}</p>}
                    {(e.dressCode || e.colors?.length > 0) && (
                      <p className="mel-stall__dress"><span>Dress code</span>{e.dressCode}
                        {e.colors?.length > 0 && <span className="anc-swatches">{e.colors.map((col) => <i key={col} style={{ background: col }} title={col} />)}</span>}
                      </p>
                    )}
                    {e.note && <p className="mel-stall__note">{e.note}</p>}
                    <div className="mel-stall__actions">
                      {mapLink(e) && <a href={mapLink(e)} target="_blank" rel="noreferrer">Directions</a>}
                      <CalendarButtons inv={inv} event={e} />
                    </div>
                  </div>
                </Tilt>
              </div>
            ))}
          </div>
        </section>
      )}

      {photos.length >= 3 && (
        <section className="mel-sec mel-sec--wide">
          {head('Moments', 'Round and round we go')}
          <Wheel photos={photos} />
        </section>
      )}

      <Tail inv={inv} slug={slug} token={token} preview={preview} p="mel" head={head} words={{ wishK: 'Aashirwad', wishT: 'Send your blessings', close: 'With love and laddoos' }} closeExtra={<Toran n={7} />} />
    </div>
  );
}
