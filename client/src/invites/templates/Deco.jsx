import { useRef, useState } from 'react';
import { Countdown, CalendarButtons, MusicToggle, fmtDate, initials, mapLink, useInviteReveal } from '../parts.jsx';
import { Tilt, useOpening, useParallax, Lightbox, paragraphs, roman } from '../three.jsx';
import Tail from '../tail.jsx';

/**
 * Midnight Deco — navy night, champagne gold, a 1920s grand ballroom.
 * Opening: fly through a tunnel of gold art-deco arches.
 * Hero: three layers of stars with depth, a slowly turning sunburst, a stepped deco arch portrait.
 * Countdown is a split-flap board; events are theatre tickets with a gold sheen that follows the pointer;
 * the gallery hangs in deco frames.
 */

const LAYERS = 6;

const Fan = ({ className = '' }) => (
  <svg className={`dco-fan ${className}`} viewBox="0 0 240 44" aria-hidden="true">
    <path d="M0 38h84M156 38h84M0 42h70M170 42h70" />
    <path d="M90 38a30 30 0 0 1 60 0Z" />
    {Array.from({ length: 7 }, (_, i) => { const a = (Math.PI * (i + 1)) / 8; return <path key={i} d={`M120 38L${120 - Math.cos(a) * 30} ${38 - Math.sin(a) * 30}`} />; })}
    <path d="M120 2l5 6-5 6-5-6Z" className="is-fill" />
  </svg>
);

function Frames({ photos }) {
  const [big, setBig] = useState(-1);
  return (
    <>
      <div className="dco-gallery">
        {photos.map((src, i) => (
          <div key={src} className="dco-gallery__cell" data-inv-reveal style={{ '--d': `${(i % 3) * 100}ms` }}>
            <Tilt as="button" type="button" className="dco-frame" max={9} onClick={() => setBig(i)} aria-label={`Open photo ${i + 1}`}>
              <img src={src} alt="" loading="lazy" />
              <span className="dco-sheen" aria-hidden="true" />
            </Tilt>
          </div>
        ))}
      </div>
      <Lightbox photos={photos} index={big} setIndex={setBig} />
    </>
  );
}

