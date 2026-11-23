import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { SITE } from '../site.js';
import { IconClose, IconChevron, IconWhatsApp, IconYoutube, IconInstagram, IconCamera } from './Icons.jsx';

const thumb = (r) => r.thumbnail || `/images/reels/${r.id}.jpg`;
const isIg = (r) => r?.platform === 'instagram';
const shortUrl = (r) => (isIg(r) ? `https://www.instagram.com/reel/${r.id}/` : `https://www.youtube.com/shorts/${r.id}`);
const igEmbed = (id) => `https://www.instagram.com/reel/${id}/embed/`;
const embed = (id, muted) =>
  `https://www.youtube-nocookie.com/embed/${id}?${new URLSearchParams({
    autoplay: 1, mute: muted ? 1 : 0, controls: 0, loop: 1, playlist: id, playsinline: 1,
    rel: 0, modestbranding: 1, iv_load_policy: 3, enablejsapi: 1, origin: window.location.origin,
  })}`;

const Icon = ({ d, size = 24, fill = 'none', ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    {d}
  </svg>
);
const IconShare = (p) => <Icon {...p} d={<><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M12 15V3M7 8l5-5 5 5" /></>} />;
const IconVolume = ({ muted, ...p }) => (
  <Icon {...p} d={muted ? <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="m22 9-6 6M16 9l6 6" /></> : <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></>} />
);
const IconPause = (p) => <Icon {...p} fill="currentColor" d={<><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></>} />;
const IconPlayS = (p) => <Icon {...p} fill="currentColor" d={<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />} />;

/** Send a command to a YouTube iframe (needs enablejsapi=1). */
function ytCommand(iframe, func) {
  const args = func === 'setVolume' ? [100] : [];
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
}

/**
 * YouTube-Shorts-style full-screen viewer.
 * Vertical snap feed: swipe / wheel / ↑↓ keys / arrow buttons move between reels; only the
 * visible reel loads a player. Opening it is a user gesture, so it starts with sound.
 */
export default function ShortsViewer({ reels, start = 0, onClose }) {
  const feed = useRef(null);
  const frames = useRef({});
  const srcs = useRef({}); // src fixed when a slide goes live, so mute/unmute never reloads the video
  const mutedRef = useRef(false);
  const [index, setIndex] = useState(start);
  const [muted, setMutedState] = useState(false);
  const setMuted = (v) => { mutedRef.current = v; setMutedState(v); };
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState('');

  const goTo = useCallback((i, smooth = true) => {
    const f = feed.current;
    const n = Math.max(0, Math.min(reels.length - 1, i));
    f?.children[n]?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  }, [reels.length]);

  // Open at the tapped reel; lock page scroll.
  useEffect(() => {
    goTo(start, false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Which slide is on screen.
  useEffect(() => {
    const f = feed.current;
    if (!f) return undefined;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setIndex(Number(e.target.dataset.i))),
      { root: f, threshold: 0.6 }
    );
    [...f.children].forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  useEffect(() => setPaused(false), [index]);

  // Keyboard: ↑/↓ (or j/k) move, m mutes, space pauses, Esc closes.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose(index);
      else if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); goTo(index + 1); }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); goTo(index - 1); }
      else if (e.key === 'm' && !isIg(reels[index])) toggleMute();
      else if (e.key === ' ' && !isIg(reels[index])) { e.preventDefault(); togglePause(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    const f = frames.current[index];
    if (next) ytCommand(f, 'mute');
    else { ytCommand(f, 'unMute'); ytCommand(f, 'setVolume'); ytCommand(f, 'playVideo'); }
  }
  function togglePause() {
    const next = !paused;
    setPaused(next);
    ytCommand(frames.current[index], next ? 'pauseVideo' : 'playVideo');
  }

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  }

  async function share(r) {
    const url = shortUrl(r);
    try {
      if (navigator.share) await navigator.share({ title: r.title, text: `${r.title} · ${SITE.name}`, url });
      else {
        await navigator.clipboard.writeText(url);
        flash('Link copied');
      }
    } catch {
      /* user cancelled */
    }
  }

  const current = reels[index];
  const close = () => onClose(index);

  return createPortal(
    <div className="shorts" role="dialog" aria-modal="true" aria-label="Reels viewer">
      <div className="shorts__bg" style={{ backgroundImage: `url(${thumb(current)})` }} aria-hidden="true" />

      <div className="shorts__top">
        <button className="shorts__iconbtn" onClick={close} aria-label="Close reels"><IconClose /></button>
        <span className="shorts__count">{index + 1} / {reels.length}</span>
        {isIg(current)
          ? <span className="shorts__iconbtn" aria-hidden="true" />
          : <button className="shorts__iconbtn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}><IconVolume muted={muted} /></button>}
      </div>

      <div className="shorts__feed" ref={feed}>
        {reels.map((r, i) => {
          const live = i === index;
          // always start muted so autoplay is never blocked (iOS), then unmute via the API below
          if (live && !srcs.current[i]) srcs.current[i] = isIg(r) ? igEmbed(r.id) : embed(r.id, true);
          if (!live) delete srcs.current[i];
          return (
            <section key={r.id} className="shorts__slide" data-i={i}>
              <div className="shorts__stage">
                <div className="shorts__video">
                  <img src={thumb(r)} alt="" className="shorts__poster" draggable="false" />
                  {live && (
                    <iframe
                      ref={(el) => { frames.current[i] = el; }}
                      src={srcs.current[i]}
                      className={isIg(r) ? 'is-ig' : undefined}
                      scrolling="no"
                      onLoad={(e) => {
                        if (isIg(r)) return; // Instagram's player has its own controls
                        // start listening so postMessage commands (mute/pause) are accepted
                        e.currentTarget.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: r.id }), '*');
                        const el = e.currentTarget;
                        if (!mutedRef.current) {
                          // the viewer was opened by a tap, so most browsers allow sound; retry briefly while the player boots
                          [150, 600, 1200].forEach((ms) => setTimeout(() => { ytCommand(el, 'unMute'); ytCommand(el, 'setVolume'); }, ms));
                        }
                      }}
                      title={r.title}
                      allow="autoplay; encrypted-media; picture-in-picture"
                    />
                  )}
                  {/* Tap the video to pause/play, like Shorts */}
                  {!isIg(r) && (
                    <button className="shorts__tap" onClick={togglePause} aria-label={paused ? 'Play' : 'Pause'}>
                      {live && paused && <span className="shorts__paused"><IconPlayS size={34} /></span>}
                    </button>
                  )}

                  {!(isIg(r) && live) && <div className="shorts__info">
                    <div className="shorts__channel">
                      <img src="/images/brand/favicon.png" alt="" />
                      <strong>@guidephotostudio</strong>
                      {isIg(r)
                        ? <a className="shorts__sub" href={SITE.social.instagram} target="_blank" rel="noreferrer">Follow</a>
                        : <a className="shorts__sub" href={`${SITE.social.youtube}?sub_confirmation=1`} target="_blank" rel="noreferrer">Subscribe</a>}
                    </div>
                    <p className="shorts__title">{r.title}</p>
                    {r.tag && <span className="shorts__tag">#{r.tag.toLowerCase().replace(/\s+/g, '')} #guidephotostudio</span>}
                  </div>}
                </div>

                <aside className="shorts__actions" aria-label="Reel actions">
                  <button onClick={() => share(r)}><span><IconShare /></span>Share</button>
                  <a href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(`Hi Guide Photo Studio! I loved your reel "${r.title}" and would like to enquire about a shoot.`)}`} target="_blank" rel="noreferrer">
                    <span><IconWhatsApp width={24} height={24} /></span>Enquire
                  </a>
                  {isIg(r)
                    ? <a href={shortUrl(r)} target="_blank" rel="noreferrer"><span><IconInstagram width={24} height={24} /></span>Instagram</a>
                    : <a href={shortUrl(r)} target="_blank" rel="noreferrer"><span><IconYoutube width={24} height={24} /></span>YouTube</a>}
                  <Link to="/contact" onClick={close} className="shorts__book"><span><IconCamera width={24} height={24} /></span>Book</Link>
                </aside>
              </div>
            </section>
          );
        })}
      </div>

      <div className="shorts__nav">
        <button className="shorts__iconbtn" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous reel"><IconChevron dir="up" /></button>
        <button className="shorts__iconbtn" onClick={() => goTo(index + 1)} disabled={index === reels.length - 1} aria-label="Next reel"><IconChevron dir="down" /></button>
      </div>

      {index === 0 && reels.length > 1 && <p className="shorts__hint" aria-hidden="true">Swipe up for more</p>}
      {toast && <p className="shorts__toast" role="status">{toast}</p>}
    </div>,
    document.body
  );
}
