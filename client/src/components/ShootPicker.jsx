import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EVENT_TYPES } from '../site.js';

/**
 * "Capture. Create. Cherish." — headline + quick enquiry field on the left,
 * an accordion of tall portfolio cards on the right. Hovering / focusing a card
 * widens it and reveals its title and photo count; the others collapse to a
 * slim strip with a vertical label.
 */
export default function ShootPicker({ categories = [] }) {
  const cards = categories.slice(0, 4);
  // null = default to the last card; computed each render so it's right once categories load
  const [picked, setPicked] = useState(null);
  const active = picked ?? cards.length - 1;
  const [idea, setIdea] = useState('');
  const [auto, setAuto] = useState(false); // touch only: cycle through the cards until the visitor interacts
  const navigate = useNavigate();
  const lastPointer = useRef('mouse');
  const swipe = useRef(null);
  const wrap = useRef(null);

  // Touch screens: start auto-advancing once the cards are on screen; any tap or swipe stops it.
  useEffect(() => {
    const el = wrap.current;
    if (!el || !window.matchMedia('(hover: none)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const io = new IntersectionObserver(([e]) => setAuto((a) => (a === null ? null : e.isIntersecting)), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [cards.length]);
  useEffect(() => {
    if (!auto || cards.length < 2) return undefined;
    const t = setTimeout(() => setPicked((active + 1) % cards.length), 4000);
    return () => clearTimeout(t);
  }, [auto, active, cards.length]);

  const stopAuto = () => setAuto(null); // null = user took over, never restart
  const go = (n) => { stopAuto(); setPicked((n + cards.length) % cards.length); };

  const submit = (e) => {
    e.preventDefault();
    const match = EVENT_TYPES.find((t) => t.toLowerCase() === idea.trim().toLowerCase());
    navigate(match ? `/contact?type=${encodeURIComponent(match)}` : '/contact');
  };

  if (!cards.length) return null;

  return (
    <section className="esec eshoot">
      <div className="container eshoot__grid">
        <div className="eshoot__copy" data-reveal>
          <h2 className="eshoot__title">
            <span>Capture.</span>
            <span>Create.</span>
            <span><em>Cherish.</em></span>
          </h2>
          <form className="eshoot__form" onSubmit={submit}>
            <label htmlFor="eshoot-idea" className="sr-only">What are you celebrating?</label>
            <input
              id="eshoot-idea"
              list="eshoot-types"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="What are you celebrating?"
              autoComplete="off"
            />
            <datalist id="eshoot-types">
              {EVENT_TYPES.map((t) => <option key={t} value={t} />)}
            </datalist>
            <button type="submit">Enquire</button>
          </form>
        </div>

        <div
          ref={wrap}
          className={`eshoot__cards${auto ? ' is-auto' : ''}`}
          data-reveal
          style={{ '--d': '120ms' }}
          onPointerLeave={(e) => { if (e.pointerType === 'mouse') setPicked(null); }}
          onTouchStart={(e) => { swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
          onTouchEnd={(e) => {
            const s = swipe.current; swipe.current = null;
            if (!s) return;
            const dx = e.changedTouches[0].clientX - s.x;
            const dy = e.changedTouches[0].clientY - s.y;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) { lastPointer.current = 'swipe'; go(active + (dx < 0 ? 1 : -1)); }
          }}
        >
          {cards.map((c, n) => (
            <Link
              key={c.slug}
              to={`/portfolio/${c.slug}`}
              className={`eshoot__card${n === active ? ' is-open' : ''}`}
              // a tap also fires mouseenter/focus, so only a real mouse or keyboard opens a card that way
              onPointerEnter={(e) => { if (e.pointerType === 'mouse') setPicked(n); }}
              onPointerDown={(e) => { lastPointer.current = e.pointerType; }}
              onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) setPicked(n); }}
              // touch: first tap opens the card, second tap follows the link (a swipe never navigates)
              onClick={(e) => {
                if (lastPointer.current === 'swipe') { e.preventDefault(); lastPointer.current = 'touch'; return; }
                if (n !== active) { e.preventDefault(); go(n); }
              }}
            >
              <img src={c.cover} alt={`${c.title} photography`} loading="lazy" />
              <span className="eshoot__shade" aria-hidden="true" />
              <span className="eshoot__tag" aria-hidden={n === active}>{c.title}</span>
              <span className="eshoot__info">
                <strong>{c.title}</strong>
                {c.count != null && <span className="eshoot__count"><b>{c.count}</b><small>{c.count === 1 ? 'Photo' : 'Photos'}</small></span>}
              </span>
              <span className="eshoot__go" aria-hidden="true">View collection →</span>
              {n === active && <span key={`${n}-${auto}`} className="eshoot__progress" aria-hidden="true" />}
            </Link>
          ))}
        </div>
        <div className="eshoot__dots">
          {cards.map((c, n) => (
            <button key={c.slug} type="button" aria-label={`Show ${c.title}`} aria-current={n === active} className={n === active ? 'is-on' : ''} onClick={() => go(n)} />
          ))}
          <span className="eshoot__hint">Swipe or tap to explore</span>
        </div>
      </div>
    </section>
  );
}
