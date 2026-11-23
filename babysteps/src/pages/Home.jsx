import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../Icons.jsx';
import Reels from '../Reels.jsx';
import Experience from '../Experience.jsx';
import HeroBanner from '../HeroBanner.jsx';
import { LatestPosts } from './Blog.jsx';
import { Heart, HeartDivider, Floral, LeafShadow, SessionIcon } from '../Decor.jsx';
import LogoStory from '../LogoStory.jsx';
import { api } from '../api.js';
import { STUDIO, IMG, JOURNEY, GALLERY, FEATURES, TESTIMONIALS, FAQS } from '../data.js';
import { Label, CtaBand, Lightbox, FaqList, useSeo, useReveal, reduced, pad, catLabel, bookHref } from '../lib.jsx';
import { studioSummary, studioHighlights, keyFaqs } from '../seoMeta.js';

const cards = () => [
  { img: IMG.newborn, icon: 'baby', title: 'Baby', sub: 'Shoots', to: '/portfolio/newborn', pos: '50% 60%' },
  { img: IMG.maternity, icon: 'maternity', title: 'Maternity', sub: 'Sessions', to: '/portfolio/maternity', pos: '50% 30%' },
  { img: IMG.milestone, icon: 'cake', title: 'Milestone', sub: 'Shoots', to: '/portfolio/milestones', pos: '50% 40%' },
  { img: IMG.family, icon: 'family', title: 'Family', sub: 'Portraits', to: '/portfolio/family', pos: '50% 30%' },
];

