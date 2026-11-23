import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icons.jsx';
import { HERO_SLIDES } from './data.js';
import { reduced } from './lib.jsx';

const DURATION = 7000;

/* 14-point starburst badge */
function Starburst() {
  const pts = [];
  const n = 14;
  for (let k = 0; k < n * 2; k += 1) {
    const r = k % 2 ? 41 : 50;
    const a = (Math.PI * k) / n - Math.PI / 2;
    pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`);
  }
  return <svg viewBox="0 0 100 100" aria-hidden="true"><polygon points={pts.join(' ')} /></svg>;
}
function Sparkle({ className }) {
  return (
    <svg className={className} viewBox="0 0 60 60" aria-hidden="true">
      <path d="M30 2c2 14 6 22 28 28-22 6-26 14-28 28-2-14-6-22-28-28C24 24 28 16 30 2z" />
      <path d="M52 2c.7 4.6 2 7.3 6 8.6-4 1.3-5.3 4-6 8.6-.7-4.6-2-7.3-6-8.6 4-1.3 5.3-4 6-8.6z" opacity=".75" />
    </svg>
  );
}
function Leaf({ className }) {
  return (
    <svg className={className} viewBox="0 0 80 90" aria-hidden="true">
      <path d="M14 86C30 62 44 38 66 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      {[[22, 70, -40], [30, 58, -35], [38, 46, -30], [47, 33, -25], [56, 21, -20], [30, 76, 50], [39, 64, 55], [48, 51, 58], [57, 38, 62], [64, 26, 66]].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx="5" ry="11" transform={`rotate(${r} ${x} ${y})`} fill="currentColor" />
      ))}
    </svg>
  );
}

/** Split hero: script headline + copy on the left, two offset captioned photos with a starburst badge on the right. */
export default function HeroBanner() {
  const slides = HERO_SLIDES;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const ref = useRef(null);
  const touch = useRef(null);

  // Auto-rotation starts once the visitor interacts (scroll / touch / mouse / key). Swapping slides on a timer
  // straight after load made Google measure the *second* slide as the page's main content (slow LCP score).
  const [engaged, setEngaged] = useState(false);
  useEffect(() => {
    if (engaged) return undefined;
    const on = () => setEngaged(true);
    const evs = ['scroll', 'pointermove', 'pointerdown', 'keydown', 'touchstart'];
    evs.forEach((e) => window.addEventListener(e, on, { passive: true, once: true }));
    return () => evs.forEach((e) => window.removeEventListener(e, on));
  }, [engaged]);

  useEffect(() => {
    if (!engaged || paused || reduced() || slides.length < 2) return undefined;
    const t = setTimeout(() => setI((x) => (x + 1) % slides.length), DURATION);
    return () => clearTimeout(t);
  }, [i, paused, slides.length, engaged]);

  if (!slides.length) return null;
  const s = slides[i];
  const go = (d) => setI((x) => (x + d + slides.length) % slides.length);

  const onMove = (e) => {
    const el = ref.current;
    if (!el || reduced() || window.matchMedia('(pointer: coarse)').matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };

  // Called as a function (not <Photo/>) so the photos aren't re-created — and their entrance animation
  // restarted — on every re-render (slide timer, mouse parallax).
  const photo = (n) => {
    const src = s[`img${n}`];
    if (!src) return null;
    const label = s[`label${n}`];
    const inner = (
      <>
        <img src={src} alt={label || ''} fetchpriority={i === 0 && n === 1 ? 'high' : undefined} decoding="async" style={{ objectPosition: s[`pos${n}`] || '50% 50%' }} />
        {label && <span className="hx-cap"><b>{label}</b>{s[`sub${n}`] && <small>{s[`sub${n}`]}</small>}</span>}
      </>
    );
    return s[`href${n}`]
      ? <Link to={s[`href${n}`]} className={`hx-photo p${n}`}>{inner}</Link>
      : <div className={`hx-photo p${n}`}>{inner}</div>;
  };

  return (
    <section
      className="hx" ref={ref} aria-roledescription="carousel" aria-label="Featured sessions"
      onMouseMove={onMove}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { setPaused(false); ref.current?.style.setProperty('--mx', 0); ref.current?.style.setProperty('--my', 0); }}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); touch.current = null; }}
    >
      <div className="wrap hx-grid" key={i}>
        <div className="hx-copy" aria-live="polite">
          {s.kicker && <p className="hx-kicker">{s.kicker}</p>}
          <h1 className="hx-title">{s.title}</h1>
          {s.text && <p className="hx-text">{s.text}</p>}
          <div className="hx-cta">
            <Link className="hx-btn" to={s.link || '/contact#book'}><span>{s.cta || 'Book a Session'}</span></Link>
            {s.cta2 && <Link className="hx-link" to={s.link2 || '/services'}>{s.cta2} <Icon name="arrow" size={18} /></Link>}
          </div>
          <Leaf className="hx-leaf" />
        </div>

        <div className="hx-art">
          <Sparkle className="hx-sparkle" />
          {photo(1)}
          {photo(2)}
          {s.badgeBig && (
            <span className="hx-badge" aria-label={`${s.badgeTop || ''} ${s.badgeBig} ${s.badgeBottom || ''}`}>
              <Starburst />
              <span className="hx-badge-text">
                {s.badgeTop && <small>{s.badgeTop}</small>}
                <b>{s.badgeBig}</b>
                {s.badgeBottom && <small>{s.badgeBottom}</small>}
              </span>
            </span>
          )}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="wrap hx-foot">
          <span className="hx-dots">
            {slides.map((sl, k) => (
              <button key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Show slide ${k + 1}: ${sl.title}`} aria-current={k === i}>
                {k === i && <i style={{ animationDuration: `${DURATION}ms`, animationPlayState: paused ? 'paused' : 'running' }} />}
              </button>
            ))}
          </span>
          <span className="hx-arrows">
            <button onClick={() => go(-1)} aria-label="Previous slide"><Icon name="left" size={18} /></button>
            <button onClick={() => go(1)} aria-label="Next slide"><Icon name="right" size={18} /></button>
          </span>
        </div>
      )}
    </section>
  );
}
