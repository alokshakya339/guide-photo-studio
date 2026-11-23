import { Link } from 'react-router-dom';
import { useApi } from '../api.js';
import { SITE } from '../site.js';
import InquiryForm from '../components/InquiryForm.jsx';
import { useTitle, useReveal } from '../components/common.jsx';
import { IconArrow, IconWhatsApp } from '../components/Icons.jsx';

// The demo invitation (preview link). Swap for a published sample once you have consented/sample photos.
const DEMO = '/invite/riya-raman-demo?preview=0b791c53afd83aafb416a2256d7c89c6';
const DEMO_EDITORIAL = '/invite/riya-raman-editorial?preview=7ac156702610955deecc28c4d9424765';
const DEMO_FLORAL = '/invite/riya-raman-floral?preview=bebaa3acc2a1d8d43bc4b678c7509d00';
const DEMO_MARIGOLD = '/invite/riya-raman-marigold?preview=02a72dc65bdb456a7a2082dd44502510';
const DEMO_MIDNIGHT = '/invite/riya-raman-midnight?preview=57643efa6d353dd83cf150ca17510f59';
const DEMO_MINIMAL = '/invite/riya-raman-minimal?preview=a99a3ad51dde1edc1f3033601cfd618c';
const DEMO_TEMPLE = '/invite/riya-raman-temple?preview=3f9c1e7a5b2d48c6a0e4f71b9d2c86e5';
const DEMO_SCROLL = '/invite/riya-raman-scroll?preview=c4e82a1f9b6d4073a5e1d8f2b7c39a60';
const DEMO_RAJWADA = '/invite/riya-raman-rajwada?preview=5d2a9e7c1b4f4a38b6e0c3d9f8a17e42';
const DEMO_CODEX = '/invite/riya-raman-codex?preview=8b1d5f3e7a2c4e96b0d4a8f1c6e37b25';
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

const FEATURES = [
  ['Envelope opening', 'A sealed envelope with your initials opens into your invitation, with music.'],
  ['Every function', 'Haldi, Mehendi, Sangeet, Wedding, Reception — dates, venues, dress codes, maps.'],
  ['RSVP & guest list', 'Guests reply in seconds; you get a clean list you can export for your planner.'],
  ['Blessings wall', 'Family and friends leave wishes — you approve what appears.'],
  ['Countdown & calendar', 'A live countdown, and one-tap “add to calendar” for every event.'],
  ['Photos & film', 'Your pre-wedding gallery and film, beautifully presented and fast on any phone.'],
  ['Private if you like', 'Password-protect your invitation for an intimate guest list.'],
  ['Share anywhere', 'One link for WhatsApp and Instagram, with your names and photo in the preview.'],
];
const STEPS = [
  ['Choose', 'Pick a design and package.'],
  ['Share details', 'Send your names, functions, photos and music.'],
  ['We design', 'Our team builds your invitation and sends a private preview.'],
  ['Approve', 'Request changes until it feels just right.'],
  ['Go live', 'Share your link — guestbook and RSVPs start coming in.'],
];
const THEMES = [
  ['Royal Indian', 'Maroon, ivory and gold with a wax-sealed envelope.', '/images/wedding/w12.jpg', DEMO],
  ['Guide Studio Editorial', 'Ivory, ink and antique gold — scratch-to-reveal date, story timeline, dress-code palettes.', '/images/home/couple-2.jpg', DEMO_EDITORIAL],
  ['Blush Garden', 'A secret garden — a 3D rosebud blooms open, vines sway, your story grows along a vine and photos fan out like a bouquet.', '/images/wedding/w17.jpg', DEMO_FLORAL],
  ['Marigold Mela', 'Haldi yellow and rani pink — a marigold curtain parts in 3D, kites fly, events are mela stalls and photos ride a ferris wheel.', '/images/wedding/w05.jpg', DEMO_MARIGOLD],
  ['Midnight Deco', 'Navy and champagne gold — fly through gold deco arches, a split-flap countdown and theatre-ticket events.', '/images/home/couple-3.jpg', DEMO_MIDNIGHT],
  ['Modern Minimal', 'Black, white and big type — blinds flip open, the story scrolls sideways and photos are a deck you deal.', '/images/home/couple-4.jpg', DEMO_MINIMAL],
  ['Rajwada Royal', 'Maroon damask palace doors with elephants, unrolling scrolls, a “reveal the date” moment and hanging story frames.', '/images/wedding/w12.jpg', DEMO_RAJWADA],
  ['Ancient Temple', 'Carved sandstone and temple gold — 3D doors swing open, parallax gopurams, events on stone pillars.', '/images/wedding/w05.jpg', DEMO_TEMPLE],
  ['Sacred Scroll', 'Break the wax seal to unroll a parchment scroll — sections unfold in 3D, events on palm-leaf manuscripts.', '/images/wedding/w17.jpg', DEMO_SCROLL],
  ['Royal Codex', 'An illuminated leather-bound book that opens in 3D — flipping folios and a spinning gallery of gilded plates.', '/images/home/couple-2.jpg', DEMO_CODEX],
];