function Hero() {
  return (
    <section className="bhero">
      <LeafShadow />
      <Floral className="fl fl-tr" flip />
      <Floral className="fl fl-bl" />
      <Floral className="fl fl-br" flip />
      <div className="wrap bhero-inner">
        <p className="bh-kicker"><Heart size={34} /><span>We are now</span><Heart size={34} /></p>
        <h2 className="bh-title">Booking sessions!</h2>
        <HeartDivider />
        <p className="caps-line">Capturing your life's most precious chapters.</p>
        <span className="bh-swash" aria-hidden="true" />

        <div className="bcards">
          {cards().map((c, i) => (
            <Link key={c.title} to={c.to} className="bcard" style={{ '--i': i }}>
              <span className="bcard-img"><img src={c.img} alt={`${c.title} ${c.sub.toLowerCase()}`} style={{ objectPosition: c.pos }} loading="lazy" decoding="async" /></span>
              <span className="bcard-ic"><SessionIcon name={c.icon} /></span>
              <span className="bcard-title">{c.title}</span>
              <span className="bcard-sub"><i />{c.sub}<i /></span>
            </Link>
          ))}
        </div>

        <HeartDivider size={30} />
        <p className="bh-script">Timeless memories.</p>
        <p className="caps-line">Beautifully captured. Forever cherished.</p>
        <div className="bh-cta">
          <Link className="btn btn-dark" to="/contact#book">Book your session</Link>
          <Link className="btn btn-line" to="/portfolio">View portfolio</Link>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const row = JOURNEY.map((j) => <span key={j.key}>{j.title}<i>✦</i></span>);
  return <div className="marquee" aria-hidden="true"><div className="marquee-track">{row}{row}{row}</div></div>;
}

function Sessions() {
  const [active, setActive] = useState(0);
  const item = JOURNEY[active];
  return (
    <section className="section sessions">
      <div className="wrap">
        <div className="head-row" data-reveal>
          <div>
            <Label>Our sessions</Label>
            <h2 className="h2">Every little step,<br /><em>beautifully kept</em></h2>
          </div>
          <p className="head-note">Curated sessions designed for every milestone of your child's early years — from the first flutter of a bump to a messy first birthday.</p>
        </div>
        <div className="sessions-grid">
          <ol className="session-list">
            {JOURNEY.map((j, k) => (
              <li key={j.key} className={`session ${k === active ? 'active' : ''}`} onMouseEnter={() => setActive(k)} onFocus={() => setActive(k)}
                data-reveal style={{ '--d': `${k * 60}ms` }}>
                <Link className="session-row" to={`/portfolio/${j.slug}`}>
                  <span className="s-num">{pad(k + 1)}</span>
                  <span className="s-name">{j.title}</span>
                  <span className="s-when">{j.when}</span>
                  <span className="s-plus"><Icon name="arrow" size={16} /></span>
                </Link>
              </li>
            ))}
          </ol>
          <div className="session-preview" aria-hidden="true">
            <div className="preview-frame">
              {JOURNEY.map((j, k) => <img key={j.key} src={j.img} alt="" className={k === active ? 'on' : ''} loading="lazy" decoding="async" />)}
            </div>
            <div className="preview-cap" key={item.key}>
              <span>From ₹{item.from}</span>
              <b>{item.title}</b>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const STUDIO_IG = STUDIO.instagram;
const FEATURE_TABS = [['all', 'All'], ['newborn', 'Newborn'], ['maternity', 'Maternity'], ['milestone', 'Milestones'], ['family', 'Family']];
const BENTO = ['big', 'tall', '', '', 'wide', 'wide'];

function FeaturedStrip() {
  const [tab, setTab] = useState('all');
  const [box, setBox] = useState(-1);
  const pool = tab === 'all'
    ? GALLERY.slice(0, 6) // the six studio photos lead the gallery list
    : GALLERY.filter((g) => g.cat === tab);
  const items = pool.slice(0, 6);

  return (
    <section className="section featured">
      <div className="wrap">
        <div className="feat-head" data-reveal>
          <Label>Featured work</Label>
          <h2 className="h2">Moments from <em>our studio</em></h2>
          <HeartDivider />
          <div className="feat-tabs" role="tablist" aria-label="Filter photos">
            {FEATURE_TABS.map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
        </div>

        <div className={`bento n${items.length}`} key={tab}>
          {items.map((g, k) => (
            <button key={g.src} className={`bento-tile ${BENTO[k] || ''}`} style={{ '--d': `${k * 70}ms` }} onClick={() => setBox(k)} aria-label={`Open photo: ${g.alt}`}>
              <img src={g.src.replace('w=900', BENTO[k] === 'big' ? 'w=1200' : 'w=800')} alt={g.alt} loading="lazy" />
              <span className="bento-cap">
                <span>
                  <em>{catLabel(g.cat)}</em>
                  <small>{g.alt}</small>
                </span>
                <i aria-hidden="true"><Icon name="plus" size={18} /></i>
              </span>
            </button>
          ))}
        </div>

        <div className="feat-foot" data-reveal>
          <Link className="btn btn-dark" to={tab === 'all' ? '/portfolio' : `/portfolio?cat=${tab}`}>View full portfolio <Icon name="arrow" size={16} /></Link>
          <a className="btn-text" href={STUDIO_IG} target="_blank" rel="noreferrer"><Icon name="insta" size={16} /> More on Instagram</a>
        </div>
      </div>
      <Lightbox items={items} index={box} setIndex={setBox} />
    </section>
  );
}

function Testimonials() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced()) return undefined;
    const t = setTimeout(() => setI((x) => (x + 1) % TESTIMONIALS.length), 6500);
    return () => clearTimeout(t);
  }, [i]);
  const t = TESTIMONIALS[i];
  return (
    <section className="testi">
      <div className="wrap testi-inner" data-reveal>
        <span className="testi-mark" aria-hidden="true">“</span>
        <blockquote key={i} aria-live="polite">{t.text}</blockquote>
        <div className="testi-who" key={`w${i}`}><b>{t.name}</b><span>{t.shoot} session</span></div>
        <div className="testi-nav">
          <button aria-label="Previous review" onClick={() => setI((i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}><Icon name="left" /></button>
          <span>{pad(i + 1)} — {pad(TESTIMONIALS.length)}</span>
          <button aria-label="Next review" onClick={() => setI((i + 1) % TESTIMONIALS.length)}><Icon name="right" /></button>
        </div>
      </div>
    </section>
  );
}

function PricingTeaser() {
  const rows = [
    ['Maternity', '5,999', 'maternity'],
    ['Newborn', '9,999', 'newborn'],
    ['Baby & Milestones', '3,999', 'baby'],
    ['Cake Smash setup', '2,500', 'baby'],
  ];
  return (
    <section className="section teaser">
      <div className="wrap teaser-grid">
        <div data-reveal>
          <Label>Services & pricing</Label>
          <h2 className="h2">Thoughtfully<br /><em>curated</em> packages</h2>
          <p className="muted">Every package includes professional editing and delivery in a private online gallery. Need something different? We'll tailor one for you.</p>
          <div className="teaser-actions">
            <Link className="btn btn-dark" to="/services">See all packages</Link>
            <Link className="btn-text" to={bookHref('Not sure yet')}>Custom package <Icon name="arrow" size={18} /></Link>
          </div>
        </div>
        <ul className="price-list" data-reveal>
          {rows.map(([n, p, tab]) => (
            <li key={n}><Link to={`/services?tab=${tab}`}><span>{n}</span><i /><b><small>from</small> ₹{p}</b></Link></li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* Gift card promotion: stacked card visual + quick amount picks that open the Gift Cards page pre-filled. */
const GIFT_AMOUNTS = [2500, 5000, 10000];
const inrH = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
function GiftPromo() {
  const [online, setOnline] = useState(false);
  useEffect(() => { api('/payments/config').then((c) => setOnline(Boolean(c?.enabled))).catch(() => {}); }, []);
  const perks = [
    ['gift', 'Any session', 'Maternity, newborn, milestone, cake smash or family'],
    ['calendar', 'Valid 12 months', 'Plenty of time to plan the perfect shoot'],
    [online ? 'check' : 'heart', online ? 'Instant code' : 'Personal touch', online ? 'Pay online and get the code by email in seconds' : 'Request on WhatsApp — we send a personalised card'],
  ];
  return (
    <section className="section gpromo">
      <Floral className="fl gp-fl" flip />
      <div className="wrap gpromo-grid">
        <div className="gpromo-art" data-reveal aria-hidden="true">
          <div className="gc-card gp-back">
            <div className="gc-card-body">
              <span className="gc-card-brand">BabySteps <small>Guide Studio</small></span>
              <b className="gc-card-amount">{inrH(10000)}</b>
            </div>
          </div>
          <div className="gc-card gp-front">
            <img src={IMG.newborn} alt="" loading="lazy" />
            <div className="gc-card-body">
              <span className="gc-card-brand">BabySteps <small>Guide Studio</small></span>
              <span className="gc-card-label">Gift card</span>
              <b className="gc-card-amount">{inrH(5000)}</b>
              <span className="gc-card-to">For someone special</span>
              <span className="gc-card-code">BS-XXXX-XXXX</span>
            </div>
          </div>
          <span className="gp-bow"><Heart size={26} /></span>
        </div>

        <div className="gpromo-copy" data-reveal>
          <Label>Gift cards</Label>
          <h2 className="h2">Give the gift <em>of memories</em></h2>
          <p className="muted">The perfect present for a baby shower, naming ceremony or first birthday — a BabySteps photography session they'll treasure for years.</p>
          <ul className="gp-perks">
            {perks.map(([icon, t, d]) => (
              <li key={t}><span className="gp-perk-ic"><Icon name={icon} size={18} /></span><span><b>{t}</b>{d}</span></li>
            ))}
          </ul>
          <div className="gp-amounts" aria-label="Popular amounts">
            {GIFT_AMOUNTS.map((a) => <Link key={a} to={`/gift-cards?amount=${a}#buy`}>{inrH(a)}</Link>)}
            <Link to="/gift-cards#buy" className="gp-other">Other amount</Link>
          </div>
          <Link className="btn btn-dark" to="/gift-cards#buy">{online ? 'Buy a gift card' : 'Get a gift card'}</Link>
        </div>
      </div>
    </section>
  );
}

/** Plain, factual summary of the studio. This is the text Google's AI Overview and AI assistants quote. */
function AtAGlance() {
  return (
    <section className="section glance" aria-labelledby="glance-title">
      <div className="wrap">
        <div className="glance-head" data-reveal>
          <Label>At a glance</Label>
          <h2 className="h2" id="glance-title">Newborn, maternity &amp; baby <em>photography studio in Noida</em></h2>
          <p className="glance-summary">{studioSummary(JOURNEY)}</p>
        </div>
        <ul className="glance-grid">
          {studioHighlights(JOURNEY).map(([t, d], k) => (
            <li key={t} data-reveal style={{ '--d': `${k * 60}ms` }}>
              <strong>{t}</strong>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HomeFaq() {
  return (
    <section className="section faq" id="faq">
      <div className="wrap faq-grid">
        <div data-reveal>
          <Label>Good to know</Label>
          <h2 className="h2">Questions<br /><em>parents ask</em></h2>
          <p className="muted">Prices, timing, safety and what's included. Still unsure? We're one message away.</p>
          <Link className="btn-text" to="/contact#book">Book or ask a question <Icon name="arrow" size={18} /></Link>
        </div>
        <div data-reveal><FaqList items={[...keyFaqs(JOURNEY, STUDIO), ...FAQS]} /></div>
      </div>
    </section>
  );
}

export default function Home() {
  useSeo(null);
  useReveal();
  return (
    <>
      <HeroBanner />
      <Hero />
      <Marquee />
      <section className="intro wrap" data-reveal>
        <Label>Welcome to BabySteps</Label>
        <p className="statement">
          We believe every family has a unique story worth telling. Our approach is <em>personal, patient</em> and
          focused on capturing authentic moments — safely, gently and beautifully.
        </p>
        <span className="signature">Tanya & Sarthak Chopra</span>
      </section>
      <AtAGlance />
      <Sessions />
      <Experience />
      <LogoStory />
      <FeaturedStrip />
      <Reels />
      <PricingTeaser />
      <GiftPromo />
      <Testimonials />
      <HomeFaq />
      <LatestPosts />
    </>
  );
}
