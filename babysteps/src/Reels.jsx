import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon, WhatsAppIcon } from './Icons.jsx';
import { STUDIO, REELS } from './data.js';
import { Label, waLink } from './lib.jsx';

// Each reel is an Instagram reel or a YouTube Short (platform comes from content.js → parseReel).
export const isYt = (r) => r.platform === 'youtube';
export const reelUrl = (r) => (isYt(r) ? `https://www.youtube.com/shorts/${r.id}` : `https://www.instagram.com/reel/${r.id}/`);
export const embedUrl = (r, autoplay = false) => (isYt(r)
  ? `https://www.youtube-nocookie.com/embed/${r.id}?${new URLSearchParams({ playsinline: 1, rel: 0, modestbranding: 1, loop: 1, playlist: r.id, autoplay: autoplay ? 1 : 0 })}`
  : `https://www.instagram.com/reel/${r.id}/embed/`);
export const coverOf = (r) => r.cover || (isYt(r) ? `https://i.ytimg.com/vi/${r.id}/oar2.jpg` : `/images/reels/${r.id}.jpg`);

export function IconPlay(p) {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}><path d="M8 5.5v13a1 1 0 001.5.86l10.5-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z" /></svg>;
}
function IconExpand(p) {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>;
}

/**
 * Centre-focused carousel of Instagram reels and YouTube Shorts.
 * Instagram only allows playback through its own embed (which always needs its own play tap), so the centred
 * card shows that player directly — one tap plays; the expand button opens a larger player; "Instagram" opens the reel in the app.
 */
