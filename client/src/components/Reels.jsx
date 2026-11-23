import { useCallback, useEffect, useRef, useState } from 'react';
import { SITE } from '../site.js';
import ShortsViewer from './ShortsViewer.jsx';
import { IconPlay, IconChevron, IconInstagram, IconYoutube, IconFacebook, IconWhatsApp, IconClose } from './Icons.jsx';

const thumb = (r) => r.thumbnail || `/images/reels/${r.id}.jpg`;

// Always starts muted (the only reliable autoplay); sound is switched on later through the IFrame API,
// so the src never changes and the video never reloads.
const embedSrc = (id) =>
  `https://www.youtube-nocookie.com/embed/${id}?${new URLSearchParams({
    autoplay: 1, mute: 1, playsinline: 1, loop: 1, playlist: id, rel: 0, modestbranding: 1, controls: 0,
    iv_load_policy: 3, enablejsapi: 1, origin: window.location.origin,
  })}`;

/** Send a YouTube IFrame API command (works because enablejsapi=1). */
function yt(iframe, func, args = []) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
}

function IconSound({ off, ...p }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      {off ? <path d="m22 9-6 6M16 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
    </svg>
  );
}

function IconExpand(p) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

/**
 * Centre-focused carousel of vertical YouTube Shorts.
 * Nothing plays until the user taps a card; it then plays inline with sound (pass `autoplay` to
 * restore muted autoplay of the centred Short). The expand button opens the full-screen viewer.
 */
