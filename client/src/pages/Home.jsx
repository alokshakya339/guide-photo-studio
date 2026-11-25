import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../api.js';
import { SITE, formatINR } from '../site.js';
import Gallery from '../components/Gallery.jsx';
import InquiryForm from '../components/InquiryForm.jsx';
import CorporateServices from '../components/CorporateServices.jsx';
import Reels from '../components/Reels.jsx';
import FilmShowcase from '../components/FilmShowcase.jsx';
import Awards from '../components/Awards.jsx';
import VideoBg from '../components/VideoBg.jsx';
import Founders from '../components/Founders.jsx';
import FamilyTree from '../components/FamilyTree.jsx';
import KindWords from '../components/KindWords.jsx';
import ShootPicker from '../components/ShootPicker.jsx';
import StickerWall from '../components/StickerWall.jsx';
import { LatestPosts } from './Blog.jsx';
import { useTitle, useReveal, CountUp, Loader } from '../components/common.jsx';
import { IconArrow, IconPhone, IconWhatsApp } from '../components/Icons.jsx';

const WORDS = ['emotions', 'rituals', 'promises', 'laughter', 'memories'];
const pad = (n) => String(n).padStart(2, '0');

function Hero() {
  const slides = SITE.heroSlides;
  const [i, setI] = useState(0);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 6000);
    const u = setInterval(() => setW((n) => (n + 1) % WORDS.length), 2600);
    return () => { clearInterval(t); clearInterval(u); };
  }, [slides.length]);

  return (
    <section className="ehero">
      {slides.map((s, n) => (
        <img
          key={s.src}
          src={s.src}
          alt={n === i ? s.alt : ''}
          className={`ehero__slide ${n === i ? 'is-active' : ''}`}
          fetchpriority={n === 0 ? 'high' : 'low'}
          loading={n === 0 ? 'eager' : 'lazy'}
          draggable="false"
        />
      ))}
      <div className="ehero__shade" />
      <div className="container ehero__content">
        <p className="ehero__eyebrow">25+ years · Four generations<span className="hide-sm"> · Noida, Delhi NCR &amp; destinations</span></p>
        <h1 className="ehero__title">
          Raw <span className="ehero__word" key={w}><em>{WORDS[w]}</em></span>,
          <br /> beautifully captured.
        </h1>
        <p className="ehero__lead hide-sm">
          Cinematic wedding photography &amp; films, pre-wedding and portrait shoots, by a family of
          photographers four generations strong.
        </p>
        <p className="ehero__lead show-sm">Weddings, films &amp; portraits by a family studio in Noida.</p>
        <div className="ehero__ctas">
          <Link to="/contact" className="ebtn ebtn--light">Enquire now <IconArrow width={16} height={16} /></Link>
          <Link to="/portfolio" className="ebtn ebtn--line-light">Our work</Link>
        </div>
      </div>
      <div className="ehero__meta">
        <span className="ehero__count">{pad(i + 1)} <i /> {pad(slides.length)}</span>
        <div className="ehero__dots" role="tablist" aria-label="Hero slides">
          {slides.map((s, n) => (
            <button key={s.src} role="tab" aria-selected={n === i} aria-label={`Slide ${n + 1}`} onClick={() => setI(n)} className={n === i ? 'is-active' : ''} />
          ))}
        </div>
      </div>
      <a href="#journey" className="ehero__scroll" aria-label="Scroll to content"><span /></a>
    </section>
  );
}

function Marquee({ items }) {
  // The track slides by half its width, so each half must be wider than the widest screen
  // or the end of the track shows as blank space. Repeat short lists until a half has ~12 items,
  // and stretch the duration by the same factor so the scroll speed stays constant.
  const reps = Math.max(1, Math.ceil(12 / Math.max(items.length, 1)));
  const half = Array.from({ length: reps }, () => items).flat();
  const row = (copy) => half.map((t, i) => <span key={`${copy}-${i}`}>{t}<i aria-hidden="true">✦</i></span>);
  return (
    <div className="emarquee" aria-hidden="true">
      <div className="emarquee__track" style={{ animationDuration: `${38 * reps}s` }}>{row('a')}{row('b')}</div>
    </div>
  );
}

