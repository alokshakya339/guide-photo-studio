import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icons.jsx';
import { Floral, Heart } from './Decor.jsx';
import { STUDIO, PACKAGES, FAQS, CATEGORIES, JOURNEY } from './data.js';
import { HOME_TITLE, HOME_DESC, pageSeo } from './seoMeta.js';

export const waLink = (text) => `https://wa.me/${STUDIO.whatsapp}?text=${encodeURIComponent(text)}`;
export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const pad = (n) => String(n).padStart(2, '0');
export const catLabel = (key) => CATEGORIES.find((c) => c.key === key)?.label;

/* Link to the contact page with the form pre-filled. */
export const bookHref = (session, pkg) => {
  const q = new URLSearchParams();
  if (session) q.set('session', session);
  if (pkg) q.set('package', pkg);
  const s = q.toString();
  return `/contact${s ? `?${s}` : ''}#book`;
};

/* Sets the document title and meta description for a page. */
/** Keyword title + description for a section page (same wording the server sends — see seoMeta.js). */
export function useSeo(key) {
  const m = key ? pageSeo(key, { sessions: JOURNEY, address: STUDIO.address, phone: STUDIO.phone }) : { title: null, description: HOME_DESC };
  usePage(m.title, m.description);
}

export function usePage(title, description) {
  useEffect(() => {
    document.title = title ? `${title} · ${STUDIO.name}` : HOME_TITLE;
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [title, description]);
}

/* Marks [data-reveal] elements with data-in once they scroll into view. Call from each page.
   (A data attribute, not a class: React rewrites className on re-render and would wipe a class.) */
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]:not([data-in])');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.setAttribute('data-in', '')); return undefined; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.setAttribute('data-in', ''); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  });
}

/* Two flowing wavy lines (decorative). */
export function Waves({ className = '', width = 240 }) {
  const d = 'M0 10 Q 10 0 20 10 T 40 10 T 60 10 T 80 10 T 100 10 T 120 10 T 140 10 T 160 10 T 180 10 T 200 10 T 220 10 T 240 10 T 260 10 T 280 10 T 300 10 T 320 10';
  return (
    <svg className={`waves ${className}`} width={width} height="52" viewBox="0 0 240 52" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path className="wave-a" d={d} transform="translate(0 6)" />
        <path className="wave-b" d={d} transform="translate(0 32)" />
      </g>
    </svg>
  );
}

