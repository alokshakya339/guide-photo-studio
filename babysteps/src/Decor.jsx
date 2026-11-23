/* Decorative pieces matching the BabySteps social-post style. All aria-hidden. */

export function Heart({ size = 22, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 20.5s-7.5-4.6-7.5-10.4A4.2 4.2 0 0112 7.6a4.2 4.2 0 017.5 2.5c0 5.8-7.5 10.4-7.5 10.4z" strokeLinejoin="round" />
    </svg>
  );
}

/* —— ♡ —— */
export function HeartDivider({ size = 18, className = '' }) {
  return (
    <span className={`heart-div ${className}`} aria-hidden="true">
      <i /><Heart size={size} /><i />
    </span>
  );
}

/* Baby's-breath (gypsophila) sprig. */
export function Floral({ className = '', flip = false }) {
  const blooms = [
    [52, 40], [44, 30], [60, 28], [70, 44], [38, 50], [80, 30], [88, 52], [64, 60], [96, 38],
    [104, 60], [112, 46], [76, 72], [120, 70], [92, 80], [130, 54], [110, 90], [140, 82], [124, 100],
  ];
  return (
    <svg className={`floral ${className}`} viewBox="0 0 200 220" style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity=".75">
        <path d="M190 215 C 150 170, 120 130, 60 40" />
        <path d="M150 168 C 130 140, 110 120, 88 52" />
        <path d="M130 138 C 120 110, 116 96, 112 46" />
        <path d="M168 190 C 150 160, 140 130, 130 54" />
        <path d="M110 112 C 100 96, 90 84, 44 30" />
        <path d="M120 125 C 116 100, 100 80, 80 30" />
        <path d="M150 165 C 140 140, 132 112, 140 82" />
        <path d="M140 150 C 130 128, 126 116, 120 70" />
      </g>
      {blooms.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <circle r="4.6" fill="#fff" opacity=".95" />
          <circle r="4.6" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".45" />
          <circle r="1.3" fill="currentColor" opacity=".55" />
        </g>
      ))}
    </svg>
  );
}

/* Soft blurred leaf shadow, top-left corner. */
export function LeafShadow({ className = '' }) {
  return (
    <svg className={`leaf-shadow ${className}`} viewBox="0 0 400 420" aria-hidden="true">
      <g fill="currentColor">
        {[
          [80, 60, -30], [150, 40, 10], [60, 150, -60], [140, 130, -20], [220, 90, 20],
          [110, 220, -50], [200, 190, -10], [40, 260, -70], [170, 280, -40],
        ].map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx="26" ry="56" transform={`rotate(${r} ${x} ${y})`} />
        ))}
        <path d="M0 0 C 120 120, 200 240, 260 420" stroke="currentColor" strokeWidth="6" fill="none" />
      </g>
    </svg>
  );
}

/* Logo recoloured with CSS (mask), so it always matches the brand tone. */
export function Logo({ className = '', label = 'BabySteps Guide Studio' }) {
  return <span className={`logo ${className}`} role="img" aria-label={label} />;
}

/* "The story behind our logo" — the four meanings around the logo. */
const STORY = [
  { icon: 'baby', title: 'The Baby Face', text: 'Represents innocence, warmth, love & new beginnings.', pos: 'tl' },
  { icon: 'camera', title: 'Guide Studio', text: 'Years of experience in storytelling through photography, now focused on your little ones.', pos: 'tr' },
  { icon: 'heart', title: 'Soft Earthy Tone', text: 'Reflects warmth, comfort, softness & a premium experience.', pos: 'bl' },
  { icon: 'sprout', title: 'A Modern Premium Family Studio', text: 'A beautifully designed space to create timeless memories.', pos: 'br' },
];

