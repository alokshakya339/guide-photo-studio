import { useEffect, useRef, useState } from 'react';
import { Countdown, CalendarButtons, MusicToggle, Gallery, Film, Rsvp, Wishes, Share, fmtDate, initials, mapLink, useInviteReveal } from '../parts.jsx';
import { Tilt, useOpening, Embers, waLink, paragraphs, roman } from '../three.jsx';

/**
 * Royal Codex — an illuminated book of ages: emerald leather, gilt tooling, cream vellum, oxblood ink.
 * Opening: a closed 3D book turns to face you and its cover swings open.
 * Each chapter turns in like a page; events are folios that flip over to show the details;
 * the gallery is a 3D ring of gilded plates you can spin.
 */

const Jharokha = () => (
  <svg className="cdx-jharokha" viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden="true">
    <path d="M6 120V58C6 30 40 8 100 4c60 4 94 26 94 54v62" />
    <path className="is-in" d="M22 120V62c0-22 28-40 78-44 50 4 78 22 78 44v58" />
    <path className="is-in" d="M100 4v-4M60 14l-4-6M140 14l4-6" />
  </svg>
);

/** Event card that flips over in 3D. The hidden face is inert so keyboard users never tab into it. */
function Folio({ inv, e, i }) {
  const [flip, setFlip] = useState(false);
  const hide = (h) => (h ? { inert: '', 'aria-hidden': true } : {});
  return (
    <div className={`cdx-folio ${flip ? 'is-flipped' : ''}`}>
      <div className="cdx-folio__inner">
        <div className="cdx-folio__face is-front" {...hide(flip)}>
          <Jharokha />
          <span className="cdx-folio__num">Folio {roman(i + 1)}</span>
          <h3>{e.name}</h3>
          {e.date && <p className="cdx-folio__date">{fmtDate(e.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>}
          {e.time && <p className="cdx-folio__time">{e.time}</p>}
          {e.venue && <p className="cdx-folio__venue">{e.venue}</p>}
          <button type="button" className="cdx-folio__turn" onClick={() => setFlip(true)}>Turn the folio <span aria-hidden="true">↻</span></button>
        </div>
        <div className="cdx-folio__face is-back" {...hide(!flip)}>
          <span className="cdx-folio__num">{e.name}</span>
          {(e.venue || e.address) && <p className="cdx-folio__place"><b>{e.venue}</b>{e.address && <span>{e.address}</span>}</p>}
          {(e.dressCode || e.colors?.length > 0) && (
            <div className="cdx-folio__dress">
              <span>Attire</span>{e.dressCode}
              {e.colors?.length > 0 && <div className="anc-swatches" aria-label="Dress-code colours">{e.colors.map((col) => <i key={col} style={{ background: col }} title={col} />)}</div>}
            </div>
          )}
          {e.note && <p className="cdx-folio__note">{e.note}</p>}
          <div className="cdx-folio__actions">
            {mapLink(e) && <a href={mapLink(e)} target="_blank" rel="noreferrer">Directions</a>}
            <CalendarButtons inv={inv} event={e} />
          </div>
          <button type="button" className="cdx-folio__turn" onClick={() => setFlip(false)}><span aria-hidden="true">↺</span> Turn back</button>
        </div>
      </div>
    </div>
  );
}

/** 3D ring of gilded plates. Swipe, arrow keys or the buttons spin it; the front plate opens full size. */
function Ring({ photos }) {
  const n = photos.length;
  const [turn, setTurn] = useState(0);
  const [big, setBig] = useState(-1);
  const down = useRef(null);
  const cur = ((turn % n) + n) % n;
  const step = 360 / n;
  const depth = (0.5 / Math.tan(Math.PI / n) + 0.18).toFixed(3); // ring radius as a multiple of plate width
  useEffect(() => {
    if (big < 0) return undefined;
    const k = (e) => { if (e.key === 'Escape') setBig(-1); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [big]);
  const go = (k) => { let d = k - cur; if (d > n / 2) d -= n; if (d < -n / 2) d += n; setTurn((t) => t + d); };
  return (
    <div className="cdx-ring" style={{ '--depth': depth }}>
      <div
        className="cdx-ring__stage"
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={`Photo ${cur + 1} of ${n}. Use the arrow keys to turn.`}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') setTurn((t) => t + 1); if (e.key === 'ArrowLeft') setTurn((t) => t - 1); }}
        onPointerDown={(e) => { down.current = e.clientX; }}
        onPointerUp={(e) => { if (down.current == null) return; const dx = e.clientX - down.current; down.current = null; if (Math.abs(dx) > 40) setTurn((t) => t + (dx < 0 ? 1 : -1)); }}
      >
        <div className="cdx-ring__spin" style={{ transform: `translateZ(calc(var(--w) * var(--depth) * -1)) rotateY(${-turn * step}deg)` }}>
          {photos.map((src, k) => (
            <button
              key={src}
              type="button"
              className={`cdx-ring__plate ${k === cur ? 'is-front' : ''}`}
              style={{ transform: `rotateY(${k * step}deg) translateZ(calc(var(--w) * var(--depth)))` }}
              onClick={() => (k === cur ? setBig(k) : go(k))}
              tabIndex={k === cur ? 0 : -1}
              aria-label={k === cur ? `Enlarge photo ${k + 1}` : `Show photo ${k + 1}`}
            >
              <img src={src} alt="" loading="lazy" draggable="false" />
            </button>
          ))}
        </div>
      </div>
      <div className="cdx-ring__nav">
        <button type="button" onClick={() => setTurn((t) => t - 1)} aria-label="Previous photo">‹</button>
        <span>Plate {roman(cur + 1)} <i>of</i> {roman(n)}</span>
        <button type="button" onClick={() => setTurn((t) => t + 1)} aria-label="Next photo">›</button>
      </div>
      {big >= 0 && (
        <div className="inv-lightbox" role="dialog" aria-modal="true" onClick={() => setBig(-1)}>
          <img src={photos[big]} alt="" onClick={(e) => e.stopPropagation()} />
          <button type="button" className="inv-lightbox__close" onClick={() => setBig(-1)} aria-label="Close">×</button>
        </div>
      )}
    </div>
  );
}

export default function Codex({ inv, slug, token, preview }) {
  const { f, lux, opened, leaving, open, playing, setPlaying } = useOpening(inv, 2900);
  useInviteReveal(opened);

  const c = inv.couple || {};
  const hasCouple = c.p1Bio || c.p2Bio || c.p1Parents || c.p2Parents;
  const draft = inv.preview && inv.status !== 'published';
  const date = fmtDate(inv.weddingDate);
  const short = fmtDate(inv.weddingDate, { day: 'numeric', month: 'long', year: 'numeric' });
  let ch = 0;
  const chapter = (t) => { ch += 1; return (
    <div className="cdx-head">
      <p className="cdx-k">Chapter {roman(ch)}</p>
      <h2 className="cdx-h2">{t}</h2>
      <span className="cdx-fleuron" aria-hidden="true">❦</span>
    </div>
  ); };

  return (
    <div className={`cdx ${opened ? 'is-open' : ''}`}>
      {!opened && (
        <div className={`cdx-open ${leaving ? 'is-opening' : ''}`} role="dialog" aria-label="Open the invitation">
          <div className="cdx-open__stage" onClick={open} aria-hidden="true">
            <div className="cdx-book">
              <span className="cdx-book__back" />
              <span className="cdx-book__pages" />
              <span className="cdx-book__top" />
              <span className="cdx-book__spine"><em>{inv.partner1} &amp; {inv.partner2}</em></span>
              <span className="cdx-book__first">
                <span className="cdx-book__first-k">You are invited</span>
                <span className="cdx-book__first-n">{inv.partner1} <i>&amp;</i> {inv.partner2}</span>
                {short && <span className="cdx-book__first-d">{short}</span>}
              </span>
              <span className="cdx-book__cover">
                <span className="cdx-book__front">
                  <span className="cdx-book__tool" />
                  <span className="cdx-book__medal">{initials(inv)}</span>
                  <span className="cdx-book__title">{inv.partner1}<i>&amp;</i>{inv.partner2}</span>
                  <span className="cdx-book__sub">The Book of Our Wedding</span>
                </span>
                <span className="cdx-book__inside" />
              </span>
            </div>
          </div>
          <button type="button" className="cdx-open__btn" onClick={open}>Open the book{inv.music ? ' · with music' : ''}</button>
        </div>
      )}

      <MusicToggle src={inv.music} title={inv.musicTitle} playing={playing} setPlaying={setPlaying} />
      {lux && opened && <Embers count={18} className="cdx-dust" />}

      <div className="cdx-library">
        {/* Frontispiece */}
        <header className="cdx-front">
          <div className="cdx-page cdx-page--title">
            <Tilt className="cdx-frame" max={6}>
              {inv.coverPhoto ? <img src={inv.coverPhoto} alt="" /> : <span className="cdx-frame__mono">{initials(inv)}</span>}
            </Tilt>
            <div className="cdx-title">
              <p className="cdx-k">{inv.headline || 'We’re getting married'}</p>
              <h1 className="cdx-names"><span>{inv.partner1}</span><i>&amp;</i><span>{inv.partner2}</span></h1>
              <span className="cdx-fleuron" aria-hidden="true">❦</span>
              {date && <p className="cdx-date">{date}</p>}
              {inv.city && <p className="cdx-city">{inv.city}</p>}
              {inv.hashtag && <p className="cdx-tag">{inv.hashtag}</p>}
            </div>
          </div>
        </header>

        {inv.families && (
          <section className="cdx-sec">
            <div className="cdx-page cdx-turn cdx-prologue" data-inv-reveal>
              <p className="cdx-k">Prologue</p>
              <p className="cdx-drop">{inv.families}</p>
            </div>
          </section>
        )}

        {hasCouple && (
          <section className="cdx-sec">
            <div className="cdx-page cdx-turn" data-inv-reveal>
              {chapter('The bride & the groom')}
              <div className="cdx-couple">
                {[1, 2].map((n) => (
                  <article key={n} className="cdx-person">
                    <Tilt className="cdx-oval" max={10}>{c[`p${n}Photo`] ? <img src={c[`p${n}Photo`]} alt={inv[`partner${n}`]} loading="lazy" /> : <b>{(inv[`partner${n}`] || '?')[0]}</b>}</Tilt>
                    <h3>{inv[`partner${n}`]}</h3>
                    {c[`p${n}Parents`] && <p className="cdx-person__par">{c[`p${n}Parents`]}</p>}
                    {c[`p${n}Bio`] && <p>{c[`p${n}Bio`]}</p>}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {f.countdown && inv.weddingDate && (
          <section className="cdx-sec cdx-countdown" data-inv-reveal>
            <div className="cdx-bookplate">
              <p className="cdx-k">Ex libris · the day draws near</p>
              <Countdown date={inv.weddingDate} />
            </div>
          </section>
        )}

        {(inv.timeline?.length > 0 || inv.story || inv.couplePhoto) && (
          <section className="cdx-sec">
            <div className="cdx-spread cdx-turn" data-inv-reveal>
              <div className="cdx-spread__l">
                {chapter('Our story')}
                {inv.couplePhoto && <Tilt className="cdx-plate" max={6}><img src={inv.couplePhoto} alt={`${inv.partner1} and ${inv.partner2}`} loading="lazy" /></Tilt>}
              </div>
              <div className="cdx-spread__r">
                {inv.timeline?.length > 0 ? (
                  <ol className="cdx-annals">
                    {inv.timeline.map((t, i) => (
                      <li key={i}>
                        <span className="cdx-annals__no">{roman(i + 1)}.</span>
                        <div><span className="cdx-annals__y">Anno {t.year}</span><h3>{t.title}</h3>{t.text && <p>{t.text}</p>}</div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="cdx-prose">{paragraphs(inv.story).map((p, i) => <p key={i} className={i === 0 ? 'cdx-drop' : ''}>{p}</p>)}</div>
                )}
              </div>
            </div>
          </section>
        )}

        {inv.events?.length > 0 && (
          <section className="cdx-sec cdx-sec--wide">
            {chapter('The ceremonies')}
            <div className="cdx-folios">
              {inv.events.map((e, i) => (
                <div key={`${e.name}-${i}`} data-inv-reveal style={{ '--d': `${(i % 4) * 110}ms` }}><Folio inv={inv} e={e} i={i} /></div>
              ))}
            </div>
          </section>
        )}

        {inv.gallery?.length > 0 && (
          <section className="cdx-sec cdx-sec--wide" data-inv-reveal>
            {chapter('Plates')}
            {inv.gallery.length >= 3 ? <Ring photos={inv.gallery} /> : <Gallery photos={inv.gallery} />}
          </section>
        )}

        {inv.videoId && (
          <section className="cdx-sec cdx-sec--wide" data-inv-reveal>
            <p className="cdx-k">Our film</p>
            <div className="cdx-film"><Film id={inv.videoId} poster={inv.couplePhoto} /></div>
          </section>
        )}

        {inv.rsvpEnabled && (
          <section className="cdx-sec" id="rsvp">
            <div className="cdx-page cdx-turn" data-inv-reveal>
              {chapter('Your reply')}
              {inv.rsvpDeadline && <p className="cdx-sub">Kindly reply by {fmtDate(inv.rsvpDeadline, { day: 'numeric', month: 'long' })}</p>}
              <Rsvp inv={inv} slug={slug} token={token} preview={preview} />
            </div>
          </section>
        )}

        {inv.wishesEnabled && (
          <section className="cdx-sec">
            <div className="cdx-page cdx-turn" data-inv-reveal>
              {chapter('The guestbook')}
              <Wishes slug={slug} preview={preview} draft={draft} />
            </div>
          </section>
        )}

        {inv.contacts?.length > 0 && (
          <section className="cdx-sec" data-inv-reveal>
            <p className="cdx-k cdx-k--light">Questions? Reach the family</p>
            <ul className="cdx-contacts">
              {inv.contacts.map((p, i) => (
                <li key={i}><b>{p.name}</b>{p.role && <span>{p.role}</span>}{p.phone && <a href={waLink(p.phone)} target="_blank" rel="noreferrer">WhatsApp</a>}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="cdx-sec cdx-close" data-inv-reveal>
          <p className="cdx-close__finis">Finis</p>
          <p className="cdx-close__k">Here begins our next chapter — with you.</p>
          <p className="cdx-close__names">{inv.partner1} &amp; {inv.partner2}</p>
          <span className="cdx-seal" aria-hidden="true"><em>{initials(inv)}</em></span>
          <Share inv={inv} />
        </section>

        <footer className="cdx-foot">
          <a href="/" target="_blank" rel="noreferrer">Invitation crafted by <b>Guide Studio</b></a>
          {inv.showStudioCta && <a className="cdx-foot__cta" href="/contact?type=Wedding" target="_blank" rel="noreferrer">Planning your own wedding? Explore our photography →</a>}
        </footer>
      </div>
    </div>
  );
}