/* Circular rotating text badge (decorative). */
let badgeId = 0;
export function Badge({ text = 'BabySteps · Guide Studio · Noida · ', size = 120, className = '', children }) {
  const [id] = useState(() => `bp${badgeId++}`);
  return (
    <span className={`badge-rot ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 120 120" width={size} height={size}>
        <defs><path id={id} d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" /></defs>
        <text><textPath href={`#${id}`} startOffset="0" textLength="274" lengthAdjust="spacing">{text}</textPath></text>
      </svg>
      {children && <span className="badge-core">{children}</span>}
    </span>
  );
}

export function Label({ children, light }) {
  return <span className={`label ${light ? 'light' : ''}`}><i />{children}</span>;
}

/* Inner-page header: breadcrumb, title, intro, optional image. */
export function PageHero({ crumb, title, intro, img, pos }) {
  return (
    <section className={`page-hero ${img ? 'with-img' : ''}`}>
      <Floral className="fl ph-fl" flip />
      <span className="ph-heart"><Heart size={30} /></span>
      <div className="wrap page-hero-grid">
        <div className="page-hero-text">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            {crumb.map(([to, label]) => (to ? <Link key={label} to={to}>{label}</Link> : <span key={label}>{label}</span>))}
          </nav>
          <h1 className="page-title">{title}</h1>
          {intro && <p className="page-intro">{intro}</p>}
        </div>
        {img && <div className="page-hero-img"><img src={img} alt="" style={{ objectPosition: pos }} /></div>}
      </div>
    </section>
  );
}

/* Closing call-to-action band used at the bottom of most pages. */
export function CtaBand({ title = <>Ready to capture your <em>precious moments?</em></>, text = 'Our calendar fills up quickly. Reserve your date — we reply within 24 hours.' }) {
  return (
    <section className="cta-band">
      <div className="wrap cta-inner" data-reveal>
        <h2 className="h2">{title}</h2>
        <p>{text}</p>
        <div className="cta-actions">
          <Link className="btn btn-gold" to="/contact#book">Book a session</Link>
          <a className="btn btn-line light" href={waLink('Hi BabySteps! I would like to know more about your sessions.')} target="_blank" rel="noreferrer">WhatsApp us</a>
        </div>
      </div>
    </section>
  );
}

/* ---------- Photos that hold their space while loading ---------- */
const RATIOS = new Map(); // src → "w / h" learned from loaded images, so revisits never jump

const ratioOf = (src, w, h) => (w && h ? `${w} / ${h}` : RATIOS.get(src) || null);

/**
 * A fixed box (soft shimmer) that reserves the photo's space; the image fades in once loaded.
 * Pass w/h when known (new uploads) for a zero-jump layout; otherwise the box starts 4:5 and takes the
 * photo's real shape once it arrives. `fixed` (e.g. "1 / 1") always crops to that shape instead.
 */
export function PhotoBox({ src, alt = '', w, h, fixed, className = '', imgProps = {}, onFail }) {
  const known = fixed || ratioOf(src, w, h);
  const [ratio, setRatio] = useState(known);
  const [state, setState] = useState('loading'); // loading | ready | error
  const ref = useRef(null);
  useEffect(() => {
    setRatio(fixed || ratioOf(src, w, h));
    const im = ref.current;
    setState(im?.complete && im.naturalWidth ? 'ready' : 'loading'); // already cached → no flash
  }, [src, w, h, fixed]);
  const onLoad = (e) => {
    const t = e.currentTarget;
    if (t.naturalWidth) {
      const r = `${t.naturalWidth} / ${t.naturalHeight}`;
      RATIOS.set(src, r);
      if (!fixed) setRatio(r);
    }
    setState('ready');
  };
  return (
    <span className={`photo-box is-${state} ${className}`} style={{ aspectRatio: ratio || '4 / 5' }}>
      <img ref={ref} src={src} alt={alt} draggable={false} {...imgProps} onLoad={onLoad} onError={() => { setState('error'); onFail?.(src); }} />
    </span>
  );
}

/**
 * Full-screen viewer image: the frame is sized from the photo's shape straight away, the small grid
 * thumbnail (already loaded) shows blurred inside it, and the large version fades in on top.
 */
export function LbPhoto({ src, thumb, alt = '', w, h, imgProps = {}, onFail }) {
  const ratio = ratioOf(src, w, h) || (thumb && RATIOS.get(thumb));
  const [ready, setReady] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const im = ref.current; setReady(Boolean(im?.complete && im.naturalWidth)); }, [src]);
  if (!ratio) { // shape unknown: plain image over a loading pulse
    return (
      <span className={`lb-photo free ${ready ? 'is-ready' : ''}`}>
        <img ref={ref} src={src} alt={alt} draggable={false} {...imgProps} onLoad={() => setReady(true)} onError={() => { setReady(true); onFail?.(src); }} />
      </span>
    );
  }
  const [rw, rh] = ratio.split('/').map(Number);
  return (
    <span className={`lb-photo ${ready ? 'is-ready' : ''}`} style={{ '--r': rw / rh, aspectRatio: ratio }}>
      {thumb && thumb !== src && <img className="lb-photo-thumb" src={thumb} alt="" aria-hidden="true" draggable={false} {...imgProps} />}
      <img ref={ref} className="lb-photo-full" src={src} alt={alt} draggable={false} {...imgProps} onLoad={() => setReady(true)} onError={() => { setReady(true); onFail?.(src); }} />
    </span>
  );
}

/**
 * Drag / swipe left-right to change photo (finger or mouse). The photo follows the pointer and snaps back
 * if the drag is too short. Taps, buttons and pinch-zoom still work; a drag never counts as a "close" tap.
 * Usage: const swipe = useSwipe({ onPrev, onNext }); <div {...swipe.bind}> … <figure style={swipe.style}>
 */
export function useSwipe({ onPrev, onNext }) {
  const [dx, setDx] = useState(0);
  const start = useRef(null);
  const dragged = useRef(false);
  const cancel = () => { start.current = null; dragged.current = false; setDx(0); };
  const finish = (e) => {
    const s = start.current;
    start.current = null;
    if (!s || s.id !== e.pointerId) return;
    const x = e.clientX - s.x;
    const quick = Math.abs(x) > 30 && Date.now() - s.t < 250; // a short flick also counts
    if (dragged.current && (Math.abs(x) > Math.min(90, window.innerWidth * 0.18) || quick)) (x < 0 ? onNext : onPrev)();
    setDx(0);
    // Only the click fired by this same gesture (right after pointerup) is ignored; touch drags often fire none.
    if (dragged.current) setTimeout(() => { dragged.current = false; }, 50);
  };
  return {
    bind: {
      onPointerDown: (e) => {
        dragged.current = false; // a new touch always starts fresh (a stale flag used to swallow the next tap, e.g. on ×)
        if (start.current) { cancel(); return; } // second finger = pinch, not a swipe
        if (e.button > 0 || e.target.closest('button, a')) return;
        start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, t: Date.now() };
      },
      onPointerMove: (e) => {
        const s = start.current;
        if (!s || s.id !== e.pointerId) return;
        const x = e.clientX - s.x, y = e.clientY - s.y;
        if (!dragged.current) {
          if (Math.abs(y) > 12 && Math.abs(y) > Math.abs(x)) { cancel(); return; } // vertical gesture: leave it alone
          if (Math.abs(x) < 8) return;
          dragged.current = true;
          e.currentTarget.setPointerCapture?.(e.pointerId);
        }
        setDx(x);
      },
      onPointerUp: finish,
      onPointerCancel: cancel,
      onClickCapture: (e) => { if (dragged.current) { e.stopPropagation(); e.preventDefault(); dragged.current = false; } },
    },
    style: dx ? { transform: `translateX(${dx}px)`, opacity: Math.max(0.4, 1 - Math.abs(dx) / 600), transition: 'none', animation: 'none' } : undefined,
  };
}

