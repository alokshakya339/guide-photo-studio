import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icons.jsx';
import { IMG, FEATURES } from './data.js';
import { Label, Badge, reduced } from './lib.jsx';
import { HeartDivider } from './Decor.jsx';

const u = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1100&q=75`;
// One photo per feature, in FEATURES order.
const shots = () => [
  { src: IMG.newborn, alt: 'Newborn safely posed on a tiny bed', pos: '50% 60%' },
  { src: u('photo-1544126592-807ade215a0b'), alt: 'Baby sleeping peacefully, warm and cosy', pos: '50% 40%' },
  { src: IMG.cake, alt: 'Cake smash setup with balloons and props', pos: '50% 40%' },
  { src: IMG.family, alt: 'Family portrait in the studio', pos: '50% 30%' },
];
const DURATION = 5000;

/** "The BabySteps experience": feature cards that drive a cross-fading photo. */
export default function Experience({
  label = 'The BabySteps experience',
  title = <>Luxury studio,<br /><em>gentle hands</em></>,
  intro = 'Luxury props, expert lighting and high-end editing ensure your photos look like fine art — while your little one stays safe, warm and comfortable.',
  link = { to: '/about', label: 'Our story' },
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || reduced()) return undefined;
    const t = setTimeout(() => setActive((a) => (a + 1) % FEATURES.length), DURATION);
    return () => clearTimeout(t);
  }, [active, paused]);

  return (
    <section className="section xp">
      <div className="wrap">
        <div className="xp-head" data-reveal>
          <Label>{label}</Label>
          <h2 className="h2">{title}</h2>
          <HeartDivider />
          <p className="muted">{intro}</p>
        </div>

        <div className="xp-grid" onMouseLeave={() => setPaused(false)}>
          <ol className="xp-list" data-reveal>
            {FEATURES.map((f, k) => (
              <li key={f.title}>
                <button
                  className={`xp-card ${k === active ? 'on' : ''}`}
                  aria-pressed={k === active}
                  onMouseEnter={() => { setActive(k); setPaused(true); }}
                  onFocus={() => { setActive(k); setPaused(true); }}
                  onClick={() => { setActive(k); setPaused(true); }}
                >
                  <span className="xp-ic"><Icon name={f.icon} size={24} /></span>
                  <span className="xp-body">
                    <span className="xp-title">{f.title}</span>
                    <span className="xp-text">{f.text}</span>
                  </span>
                  <span className="xp-no">0{k + 1}</span>
                  {k === active && <span className="xp-bar" style={{ animationDuration: `${DURATION}ms`, animationPlayState: paused ? 'paused' : 'running' }} key={`${active}-${paused}`} />}
                </button>
              </li>
            ))}
            {link && <li className="xp-link"><Link className="btn-text" to={link.to}>{link.label} <Icon name="arrow" size={16} /></Link></li>}
          </ol>

          <div className="xp-media" data-reveal>
            <div className="xp-frame">
              {shots().map((s, k) => (
                <img key={s.src} src={s.src} alt={k === active ? s.alt : ''} aria-hidden={k !== active} className={k === active ? 'on' : ''} style={{ objectPosition: s.pos }} loading="lazy" />
              ))}
              <span className="xp-chip" key={active}><Icon name={FEATURES[active].icon} size={16} /> {FEATURES[active].title}</span>
            </div>
            <Badge className="xp-badge" size={128} text="Safe · Warm · Gentle · Timeless · Safe · Warm · Gentle · " />
            <span className="xp-dots" aria-hidden="true">{FEATURES.map((f, k) => <i key={f.title} className={k === active ? 'on' : ''} />)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