export default function Deco({ inv, slug, token, preview }) {
  const { f, opened, leaving, open, playing, setPlaying } = useOpening(inv, 2500);
  const root = useRef(null);
  useParallax(root, opened);
  useInviteReveal(opened);

  const c = inv.couple || {};
  const hasCouple = c.p1Bio || c.p2Bio || c.p1Parents || c.p2Parents;
  const date = fmtDate(inv.weddingDate);
  const short = fmtDate(inv.weddingDate, { day: 'numeric', month: 'long', year: 'numeric' });
  const photos = [...(inv.gallery || [])].slice(0, 9);
  const head = (k, t) => (
    <div className="dco-head" data-inv-reveal>
      <p className="dco-k">{k}</p>
      <h2 className="dco-h2">{t}</h2>
      <Fan />
    </div>
  );

  return (
    <div ref={root} className={`dco ${opened ? 'is-open' : ''}`}>
      {!opened && (
        <div className={`dco-open ${leaving ? 'is-opening' : ''}`} role="dialog" aria-label="Open the invitation">
          <div className="dco-stars is-far" aria-hidden="true" />
          <div className="dco-tunnel" aria-hidden="true">
            {Array.from({ length: LAYERS }, (_, i) => <span key={i} className="dco-tunnel__arch" style={{ '--i': i }} />)}
          </div>
          <div className="dco-open__card">
            <Fan />
            <span className="dco-open__k">The pleasure of your company</span>
            <span className="dco-open__mono"><span>{initials(inv)}</span></span>
            <span className="dco-open__names">{inv.partner1} &amp; {inv.partner2}</span>
            {short && <span className="dco-open__date">{short}</span>}
            <button type="button" className="dco-btn" onClick={open}>Enter{inv.music ? ' · with music' : ''}</button>
          </div>
        </div>
      )}

      <MusicToggle src={inv.music} title={inv.musicTitle} playing={playing} setPlaying={setPlaying} />

      <header className="dco-hero">
        <div className="dco-stars is-far" aria-hidden="true" />
        <div className="dco-stars is-mid" aria-hidden="true" />
        <div className="dco-stars is-near" aria-hidden="true" />
        <div className="dco-burst" aria-hidden="true" />
        <div className="dco-hero__inner">
          <div className="dco-portal">
            <div className="dco-portal__arch">{inv.coverPhoto && <img src={inv.coverPhoto} alt="" />}</div>
          </div>
          <div className="dco-hero__text">
            <p className="dco-kicker">{inv.headline || 'We’re getting married'}</p>
            <h1 className="dco-names"><span>{inv.partner1}</span><i>&amp;</i><span>{inv.partner2}</span></h1>
            <Fan />
            {date && <p className="dco-date">{date}</p>}
            {inv.city && <p className="dco-city">{inv.city}</p>}
            {inv.hashtag && <p className="dco-tag">{inv.hashtag}</p>}
          </div>
        </div>
      </header>

      {inv.families && (
        <section className="dco-sec dco-intro" data-inv-reveal>
          <p className="dco-k">Request the pleasure of your company</p>
          <p className="dco-intro__text">{inv.families}</p>
        </section>
      )}

      {hasCouple && (
        <section className="dco-sec">
          <div className="dco-couple">
            {[1, 2].map((n) => (
              <article key={n} className="dco-person" data-inv-reveal style={{ '--d': `${(n - 1) * 140}ms` }}>
                <Tilt className="dco-person__pic" max={10}>{c[`p${n}Photo`] ? <img src={c[`p${n}Photo`]} alt={inv[`partner${n}`]} loading="lazy" /> : <b>{(inv[`partner${n}`] || '?')[0]}</b>}</Tilt>
                <h3>{inv[`partner${n}`]}</h3>
                {c[`p${n}Parents`] && <p className="dco-person__par">{c[`p${n}Parents`]}</p>}
                {c[`p${n}Bio`] && <p>{c[`p${n}Bio`]}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {f.countdown && inv.weddingDate && (
        <section className="dco-sec dco-countdown" data-inv-reveal>
          <p className="dco-k">The night begins in</p>
          <div className="dco-board"><Countdown date={inv.weddingDate} /></div>
        </section>
      )}

      {(inv.timeline?.length > 0 || inv.story) && (
        <section className="dco-sec">
          {head('Our story', 'Act by act')}
          {inv.timeline?.length > 0 ? (
            <ol className="dco-acts">
              {inv.timeline.map((t, i) => (
                <li key={i} className={i % 2 ? 'is-r' : 'is-l'} data-inv-reveal>
                  <span className="dco-acts__gem" aria-hidden="true" />
                  <div className="dco-acts__card">
                    <span className="dco-acts__no">Act {roman(i + 1)} · {t.year}</span>
                    <h3>{t.title}</h3>
                    {t.text && <p>{t.text}</p>}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="dco-prose" data-inv-reveal>{paragraphs(inv.story).map((p, i) => <p key={i}>{p}</p>)}</div>
          )}
        </section>
      )}

      {inv.events?.length > 0 && (
        <section className="dco-sec dco-sec--wide">
          {head('The evenings', 'Programme')}
          <div className="dco-tickets">
            {inv.events.map((e, i) => (
              <div key={`${e.name}-${i}`} data-inv-reveal style={{ '--d': `${(i % 2) * 120}ms` }}>
                <Tilt as="article" className="dco-ticket" max={5}>
                  <div className="dco-ticket__main">
                    <span className="dco-ticket__k">Guide Studio presents</span>
                    <h3>{e.name}</h3>
                    {(e.date || e.time) && <p className="dco-ticket__when">{[e.date && fmtDate(e.date, { weekday: 'long', day: 'numeric', month: 'long' }), e.time].filter(Boolean).join(' · ')}</p>}
                    {(e.venue || e.address) && <p className="dco-ticket__venue"><b>{e.venue}</b>{e.address && <span>{e.address}</span>}</p>}
                    {(e.dressCode || e.colors?.length > 0) && (
                      <p className="dco-ticket__dress"><span>Attire</span>{e.dressCode}
                        {e.colors?.length > 0 && <span className="anc-swatches">{e.colors.map((col) => <i key={col} style={{ background: col }} title={col} />)}</span>}
                      </p>
                    )}
                    {e.note && <p className="dco-ticket__note">{e.note}</p>}
                    <div className="dco-ticket__actions">
                      {mapLink(e) && <a href={mapLink(e)} target="_blank" rel="noreferrer">Directions</a>}
                      <CalendarButtons inv={inv} event={e} />
                    </div>
                  </div>
                  <div className="dco-ticket__stub" aria-hidden="true">
                    <span>Admit all</span>
                    <b>{String(i + 1).padStart(3, '0')}</b>
                  </div>
                  <span className="dco-sheen" aria-hidden="true" />
                </Tilt>
              </div>
            ))}
          </div>
        </section>
      )}

      {photos.length > 0 && (
        <section className="dco-sec dco-sec--wide">
          {head('Moments', 'In frame')}
          <Frames photos={photos} />
        </section>
      )}

      <Tail inv={inv} slug={slug} token={token} preview={preview} p="dco" head={head} words={{ rsvpK: 'Répondez s’il vous plaît', wishK: 'The guestbook', wishT: 'Raise a toast', close: 'Yours, under the stars' }} closeExtra={<Fan className="dco-close__fan" />} />
    </div>
  );
}