/* Full-screen photo viewer. */
export function Lightbox({ items, index, setIndex }) {
  const step = useCallback((d) => setIndex((b) => (b + d + items.length) % items.length), [items.length, setIndex]);
  useEffect(() => {
    if (index < 0) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setIndex(-1);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [index, step, setIndex]);
  const swipe = useSwipe({ onPrev: () => step(-1), onNext: () => step(1) });

  if (index < 0 || !items[index]) return null;
  const it = items[index];
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={() => setIndex(-1)} {...swipe.bind}>
      <button className="lb-btn lb-close" aria-label="Close" onClick={() => setIndex(-1)}><Icon name="close" /></button>
      <button className="lb-btn lb-prev" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); step(-1); }}><Icon name="left" /></button>
      <figure onClick={(e) => e.stopPropagation()} key={index} style={swipe.style}>
        <LbPhoto src={it.src.replace('w=900', 'w=1600')} thumb={it.src} alt={it.alt} />
        <figcaption><span>{pad(index + 1)} / {pad(items.length)}</span>{it.alt}</figcaption>
      </figure>
      <button className="lb-btn lb-next" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); step(1); }}><Icon name="right" /></button>
    </div>
  );
}

/* Masonry photo grid that opens the lightbox. */
export function PhotoGrid({ items }) {
  const [box, setBox] = useState(-1);
  return (
    <>
      <div className="pgrid">
        {items.map((g, k) => (
          <button key={g.src} className="pgrid-item" style={{ '--d': `${(k % 8) * 50}ms` }} onClick={() => setBox(k)} aria-label={`Open photo: ${g.alt}`}>
            <PhotoBox src={g.src} alt={g.alt} imgProps={{ loading: 'lazy' }} />
            <span className="shot-cap">{catLabel(g.cat)}<i>View</i></span>
          </button>
        ))}
      </div>
      <Lightbox items={items} index={box} setIndex={setBox} />
    </>
  );
}

/* Package tabs + plans + add-ons. */
export function PackagesBlock({ initial = 'maternity', compact = false }) {
  const [tab, setTab] = useState(initial);
  useEffect(() => setTab(initial), [initial]);
  const group = PACKAGES[tab];
  const shoot = tab === 'baby' ? 'Baby Milestone' : group.label;
  return (
    <>
      <div className="tabs" role="tablist">
        {Object.entries(PACKAGES).map(([k, g]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{g.label}</button>
        ))}
      </div>
      <div className={`plans n${group.plans.length}`} key={tab}>
        {group.plans.map((p, k) => (
          <article key={p.name} className={`plan ${p.popular ? 'featured' : ''}`} style={{ '--d': `${k * 90}ms` }}>
            <div className="plan-top">
              <span className="plan-no">{pad(k + 1)}</span>
              {p.popular && <span className="plan-tag">Most loved</span>}
            </div>
            <h3>{p.name}</h3>
            <div className="plan-price"><span>₹</span>{p.price}</div>
            <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
            <Link className={`btn ${p.popular ? 'btn-gold' : 'btn-line'}`} to={bookHref(shoot, p.name)}>Reserve {p.name}</Link>
          </article>
        ))}
      </div>
      {!compact && (
        <div className="addons">
          <h4>Add-ons</h4>
          <ul>{group.addons.map(([n, pr]) => <li key={n}><span>{n}</span><i /><b>{pr}</b></li>)}</ul>
        </div>
      )}
    </>
  );
}

export function FaqList({ items = FAQS }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="accordion">
      {items.map((f, k) => (
        <div key={f.q} className={`acc ${open === k ? 'open' : ''}`}>
          <button aria-expanded={open === k} onClick={() => setOpen(open === k ? -1 : k)}>
            <span>{f.q}</span><i aria-hidden="true" />
          </button>
          <div className="acc-body"><div><p>{f.a}</p></div></div>
        </div>
      ))}
    </div>
  );
}