export default function Reels({ reels = REELS, title = <>Stories <em>in motion</em></>, intro = 'Little moments from our studio — behind the scenes, family sessions and our podcast.' }) {
  const track = useRef(null);
  const [active, setActive] = useState(Math.floor((reels.length - 1) / 2));
  const [live, setLive] = useState(null); // card showing Instagram's player (the centred one, once swiping settles)
  const [viewer, setViewer] = useState(null);
  const section = useRef(null);
  const [near, setNear] = useState(false); // Instagram's player (≈1 MB) loads only once the reels are on screen

  useEffect(() => {
    const el = section.current;
    if (!el || !('IntersectionObserver' in window)) { setNear(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: '200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cards = () => [...(track.current?.children || [])];
  const scrollToCard = useCallback((i, smooth = true) => {
    const el = cards()[i];
    const t = track.current;
    if (!el || !t) return;
    t.scrollTo({ left: el.offsetLeft - (t.clientWidth - el.clientWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => { scrollToCard(active, false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track which card is centred while swiping.
  useEffect(() => {
    const t = track.current;
    if (!t) return undefined;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const mid = t.scrollLeft + t.clientWidth / 2;
        let best = 0; let dist = Infinity;
        cards().forEach((c, i) => {
          const d = Math.abs(c.offsetLeft + c.clientWidth / 2 - mid);
          if (d < dist) { dist = d; best = i; }
        });
        setActive(best);
      });
    };
    t.addEventListener('scroll', onScroll, { passive: true });
    return () => { t.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  // The centred card shows Instagram's player directly (one tap to play). Wait for swiping to settle so we
  // don't load a player for every card scrolled past; hide it while the larger viewer is open.
  useEffect(() => {
    setLive(null);
    if (viewer != null || !near) return undefined;
    const t = setTimeout(() => setLive(active), 350);
    return () => clearTimeout(t);
  }, [active, viewer, near]);

  const go = (d) => scrollToCard(Math.max(0, Math.min(reels.length - 1, active + d)));
  const onCard = (i) => { if (i !== active) scrollToCard(i); };

  return (
    <section className="reels" ref={section}>
      <div className="wrap reels-head" data-reveal>
        <div>
          <Label light>Reels</Label>
          <h2 className="h2">{title}</h2>
          <p className="reels-intro">{intro}</p>
        </div>
        <div className="reels-social" aria-label="Follow us">
          <a href={STUDIO.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Icon name="insta" size={22} /></a>
          <a href={waLink('Hi BabySteps! I saw your reels.')} target="_blank" rel="noreferrer" aria-label="WhatsApp"><WhatsAppIcon size={22} /></a>
        </div>
      </div>

      <div className="reels-stage">
        <button className="reels-arrow prev" aria-label="Previous reel" disabled={active === 0} onClick={() => go(-1)}><Icon name="left" /></button>
        <div className="reels-track" ref={track}>
          {reels.map((r, i) => {
            const isActive = i === active;
            const isPlaying = live === i;
            return (
              <article key={r.id} className={`reel ${isActive ? 'is-active' : ''} ${isPlaying ? 'is-playing' : ''}`}>
                <button className="reel-poster" onClick={() => onCard(i)} tabIndex={isPlaying ? -1 : 0}
                  aria-label={`Show ${r.title}`}>
                  <img src={coverOf(r)} alt="" loading="lazy" draggable="false" onError={isYt(r) ? (e) => { if (!e.currentTarget.src.includes('hqdefault')) e.currentTarget.src = `https://i.ytimg.com/vi/${r.id}/hqdefault.jpg`; } : undefined} />
                  <span className="reel-play"><IconPlay /></span>
                  <span className="reel-meta">
                    <span className="reel-tag">{r.tag}</span>
                    <strong>{r.title}</strong>
                  </span>
                </button>

                {isPlaying && (
                  <div className={`reel-player ${isYt(r) ? 'is-yt' : ''}`}>
                    <iframe src={embedUrl(r)} title={r.title} scrolling="no" allow="autoplay; encrypted-media; picture-in-picture; clipboard-write" allowFullScreen />
                  </div>
                )}

                {isActive && (
                  <div className="reel-ctrls">
                    <a className="reel-chip" href={reelUrl(r)} target="_blank" rel="noreferrer">{isYt(r) ? <><Icon name="youtube" size={16} /> YouTube</> : <><Icon name="insta" size={16} /> Instagram</>}</a>
                    <span>
                      <button className="reel-btn" aria-label="Open larger" onClick={() => setViewer(i)}><IconExpand /></button>
                    </span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
        <button className="reels-arrow next" aria-label="Next reel" disabled={active === reels.length - 1} onClick={() => go(1)}><Icon name="right" /></button>
      </div>

      {viewer != null && <ReelViewer reels={reels} index={viewer} onChange={setViewer} />}
    </section>
  );
}

/** Full-screen player for one reel, with prev/next, Esc and arrow keys. Shared by the carousel and the /videos page. */
export function ReelViewer({ reels, index, onChange }) {
  const n = reels.length;
  const close = () => onChange(null);
  const step = (d) => onChange((index + d + n) % n);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onChange(null);
      if (e.key === 'ArrowRight') onChange((v) => (v + 1) % n);
      if (e.key === 'ArrowLeft') onChange((v) => (v - 1 + n) % n);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [n, onChange]);
  const r = reels[index];
  return (
    <div className="reel-viewer" role="dialog" aria-modal="true" aria-label={r.title} onClick={close}>
      <button className="lb-btn lb-close" aria-label="Close" onClick={close}><Icon name="close" /></button>
      {n > 1 && <button className="lb-btn lb-prev" aria-label="Previous video" onClick={(e) => { e.stopPropagation(); step(-1); }}><Icon name="left" /></button>}
      <div className={`rv-frame ${isYt(r) ? 'is-yt' : ''}`} onClick={(e) => e.stopPropagation()} key={index}>
        <iframe src={embedUrl(r, true)} title={r.title} allow="autoplay; encrypted-media; picture-in-picture; clipboard-write" allowFullScreen />
      </div>
      {n > 1 && <button className="lb-btn lb-next" aria-label="Next video" onClick={(e) => { e.stopPropagation(); step(1); }}><Icon name="right" /></button>}
    </div>
  );
}
