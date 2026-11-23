import { useEffect, useState } from 'react';
import { Heart, Logo, LeafShadow, SessionIcon } from './Decor.jsx';
import { reduced } from './lib.jsx';

/* "The story behind our logo" — four meanings around the logo; hovering one highlights that part of it. */
const STORY = [
  { key: 'face', icon: 'baby', title: 'The Baby Face', text: 'Represents innocence, warmth, love & new beginnings.' },
  { key: 'guide', icon: 'camera', title: 'Guide Studio', text: 'Years of experience in storytelling through photography, now focused on your little ones.' },
  { key: 'tone', icon: 'heart', title: 'Soft Earthy Tone', text: 'Reflects warmth, comfort, softness & a premium experience.' },
  { key: 'studio', icon: 'sprout', title: 'A Modern Premium Family Studio', text: 'A beautifully designed space to create timeless memories.' },
];
const SWATCHES = [
  ['#a4664f', 'Copper rose'],
  ['#d2a594', 'Dusty blush'],
  ['#efdccf', 'Soft sand'],
  ['#fbf3ee', 'Ivory'],
  ['#4a3029', 'Cocoa'],
];

function Point({ s, i, active, onPick }) {
  return (
    <button
      className={`lsx-card ${i === active ? 'on' : ''}`}
      aria-pressed={i === active}
      onMouseEnter={() => onPick(i)}
      onFocus={() => onPick(i)}
      onClick={() => onPick(i)}
      data-reveal
      style={{ '--d': `${i * 100}ms` }}
    >
      <span className="lsx-ic"><SessionIcon name={s.icon} size={34} /></span>
      <span className="lsx-body">
        <span className="lsx-title">{s.title}</span>
        <span className="lsx-text">{s.text}</span>
      </span>
      <span className="lsx-link" aria-hidden="true"><i /></span>
    </button>
  );
}

export default function LogoStory() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || reduced()) return undefined;
    const t = setTimeout(() => setActive((a) => (a + 1) % STORY.length), 4200);
    return () => clearTimeout(t);
  }, [active, paused]);
  const pick = (i) => { setActive(i); setPaused(true); };
  const key = STORY[active].key;

  return (
    <section className="lsx">
      <LeafShadow />
      <div className="wrap">
        <div className="lsx-head" data-reveal>
          <p className="lsx-kicker">The story behind</p>
          <h2 className="lsx-title-main">Our logo <Heart size={40} /></h2>
          <p className="caps-line">A symbol of love, memories &amp; beautiful beginnings.</p>
        </div>

        <div className="lsx-grid" onMouseLeave={() => setPaused(false)}>
          <div className="lsx-col left">
            <Point s={STORY[0]} i={0} active={active} onPick={pick} />
            <Point s={STORY[2]} i={2} active={active} onPick={pick} />
          </div>

          <div className={`lsx-center hl-${key}`} data-reveal>
            <span className="lsx-ring r1" aria-hidden="true" />
            <span className="lsx-ring r2" aria-hidden="true" />
            <div className="lsx-logo-wrap">
              <p className="lsx-sub">A modern premium family studio</p>
              <div className="lsx-logo-box">
                <Logo className="lsx-logo" />
                <span className="lsx-spot face" aria-hidden="true" />
                <span className="lsx-spot guide" aria-hidden="true" />
              </div>
              <div className="lsx-swatches" aria-label="Brand colours">
                {SWATCHES.map(([c, n]) => <span key={c} style={{ '--c': c }} title={n} />)}
              </div>
              <p className="lsx-now" key={active} aria-live="polite">{STORY[active].title}</p>
            </div>
          </div>

          <div className="lsx-col right">
            <Point s={STORY[1]} i={1} active={active} onPick={pick} />
            <Point s={STORY[3]} i={3} active={active} onPick={pick} />
          </div>
        </div>
      </div>
    </section>
  );
}
