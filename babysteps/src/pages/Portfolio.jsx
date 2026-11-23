import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../Icons.jsx';
import Reels from '../Reels.jsx';
import { JOURNEY, GALLERY, CATEGORIES, PACKAGES, sessionBySlug } from '../data.js';
import { Label, PageHero, PhotoGrid, CtaBand, PackagesBlock, usePage, useSeo, useReveal, pad, bookHref } from '../lib.jsx';
import { sessionSeo } from '../seoMeta.js';
import NotFound from './NotFound.jsx';

export function Portfolio() {
  useSeo('portfolio');
  useReveal();
  const [params, setParams] = useSearchParams();
  const filter = params.get('cat') || 'all';
  const items = filter === 'all' ? GALLERY : GALLERY.filter((g) => g.cat === filter);
  const filters = [['all', 'All'], ...CATEGORIES.map((c) => [c.key, c.label])].filter(([k]) => k === 'all' || GALLERY.some((g) => g.cat === k));

  return (
    <>
      <PageHero
        crumb={[[null, 'Portfolio']]}
        title={<>Our <em>portfolio</em></>}
        intro="A collection of beautiful moments captured for families across Noida. Each image tells a unique story of love, joy and connection."
      />

      <section className="wrap collections">
        {JOURNEY.map((j, k) => (
          <Link key={j.slug} to={`/portfolio/${j.slug}`} className="collection" data-reveal style={{ '--d': `${(k % 3) * 80}ms` }}>
            <div className="collection-img"><img src={j.img} alt={`${j.title} photography`} loading="lazy" /></div>
            <div className="collection-cap">
              <span>{pad(k + 1)}</span>
              <h2>{j.title}</h2>
              <Icon name="arrow" size={20} />
            </div>
            <small>{j.when} · from ₹{j.from}</small>
          </Link>
        ))}
      </section>

      <section className="section all-work">
        <div className="wrap">
          <div className="head-row" data-reveal>
            <div>
              <Label>All work</Label>
              <h2 className="h2">Browse <em>every moment</em></h2>
            </div>
            <div className="filters">
              {filters.map(([k, l]) => (
                <button key={k} className={filter === k ? 'on' : ''} aria-pressed={filter === k}
                  onClick={() => setParams(k === 'all' ? {} : { cat: k }, { replace: true, preventScrollReset: true })}>{l}</button>
              ))}
            </div>
          </div>
          <PhotoGrid items={items} key={filter} />
        </div>
      </section>
      <Reels />
    </>
  );
}

export function Category() {
  const { slug } = useParams();
  const s = sessionBySlug(slug);
  const seo = sessionSeo(s);
  usePage(seo.title, seo.description);
  useReveal();
  if (!s) return <NotFound />;

  const idx = JOURNEY.indexOf(s);
  const next = JOURNEY[(idx + 1) % JOURNEY.length];
  const photos = GALLERY.filter((g) => g.cat === s.key);
  const shoot = s.title === 'Baby Milestones' ? 'Baby Milestone' : s.title;

  return (
    <>
      <PageHero
        crumb={[['/portfolio', 'Portfolio'], [null, s.title]]}
        title={<>{s.title} <em>photography</em></>}
        intro={s.text}
        img={s.img}
      />

      <section className="wrap facts" data-reveal>
        <div><small>Best time</small><b>{s.when}</b></div>
        <div><small>Starting from</small><b>₹{s.from}</b></div>
        <div><small>Included</small><b>{s.perks.join(' · ')}</b></div>
        <Link className="btn btn-dark" to={bookHref(shoot)}>Book this session</Link>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="head-row" data-reveal>
            <div>
              <Label>Gallery</Label>
              <h2 className="h2">{s.title} <em>moments</em></h2>
            </div>
            <p className="head-note">A few favourites from our {s.title.toLowerCase()} sessions. Tap any photo to view it full screen.</p>
          </div>
          <PhotoGrid items={photos} />
        </div>
      </section>

      {PACKAGES[s.pkg] && (
        <section className="section packages">
          <div className="wrap">
            <div className="center-head" data-reveal>
              <Label>Pricing</Label>
              <h2 className="h2">Packages for <em>{s.title.toLowerCase()}</em></h2>
            </div>
            <PackagesBlock initial={s.pkg} />
          </div>
        </section>
      )}

      <Link to={`/portfolio/${next.slug}`} className="next-session">
        <div className="wrap next-inner">
          <span>Next session</span>
          <b>{next.title}</b>
          <Icon name="arrow" size={28} />
        </div>
        <img src={next.img} alt="" />
      </Link>
    </>
  );
}