export default function Invites() {
  useTitle('Digital Wedding Invitations');
  const pkgs = useApi('/invites/packages');
  useReveal(pkgs.data?.length);
  const wa = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent('Hi Guide Studio! I’d like to know more about your digital wedding invitations.')}`;

  return (
    <>
      <section className="ivh">
        <div className="container ivh__grid">
          <div className="ivh__copy">
            <p className="eyebrow">Invites by Guide Studio</p>
            <h1 className="ivh__title">Wedding invitations, <em>reimagined.</em></h1>
            <p className="ivh__lead">
              Not a PDF, not a card — a beautiful, personal invitation website for your wedding. An envelope that opens
              with your music, every function with maps, RSVPs, blessings and your love story, on one link your guests
              will remember.
            </p>
            <div className="ivh__ctas">
              <a href={DEMO} target="_blank" rel="noreferrer" className="ebtn ebtn--dark">See a live demo <IconArrow width={16} height={16} /></a>
              <Link to="/account?new=signature" className="ebtn ebtn--line">Create yours</Link>
            </div>
            <p className="ivh__url">guidephotostudio.com/invite/<b>your-names</b></p>
          </div>
          <a className="ivh__phone" href={DEMO} target="_blank" rel="noreferrer" aria-label="Open the demo invitation">
            <span className="ivh__screen">
              <span className="ivh__env">
                <span className="ivh__k">You are cordially invited</span>
                <span className="ivh__card"><span className="ivh__flap" /><span className="ivh__seal">RR</span></span>
                <span className="ivh__k">Tap to open</span>
              </span>
            </span>
          </a>
        </div>
      </section>

      <section className="section ivf">
        <div className="container">
          <div className="ehead ehead--center" data-reveal><div><p className="eyebrow">What your guests get</p><h2 className="etitle">Everything, <em>in one link</em></h2></div></div>
          <div className="ivf__grid">
            {FEATURES.map(([t, d], i) => (
              <div key={t} className="ivf__item" data-reveal style={{ '--d': `${(i % 4) * 70}ms` }}>
                <span className="ivf__n">{String(i + 1).padStart(2, '0')}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section ivt">
        <div className="container">
          <div className="ehead" data-reveal>
            <div><p className="eyebrow">Designs</p><h2 className="etitle">Choose your <em>style</em></h2></div>
            <p className="muted">Every design is personalised with your colours, fonts, photos and music.</p>
          </div>
          <div className="ivt__grid">
            {THEMES.map(([name, d, img, ready], i) => (
              <div key={name} className="ivt__item" data-reveal style={{ '--d': `${i * 90}ms` }}>
                <figure><img src={img} alt="" loading="lazy" />{!ready && <span className="ivt__soon">Coming soon</span>}</figure>
                <h3>{name}</h3>
                <p>{d}</p>
                {ready && <a href={ready} target="_blank" rel="noreferrer" className="elink">Preview <IconArrow width={14} height={14} /></a>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section ivp" id="packages">
        <div className="container">
          <div className="ehead ehead--center" data-reveal><div><p className="eyebrow">Packages</p><h2 className="etitle">Simple, <em>transparent</em> pricing</h2></div></div>
          <div className="ivp__grid">
            {pkgs.data?.map((p, i) => (
              <div key={p.code} className={`ivp__item ${p.highlight ? 'is-hl' : ''}`} data-reveal style={{ '--d': `${i * 90}ms` }}>
                {p.highlight && <span className="ivp__badge">Most loved</span>}
                <h3>{p.name}</h3>
                <p className="ivp__price">{inr(p.price)}</p>
                <p className="ivp__tag">{p.tagline}</p>
                <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
                <Link to={`/account?new=${p.code}`} className={`ebtn ${p.highlight ? 'ebtn--dark' : 'ebtn--line'}`}>Create with {p.name.replace(' Invite', '')}</Link>
              </div>
            ))}
          </div>
          <p className="ecenter muted small">Create and preview your invitation free — you only pay when you publish. Booking your wedding photography with us? Ask about adding an invitation to your package.</p>
        </div>
      </section>

      <section className="section ivs">
        <div className="container">
          <div className="ehead ehead--center" data-reveal><div><p className="eyebrow">How it works</p><h2 className="etitle">From your details to <em>your guests</em></h2></div></div>
          <ol className="steps">
            {STEPS.map(([t, d], i) => <li key={t} data-reveal style={{ '--d': `${i * 80}ms` }}><span className="steps__n">{String(i + 1).padStart(2, '0')}</span><h3>{t}</h3><p className="muted">{d}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="section eclose" id="order">
        <div className="container eclose__grid">
          <div className="eclose__copy" data-reveal>
            <p className="eyebrow">Create your invitation</p>
            <h2 className="etitle">Let’s create <em>yours</em></h2>
            <ol className="ivbuy">
              <li><b>Log in</b> or create a free account</li>
              <li><b>Create &amp; preview</b> — names, events, photos, music</li>
              <li><b>Pay &amp; publish</b> — it’s live instantly, share on WhatsApp</li>
            </ol>
            <div className="eclose__quick">
              <Link to="/account?new=signature" className="ebtn ebtn--dark">Start creating <IconArrow width={16} height={16} /></Link>
              <a href={wa} target="_blank" rel="noreferrer" className="ebtn ebtn--line"><IconWhatsApp width={16} height={16} /> Need help? WhatsApp</a>
            </div>
            <p className="muted small">Prefer that we set it up for you? Send the form and we’ll get in touch.</p>
            <p className="ivh__cross">Planning your wedding photography too? <Link to="/services">See our wedding packages →</Link></p>
          </div>
          <div className="eclose__form" data-reveal><InquiryForm defaultEventType="Digital Invitation" source="invites" compact /></div>
        </div>
      </section>
    </>
  );
}