export function LogoStory() {
  return (
    <section className="logo-story">
      <LeafShadow />
      <div className="wrap">
        <div className="ls-head" data-reveal>
          <p className="ls-kicker">The story behind</p>
          <h2 className="ls-title">Our logo <Heart size={44} /></h2>
          <p className="caps-line">A symbol of love, memories &amp; beautiful beginnings.</p>
        </div>
        <div className="ls-stage">
          <svg className="ls-arrows" viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <marker id="ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
              </marker>
            </defs>
            <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="5 6" markerStart="url(#ah)" markerEnd="url(#ah)">
              <path d="M250 110 C 300 140, 320 170, 320 215" />
              <path d="M750 70 C 690 90, 660 130, 655 185" />
              <path d="M270 450 C 290 420, 300 390, 300 360" />
              <path d="M700 430 C 670 420, 660 390, 655 355" />
            </g>
          </svg>
          <div className="ls-center" data-reveal>
            <p className="ls-sub">A modern premium family studio</p>
            <Logo className="ls-logo" />
          </div>
          {STORY.map((s, i) => (
            <div key={s.title} className={`ls-point ${s.pos}`} data-reveal style={{ '--d': `${i * 120}ms` }}>
              <span className="ls-ic"><SessionIcon name={s.icon} size={40} /></span>
              <div><h3>{s.title}</h3><p>{s.text}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Line icons used on the session cards. */
const ICONS = {
  baby: (
    <>
      <circle cx="24" cy="27" r="11" />
      <path d="M19 27.5h.01M29 27.5h.01" strokeWidth="2.6" />
      <path d="M20.5 31.5c2 2 5 2 7 0" />
      <path d="M24 16c-1.5-2-1-4 1-4.5" />
      <path d="M24 8.5c-1.4-1.6-4-.8-3.6 1.4.3 1.6 3.6 3.6 3.6 3.6s3.3-2 3.6-3.6c.4-2.2-2.2-3-3.6-1.4z" />
    </>
  ),
  maternity: (
    <>
      <circle cx="22" cy="11" r="4.5" />
      <path d="M20 16c-2.5 2-3 6-2 9 .6 1.8 1.4 3 1 6l-1 11" />
      <path d="M24 16.5c1 3 0 5 1.5 7 3.5 1 6.5 4 6.5 8s-3 6.5-7 6.5c-2 0-3-.6-4-1.5" />
      <path d="M25 30.5c-.8-1-2.4-.4-2.2.9.2.9 2.2 2.1 2.2 2.1s2-1.2 2.2-2.1c.2-1.3-1.4-1.9-2.2-.9z" />
    </>
  ),
  cake: (
    <>
      <path d="M10 40h28" />
      <rect x="12" y="29" width="24" height="11" rx="2" />
      <rect x="16" y="21" width="16" height="8" rx="2" />
      <path d="M12 33c2 2 4 2 6 0s4-2 6 0 4 2 6 0 4-2 6 0" />
      <path d="M24 21v-4" />
      <path d="M24 12.5c-1-1.2-3-.6-2.7 1 .2 1.2 2.7 2.6 2.7 2.6s2.5-1.4 2.7-2.6c.3-1.6-1.7-2.2-2.7-1z" />
    </>
  ),
  family: (
    <>
      <circle cx="15" cy="17" r="4" />
      <circle cx="33" cy="17" r="4" />
      <circle cx="24" cy="25" r="3.2" />
      <path d="M8 38c0-6 3-11 7-11s5 2 6 4" />
      <path d="M40 38c0-6-3-11-7-11s-5 2-6 4" />
      <path d="M19 40c0-4 2-8 5-8s5 4 5 8" />
      <path d="M24 9.5c-.9-1-2.6-.5-2.4.9.2 1 2.4 2.3 2.4 2.3s2.2-1.3 2.4-2.3c.2-1.4-1.5-1.9-2.4-.9z" />
    </>
  ),
};

ICONS.camera = (
  <>
    <rect x="7" y="15" width="34" height="23" rx="3" />
    <path d="M17 15l2.5-4h9l2.5 4" />
    <circle cx="24" cy="26.5" r="6.5" />
    <circle cx="24" cy="26.5" r="2.5" />
    <path d="M35 20h.01" strokeWidth="2.6" />
  </>
);
ICONS.heart = <path d="M24 39s-14-8.6-14-19.3A7.8 7.8 0 0124 15a7.8 7.8 0 0114 4.7C38 30.4 24 39 24 39z" />;
ICONS.sprout = (
  <>
    <path d="M24 40V22" />
    <path d="M24 26c0-6 4-10 11-10 0 7-4 11-11 10z" />
    <path d="M24 30c0-5-3.5-8-9-8 0 5.5 3.5 8.5 9 8z" />
    <path d="M14 40h20" />
  </>
);

export function SessionIcon({ name, size = 46 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

/* "Sarthak & Tanya" sticker signature from the BabySteps reels (rebuilt in CSS). */
export function SignatureSticker({ className = '', href = 'https://www.instagram.com/babystepsbyguide/' }) {
  return (
    <a className={`sticker ${className}`} href={href} target="_blank" rel="noreferrer" aria-label="Sarthak and Tanya on Instagram @babystepsbyguide">
      <span className="st-name st-1">sarthak</span>
      <span className="st-tag">@BABYSTEPSbyGUIDE</span>
      <span className="st-name st-2">Tanya</span>
    </a>
  );
}