export default function Home() {
  useTitle('');
  const cats = useApi('/categories');
  const featured = useApi('/featured');
  const packages = useApi('/packages');
  const testimonials = useApi('/testimonials');
  useReveal(`${cats.data?.length}-${featured.data?.length}-${packages.data?.length}-${testimonials.data?.length}`);

  const catNames = cats.data?.map((c) => c.title) || ['Weddings', 'Pre-Wedding', 'Head Shots'];
  const quotes = testimonials.data || [];

  return (
    <>
      <Hero />

      {/* Our journey */}
      <section className="esec ejourney" id="journey">
        <div className="container ejourney__inner" data-reveal>
          <p className="eyebrow">Our journey</p>
          <blockquote className="ejourney__quote">
            “Moments pass, but memories, if captured <em>right</em>, are eternal.”
          </blockquote>
          <p className="ejourney__by">Sandeep &amp; Sarthak Chopra</p>
          <p className="ejourney__text">
            A family studio in Noida, photographing weddings, pre-wedding stories and portraits
            across Delhi NCR and destinations: candid, cinematic and made to last.
          </p>
          <div className="ejourney__ctas">
            <Link to="/contact" className="ebtn ebtn--dark">Enquire now <IconArrow width={16} height={16} /></Link>
            <Link to="/about" className="elink">Know more about us <IconArrow width={14} height={14} /></Link>
          </div>
        </div>
      </section>

      <Marquee items={[...catNames, 'Wedding Films']} />

      {/* Full-bleed feature */}
      <section className="efeature">
        <img src="/images/wedding/w15.jpg" alt="Bride and groom embracing" loading="lazy" />
        <div className="efeature__shade" />
        <div className="container efeature__text" data-reveal>
          <h2>RAW <em>emotions,</em><br />CAPTURED.</h2>
          <p>Unscripted moments, honest light and the people you love: the way your day really felt.</p>
        </div>
      </section>

      {/* Storytelling */}
      <section className="esec estory">
        <div className="container estory__grid">
          <div className="estory__media" data-reveal>
            <span className="estory__frame" aria-hidden="true" />
            <img className="estory__a" src="/images/home/couple-3.jpg" alt="Bride and groom in a palace hall" loading="lazy" />
            <img className="estory__b" src="/images/wedding/w08.jpg" alt="Bride smiling in her wedding jewellery" loading="lazy" />
            <span className="estory__seal" aria-label="Over 25 years, four generations">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <defs><path id="sealPath" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" /></defs>
                <text><textPath href="#sealPath">FOUR GENERATIONS · ONE FAMILY · </textPath></text>
              </svg>
              <b>25<sup>+</sup></b>
              <small>years</small>
            </span>
          </div>
          <div className="estory__copy" data-reveal>
            <p className="eyebrow">A family of photographers</p>
            <h2 className="etitle">STORYTELLING, <em>perfected.</em></h2>
            <p>
              Guide Photo Studio began with the late <strong>Shri Parvesh Chopra</strong>’s love for photography. His son
              <strong> Sandeep Chopra</strong> carried that artistry forward and built a studio families across Noida trust
              for warmth and artistic excellence.
            </p>
            <p>
              Today Creative Director <strong>Sarthak Chopra</strong> brings the next generation’s eye: modern techniques,
              cinematic films and an uncompromising standard for quality, from grand weddings and destination
              pre-weddings to portfolio and product shoots.
            </p>
            <Link to="/about" className="elink">Learn more <IconArrow width={14} height={14} /></Link>
          </div>
        </div>
      </section>

      <FamilyTree />

      <Founders />

      {/* Stats over a looping film clip */}
      <section className="evstats">
        <VideoBg
          src={SITE.statsVideo?.src}
          youtube={SITE.statsVideo?.youtube ?? SITE.films?.[0]?.id}
          start={SITE.statsVideo?.start ?? 95}
          length={SITE.statsVideo?.length ?? 45}
          poster={SITE.statsVideo?.poster || '/images/wedding/w21.jpg'}
        />
        <div className="evstats__shade" />
        <div className="container evstats__grid">
          <div className="evstats__copy" data-reveal>
            <h2>REAL <em>wedding tales,</em><br />CRAFTED <em>with</em> LOVE</h2>
            <p>Four generations of honest, unscripted storytelling.</p>
          </div>
          <ul className="evstats__list" data-reveal style={{ '--d': '150ms' }}>
            <li><i>over</i><b><CountUp to={25} suffix="+" /></b><span>Years</span></li>
            <li><i>across</i><b><CountUp to={4} /></b><span>Generations</span></li>
            <li><i>up to</i><b><CountUp to={1000} /></b><span>Images per wedding</span></li>
          </ul>
        </div>
      </section>

      <ShootPicker categories={cats.data || []} />

      <CorporateServices />

      {/* Films (dark band) */}
      {(SITE.films?.[0] || SITE.reels?.length > 0) && (
        <section className="esec efilms dark-zone">
          <div className="container">
            <div className="ehead" data-reveal>
              <div>
                <p className="eyebrow">Wedding films</p>
                <h2 className="etitle">CINEMA <em>of your day</em></h2>
              </div>
              <Link to="/films" className="elink">All films <IconArrow width={14} height={14} /></Link>
            </div>
            {SITE.films?.[0] && <FilmShowcase film={SITE.films[0]} eyebrow="Featured film" moreLink={null} />}
            {SITE.reels?.length > 0 && <div className="efilms__reels"><Reels /></div>}
          </div>
        </section>
      )}

      {/* Recent favourites */}
      <section className="esec efav">
        <div className="container">
          <div className="ehead" data-reveal>
            <div>
              <p className="eyebrow">Recent favourites</p>
              <h2 className="etitle">FRAMES we <em>love</em></h2>
            </div>
            <a href={SITE.social.instagram} target="_blank" rel="noreferrer" className="elink">Follow on Instagram <IconArrow width={14} height={14} /></a>
          </div>
          {featured.loading && <Loader />}
          {featured.data && <Gallery images={featured.data.slice(0, 12)} />}
        </div>
      </section>

      {/* Investment */}
      <section className="esec eprice">
        <div className="container">
          <div className="ehead ehead--center" data-reveal>
            <div>
              <p className="eyebrow">Investment</p>
              <h2 className="etitle">Packages, <em>priced on request</em></h2>
              <p className="esub">Every celebration is different, so the final package is tailored to your days, functions and deliverables.</p>
            </div>
          </div>
          <div className="eprice__row">
            {packages.data?.slice(0, 3).map((p, n) => (
              <div key={p._id} className="eprice__item" data-reveal style={{ '--d': `${n * 90}ms` }}>
                <span className="ework__num">{pad(n + 1)}</span>
                <h3>{p.title}</h3>
                <p className="eprice__amount">{p.startingPrice != null && <small>from</small>} {formatINR(p.startingPrice)} {p.startingPrice != null && p.unit && <small>{p.unit}</small>}</p>
                <p className="eprice__desc">{p.description}</p>
              </div>
            ))}
          </div>
          <p className="ecenter"><Link to="/services" className="ebtn ebtn--line">All packages &amp; FAQs <IconArrow width={16} height={16} /></Link></p>
        </div>
      </section>

      <LatestPosts />

      <KindWords items={quotes} />

      <Awards />

      <StickerWall />

      {/* Closing CTA */}
      <section className="esec eclose">
        <div className="container eclose__grid">
          <div className="eclose__copy" data-reveal>
            <p className="eyebrow">Now booking 2026 – 27</p>
            <h2 className="etitle">Begin your story <em>with us</em></h2>
            <p>Share your date and plans. We’ll check availability and send package options, usually the same day.</p>
            <ul className="eclose__list">
              <li><span>Call</span><a href={`tel:${SITE.phoneRaw}`}>{SITE.phone}</a></li>
              <li><span>Email</span><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
              <li><span>Hours</span>{SITE.hours}</li>
            </ul>
            <div className="eclose__quick">
              <a href={`tel:${SITE.phoneRaw}`} className="ebtn ebtn--line"><IconPhone width={16} height={16} /> Call</a>
              <a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noreferrer" className="ebtn ebtn--line"><IconWhatsApp width={16} height={16} /> WhatsApp</a>
            </div>
          </div>
          <div className="eclose__form" data-reveal>
            <InquiryForm compact source="home" />
          </div>
        </div>
      </section>
    </>
  );
}