export default function Reels({ reels = SITE.reels, eyebrow = 'Reels', title = <>Stories <em>in motion</em></>, intro, autoplay = false }) {
  const root = useRef(null);
  const track = useRef(null);
  const [active, setActive] = useState(Math.floor((reels.length - 1) / 2)); // start on the middle reel so both sides are balanced
  const [playing, setPlaying] = useState(null); // { i, muted }
  const frames = useRef({});
  const [inView, setInView] = useState(false);
  const [stopped, setStopped] = useState(null); // index the user closed manually
  const [viewer, setViewer] = useState(null); // index open in the full-screen Shorts viewer
  const pendingPlay = useRef(null); // card the user tapped while it was off-centre — play once it's centred

  const canAutoplay =
    autoplay &&
    typeof window !== 'undefined' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    !navigator.connection?.saveData;

  const cards = () => [...(track.current?.children || [])];

  const scrollToCard = useCallback((i, smooth = true) => {
    const el = cards()[i];
    const t = track.current;
    if (!el || !t) return;
    t.scrollTo({ left: el.offsetLeft - (t.clientWidth - el.clientWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Start centred on the middle card.
  useEffect(() => {
    scrollToCard(active, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Which card is closest to the centre while the user scrolls/swipes.
  useEffect(() => {
    const t = track.current;
    if (!t) return undefined;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const mid = t.scrollLeft + t.clientWidth / 2;
        let best = 0;
        let dist = Infinity;
        cards().forEach((c, i) => {
          const d = Math.abs(c.offsetLeft + c.clientWidth / 2 - mid);
          if (d < dist) { dist = d; best = i; }
        });
        setActive(best);
      });
    };
    t.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      t.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Is the carousel itself on screen? (≥ 55% of the cards visible)
  useEffect(() => {
    const el = track.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.55 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Autoplay the centred reel (muted) once it settles; stop when scrolled away.
  useEffect(() => {
    if (!inView || viewer != null) {
      setPlaying(null);
      return undefined;
    }
    if (playing && playing.i === active) return undefined;
    if (playing && playing.i !== active) setPlaying(null);
    if (pendingPlay.current === active) {
      pendingPlay.current = null;
      setPlaying({ i: active, muted: false }); // user tapped it → play with sound
      return undefined;
    }
    if (!canAutoplay || stopped === active) return undefined;
    if (reels[active]?.platform === 'instagram') return undefined; // Instagram can't autoplay inline — tap opens the viewer
    const t = setTimeout(() => setPlaying({ i: active, muted: true }), 450); // wait for swipes to settle
    return () => clearTimeout(t);
  }, [inView, active, playing, canAutoplay, stopped, viewer, reels]);

  // A manual stop only applies to that card.
  useEffect(() => {
    if (stopped != null && stopped !== active) setStopped(null);
  }, [active, stopped]);

  const go = (d) => scrollToCard(Math.max(0, Math.min(reels.length - 1, active + d)));

  function onCard(i) {
    setStopped(null);
    if (reels[i]?.platform === 'instagram') {
      // Instagram can't play inline — open the full-screen viewer instead
      if (i !== active) scrollToCard(i);
      setViewer(i);
      return;
    }
    if (i !== active) {
      pendingPlay.current = i; // centre it first; the effect above starts it once it's the active card
      scrollToCard(i);
      return;
    }
    setPlaying({ i, muted: false }); // tap is the user gesture → plays inline with sound
  }

  /** Unmute / mute the inline reel without reloading it (the tap is the user gesture browsers require). */
  function toggleSound(i) {
    const f = frames.current[i];
    setPlaying((p) => {
      if (!p || p.i !== i) return p;
      const muted = !p.muted;
      if (muted) yt(f, 'mute');
      else { yt(f, 'unMute'); yt(f, 'setVolume', [100]); yt(f, 'playVideo'); }
      return { ...p, muted };
    });
  }

  function closeViewer(lastIndex) {
    setViewer(null);
    if (lastIndex != null && lastIndex !== active) scrollToCard(lastIndex, false);
  }

  return (
    <div className="reels" ref={root}>
      <div className="reels__head">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
          <p className="lead">{intro || 'Short films from recent weddings, engagements and celebrations, straight from our camera.'}</p>
        </div>
        <div className="reels__social" aria-label="Follow us">
          <a href={SITE.social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><IconInstagram width={22} height={22} /></a>
          <a href={SITE.social.youtube} target="_blank" rel="noreferrer" aria-label="YouTube"><IconYoutube width={22} height={22} /></a>
          <a href={SITE.social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><IconFacebook width={22} height={22} /></a>
          <a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noreferrer" aria-label="WhatsApp"><IconWhatsApp width={22} height={22} /></a>
        </div>
      </div>

      <div className="reels__stage">
        <div className="reels__track" ref={track}>
          {reels.map((r, i) => {
            const isActive = i === active;
            const play = playing?.i === i ? playing : null;
            return (
              <article key={r.id} className={`reel ${isActive ? 'is-active' : ''} ${play ? 'is-playing' : ''}`}>
                {/* Poster stays underneath so there's no black flash while the player loads */}
                <button
                  className="reel__poster"
                  onClick={() => onCard(i)}
                  aria-label={`Play ${r.title}`}
                  tabIndex={play ? -1 : 0}
                >
                  <img src={thumb(r)} alt="" loading="lazy" draggable="false" />
                  {!play && <span className="reel__play"><IconPlay width={26} height={26} /></span>}
                  {r.platform === 'instagram' && <span className="reel__src" aria-label="Instagram reel"><IconInstagram width={15} height={15} /></span>}
                  <span className="reel__meta">
                    {r.tag && <span className="reel__tag">{r.tag}</span>}
                    <strong>{r.title}</strong>
                  </span>
                </button>

                {play && (
                  <>
                    <iframe
                      ref={(el) => { frames.current[i] = el; }}
                      src={embedSrc(r.id)}
                      title={r.title}
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      className="is-muted"
                      onLoad={(e) => {
                        // register as a listener so the player accepts API commands
                        e.currentTarget.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: r.id }), '*');
                        if (!play.muted) { yt(e.currentTarget, 'unMute'); yt(e.currentTarget, 'setVolume', [100]); }
                      }}
                    />
                    {/* Our overlay keeps the card tappable (YouTube's own controls are hidden) */}
                    <button className="reel__tapzone" onClick={() => setViewer(i)} aria-label={`Open ${r.title} full screen`} />
                    <span className="reel__meta reel__meta--over" aria-hidden="true">
                      {r.tag && <span className="reel__tag">{r.tag}</span>}
                      <strong>{r.title}</strong>
                    </span>
                    <button
                      className={`reel__sound ${play.muted ? '' : 'is-on'}`}
                      onClick={() => toggleSound(i)}
                      aria-pressed={!play.muted}
                    >
                      <IconSound off={play.muted} /> {play.muted ? 'Tap for sound' : 'Sound on'}
                    </button>
                    <button className="reel__expand" onClick={() => setViewer(i)} aria-label={`Open ${r.title} full screen`}>
                      <IconExpand />
                    </button>
                    <button
                      className="reel__close"
                      onClick={() => { setPlaying(null); setStopped(i); }}
                      aria-label="Stop video"
                    >
                      <IconClose width={18} height={18} />
                    </button>
                  </>
                )}
              </article>
            );
          })}
        </div>

        {reels.length > 1 && (
          <>
            <button className="reels__nav reels__nav--prev" onClick={() => go(-1)} disabled={active === 0} aria-label="Previous reel">
              <IconChevron dir="left" />
            </button>
            <button className="reels__nav reels__nav--next" onClick={() => go(1)} disabled={active === reels.length - 1} aria-label="Next reel">
              <IconChevron />
            </button>
          </>
        )}
      </div>

      {viewer != null && <ShortsViewer reels={reels} start={viewer} onClose={closeViewer} />}

      {reels.length > 1 && (
        <div className="reels__dots" role="tablist" aria-label="Choose reel">
          {reels.map((r, i) => (
            <button key={r.id} role="tab" aria-selected={i === active} aria-label={r.title} className={i === active ? 'is-active' : ''} onClick={() => scrollToCard(i)} />
          ))}
        </div>
      )}
    </div>
  );
}
