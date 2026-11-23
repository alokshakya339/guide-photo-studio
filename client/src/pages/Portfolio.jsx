import { Link, Navigate, useParams } from 'react-router-dom';
import { useApi } from '../api.js';
import Gallery from '../components/Gallery.jsx';
import { PageHero, Loader, ErrorNote, useTitle, useReveal } from '../components/common.jsx';
import { IconArrow } from '../components/Icons.jsx';
import BabyStepsCard, { BABYSTEPS_SLUGS } from '../components/BabySteps.jsx';

const SLUG_TYPE = {
  wedding: 'Wedding',
  'pre-wedding': 'Pre-Wedding',
  headshot: 'Head Shots',
};

export function Portfolio() {
  useTitle('Portfolio');
  const { data, loading, error } = useApi('/categories');
  useReveal(data?.length);
  return (
    <>
      <PageHero
        eyebrow="Portfolio"
        title="Our work"
        intro="Weddings, pre-wedding stories and portraits, photographed in Noida, across Delhi NCR and at destinations."
        image="/images/wedding/w13.jpg"
      />
      <section className="section">
        <div className="container">
          {loading && <Loader />}
          <ErrorNote error={error} />
          <div className="ework__grid ework__grid--even">
            {data?.map((c, n) => (
              <Link key={c.slug} to={`/portfolio/${c.slug}`} className="ework__card" data-reveal style={{ '--d': `${(n % 3) * 90}ms` }}>
                <figure><img src={c.cover} alt={`${c.title} photography`} loading="lazy" /></figure>
                <span className="ework__num">{String(n + 1).padStart(2, '0')}</span>
                <span className="ework__body">
                  <strong>{c.title}</strong>
                  <small>{c.description || c.tagline}</small>
                </span>
                <span className="ework__more">{c.count} photos <IconArrow width={14} height={14} /></span>
              </Link>
            ))}
          </div>
          <div className="bsx-wrap" data-reveal><BabyStepsCard /></div>
        </div>
      </section>
    </>
  );
}

export function Category() {
  const { slug } = useParams();
  const { data, loading, error } = useApi(`/categories/${slug}`);
  useTitle(data?.title || 'Portfolio');

  if (loading) return <div className="section"><Loader /></div>;
  if (error) {
    // Maternity / baby / birthday moved to BabySteps: say so (old links and Google results land here).
    if (BABYSTEPS_SLUGS.includes(slug)) {
      return (
        <section className="section">
          <div className="container bsx-moved">
            <p className="eyebrow">This collection has moved</p>
            <h1 className="etitle">Baby &amp; maternity shoots are now at <em>BabySteps</em></h1>
            <BabyStepsCard />
            <Link to="/portfolio" className="elink">See our wedding &amp; portrait work <IconArrow width={14} height={14} /></Link>
          </div>
        </section>
      );
    }
    return <Navigate to="/portfolio" replace />;
  }

  return (
    <>
      <PageHero eyebrow={data.tagline} title={data.title} intro={data.description} image={data.cover} />
      <section className="section">
        <div className="container">
          <div className="crumbs">
            <Link to="/portfolio">Portfolio</Link> <span>/</span> <span>{data.title}</span>
            <span className="muted">· {data.images.length} photos</span>
          </div>
          <Gallery images={data.images} />
          <div className="center-cta">
            <p className="lead">Love this style? Let’s plan your {data.title.toLowerCase()} shoot.</p>
            <Link to={`/contact?type=${encodeURIComponent(SLUG_TYPE[data.slug] || '')}`} className="btn btn--primary">
              Enquire now <IconArrow width={18} height={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
