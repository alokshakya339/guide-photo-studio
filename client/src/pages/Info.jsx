import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../api.js';
import { SITE, EVENT_TYPES, formatINR } from '../site.js';
import Gallery from '../components/Gallery.jsx';
import InquiryForm from '../components/InquiryForm.jsx';
import Reels from '../components/Reels.jsx';
import FilmShowcase from '../components/FilmShowcase.jsx';
import FilmLibrary from '../components/FilmLibrary.jsx';
import Awards from '../components/Awards.jsx';
import Founders from '../components/Founders.jsx';
import FamilyTree from '../components/FamilyTree.jsx';
import OurStory from '../components/OurStory.jsx';
import { PageHero, SectionHead, FilmPlayer, Loader, ErrorNote, useTitle, useReveal } from '../components/common.jsx';
import {
  IconArrow, IconChevron, IconPhone, IconMail, IconPin, IconClock, IconWhatsApp, IconYoutube, IconInstagram,
} from '../components/Icons.jsx';

const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(SITE.mapQuery)}&output=embed`;

export function Films() {
  useTitle('Wedding Films');
  useReveal();
  const [featured, ...rest] = SITE.films || [];
  return (
    <>
      <PageHero
        eyebrow="Wedding films"
        title={<>Cinematic films <em>of your day</em></>}
        intro="Shot by a team of two to three cinematographers: a 5–30 minute film of your wedding, plus a short teaser to share. Here are some of our favourites."
        image="/images/wedding/w03.jpg"
      />
      <section className="section efilms-page dark-zone">
        <div className="container stack">
          {featured && <FilmShowcase film={featured} eyebrow="Featured film" moreLink={null} />}
          {rest.length > 0 && (
            <div className="efilms-page__lib">
              <div className="ehead" data-reveal>
                <div>
                  <p className="eyebrow">The library</p>
                  <h2 className="etitle">MORE <em>stories</em> on film</h2>
                </div>
                <a href={SITE.social.youtube} target="_blank" rel="noreferrer" className="elink">YouTube channel <IconArrow width={14} height={14} /></a>
              </div>
              <FilmLibrary films={rest} />
            </div>
          )}
          {SITE.reels?.length > 0 && <div className="efilms-page__reels"><Reels eyebrow="Shorts" title={<>Reels <em>&amp; teasers</em></>} intro="Bite-sized moments from our latest shoots. Tap a reel to play it here." /></div>}
        </div>
      </section>
    </>
  );
}

function Faq({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="faq">
      {items.map((f, i) => (
        <div key={f._id} className={`faq__item ${open === i ? 'is-open' : ''}`}>
          <button className="faq__q" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
            {f.question}
            <IconChevron dir={open === i ? 'up' : 'down'} />
          </button>
          {open === i && <p className="faq__a">{f.answer}</p>}
        </div>
      ))}
    </div>
  );
}

const PKG_TYPE = {
  'Wedding Photography': 'Wedding',
  'Wedding Films': 'Wedding Film',
  'Pre-Wedding Shoot': 'Pre-Wedding',
  'Maternity & Baby': 'Maternity',
  'Birthdays & Events': 'Birthday',
  'Headshots & Portfolio': 'Head Shots',
};

const STEPS = [
  ['Enquire', 'Share your date, venue and the functions you need covered.'],
  ['Plan', 'We call you to understand your story and suggest a package.'],
  ['Confirm', 'A 50% advance locks in your date. The balance is due on the day.'],
  ['Shoot', 'Our lead photographers and team capture every moment.'],
  ['Deliver', 'Edited photos in a private online gallery, plus your album and film.'],
];

export function Services() {
  useTitle('Services & Pricing');
  const packages = useApi('/packages');
  const faqs = useApi('/faqs');
  return (
    <>
      <PageHero
        eyebrow="Services & pricing"
        title="Packages built around your story"
        intro="Every celebration is different, so pricing is on request. Tell us your dates, functions and deliverables and we’ll share a package made for you."
        image="/images/wedding/w20.jpg"
      />
      <section className="section">
        <div className="container">
          {packages.loading && <Loader />}
          <ErrorNote error={packages.error} />
          <div className="price-grid price-grid--3">
            {packages.data?.map((p) => (
              <div key={p._id} className={`price ${p.highlight ? 'price--hl' : ''}`}>
                {p.highlight && <span className="badge">Most booked</span>}
                <h3>{p.title}</h3>
                <p className="price__amount">
                  {p.startingPrice != null && <small>from</small>} {formatINR(p.startingPrice)} {p.startingPrice != null && p.unit && <small>{p.unit}</small>}
                </p>
                <p className="muted">{p.description}</p>
                <ul className="ticks">
                  {p.includes.map((x) => <li key={x}>{x}</li>)}
                </ul>
                <Link
                  to={`/contact?type=${encodeURIComponent(PKG_TYPE[p.title] || '')}`}
                  className={`btn ${p.highlight ? 'btn--primary' : 'btn--ghost'}`}
                >
                  Enquire
                </Link>
              </div>
            ))}
          </div>
          <p className="muted small">
            Outstation shoots: travel, local transport and stay are billed at actuals. We can arrange these for you.
          </p>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <SectionHead eyebrow="How it works" title="From first call to final album" />
          <ol className="steps">
            {STEPS.map(([t, d], i) => (
              <li key={t}>
                <span className="steps__n">{String(i + 1).padStart(2, '0')}</span>
                <h3>{t}</h3>
                <p className="muted">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="container narrow">
          <SectionHead eyebrow="FAQs" title="Good to know" align="center" />
          {faqs.data && <Faq items={faqs.data} />}
        </div>
      </section>
    </>
  );
}

export function About() {
  useTitle('Our Studio');
  useReveal();
  const studio = SITE.studioPhotos.map((src, i) => ({ src, alt: `Inside Guide Photo Studio, Noida (${i + 1})` }));
  return (
    <>
      <PageHero
        eyebrow="Our studio"
        title="Four generations of looking closely"
        intro="Moments pass, but memories, if captured right, are eternal."
        image="/images/studio/s8.jpg"
      />
      <OurStory />

      <FamilyTree />

      <Founders link={false} />

      <Awards />

      <section className="section section--alt">
        <div className="container">
          <SectionHead eyebrow="Inside the studio" title="Come say hello" intro={SITE.address} />
          <Gallery images={studio} />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="map">
            <iframe src={mapSrc} title="Guide Photo Studio on Google Maps" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>
      </section>
    </>
  );
}

export function Contact() {
  useTitle('Contact');
  const [params] = useSearchParams();
  const type = params.get('type') || '';
  const giftParam = params.get('gift') || '';
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={<>Let’s plan <em>your</em> shoot</>}
        intro="Tell us a little about your event. We’ll confirm availability and share package options."
        image="/images/home/couple-4.jpg"
      >
        <div className="contact-quick">
          <a href={`tel:${SITE.phoneRaw}`} className="ebtn ebtn--dark"><IconPhone /> {SITE.phone}</a>
          <a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noreferrer" className="ebtn ebtn--line"><IconWhatsApp /> WhatsApp us</a>
        </div>
      </PageHero>

      <section className="section contact-sec">
        <div className="container contact-grid">
          <div className="contact-card" id="enquiry">
            <p className="eyebrow">Enquiry</p>
            <h2>Tell us about <em>your day</em></h2>
            <p className="contact-card__sub">A few details are enough — fields marked * are required.</p>
            <InquiryForm key={`${type}-${giftParam}`} defaultEventType={EVENT_TYPES.includes(type) ? type : ''} defaultGift={giftParam} source="contact" />
          </div>

          <aside className="contact-side">
            <p className="contact-side__kicker">Reach us directly</p>
            <h3>Prefer to talk?</h3>
            <div className="contact-list">
              <a href={`tel:${SITE.phoneRaw}`} className="contact-item">
                <IconPhone /> <span><strong>Call Sarthak Chopra</strong>{SITE.phone}</span>
              </a>
              <a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noreferrer" className="contact-item">
                <IconWhatsApp /> <span><strong>WhatsApp</strong>Message us any time</span>
              </a>
              <a href={`mailto:${SITE.email}`} className="contact-item">
                <IconMail /> <span><strong>Email</strong>{SITE.email}</span>
              </a>
              <a href={SITE.social.instagram} target="_blank" rel="noreferrer" className="contact-item">
                <IconInstagram /> <span><strong>Instagram</strong>@guidephotostudio</span>
              </a>
            </div>
            <div className="contact-side__visit">
              <div><IconPin /><span><strong>Studio</strong>{SITE.address}</span></div>
              <div><IconClock /><span><strong>Hours</strong>{SITE.hours}</span></div>
            </div>
          </aside>
        </div>

        <ol className="container contact-steps">
          <li><b>01</b><h4>Share your plans</h4><p>Send the form, call or WhatsApp — dates, venue and what you have in mind.</p></li>
          <li><b>02</b><h4>We confirm availability</h4><p>We check the date and share the package options that fit your event.</p></li>
          <li><b>03</b><h4>Lock your date</h4><p>Pick your package and we start planning your shoot together.</p></li>
        </ol>

        <div className="container">
          <div className="map contact-map">
            <iframe src={mapSrc} title="Studio location" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>
      </section>
    </>
  );
}

export function Privacy() {
  useTitle('Privacy policy');
  return (
    <>
      <PageHero eyebrow="Privacy policy" title="Your memories, kept with care" intro="How Guide Photo Studio collects, uses and protects your personal information and your photographs." />
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container eprose">
          <h2>Information we collect</h2>
          <p>
            When you enquire or book, we collect the details you share with us: your name, phone or WhatsApp number,
            email, event date, venue and the plans you describe. For client galleries we also keep your gallery name,
            your photographs and films, and the favourites and album selections you make.
          </p>
          <h2>How we use your information</h2>
          <p>
            We use your details only to reply to your enquiry, plan and deliver your shoot, share your private gallery,
            prepare your album and film, and contact you about your booking. We don’t sell your information or send
            marketing messages without your permission.
          </p>
          <h2>Data security</h2>
          <p>
            Client galleries are password-protected and gallery passwords are stored in encrypted form. Access to your
            details and photographs is limited to our team. We take reasonable care to protect your information.
          </p>
          <h2>Third-party services</h2>
          <p>
            We rely on a few trusted services to run the studio: website hosting and database providers, Google Drive and
            YouTube for storing and streaming galleries and films, WhatsApp when you choose to chat with us, and Razorpay
            when you pay for gallery hosting online. Each receives only what it needs.
          </p>
          <h2>Your photographs</h2>
          <p>
            Your photographs are part of your family’s story. We share images from your shoot in our portfolio or on social
            media only with your consent, and we will remove any image if you ask.
          </p>
          <h2>Client rights</h2>
          <p>
            You can ask us what information we hold about you, ask us to correct it, or ask us to delete it, subject to the
            records we must keep for accounting and legal reasons. Just get in touch using the details below.
          </p>
          <h2>Ancestral heritage</h2>
          <p>
            Guide Photo Studio is a family-owned business with a legacy spanning four generations, serving families in
            Noida and Delhi for over 25 years. The trust our clients place in us is the foundation of everything we do.
          </p>
          <h2>Contact us</h2>
          <p>
            {SITE.name} · {SITE.address}<br />
            Phone: <a href={`tel:${SITE.phoneRaw}`}>{SITE.phone}</a> · Email: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </p>
        </div>
      </section>
    </>
  );
}

export function NotFound() {
  useTitle('Page not found');
  return (
    <section className="section container center-cta" style={{ minHeight: '60vh', paddingTop: 160 }}>
      <h1>Page not found</h1>
      <p className="lead">This page may have moved.</p>
      <Link to="/" className="btn btn--primary">Go home</Link>
    </section>
  );
}
