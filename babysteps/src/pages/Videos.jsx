import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../Icons.jsx';
import { REELS, STUDIO } from '../data.js';
import { PageHero, CtaBand, useSeo, useReveal } from '../lib.jsx';
import { ReelViewer, IconPlay, isYt, coverOf, reelUrl } from '../Reels.jsx';

/**
 * Public video gallery: every reel / YouTube Short from Admin → Reels, as a filterable grid.
 * Tapping a card opens the full-screen player (same one the home-page carousel uses).
 */
export default function Videos() {
  useSeo('videos');
  useReveal();
  const [params, setParams] = useSearchParams();
  const [viewer, setViewer] = useState(null);

  const tags = [...new Set(REELS.map((r) => r.tag).filter(Boolean))];
  const filter = params.get('tag') || 'all';
  const items = filter === 'all' ? REELS : REELS.filter((r) => r.tag === filter);

  return (
    <>
      <PageHero
        crumb={[[null, 'Videos']]}
        title={<>Stories <em>in motion</em></>}
        intro="Reels, behind-the-scenes moments and our parenting podcast — little films from the BabySteps studio in Noida."
      />

      <section className="section vg">
        <div className="wrap">
          {tags.length > 1 && (
            <div className="filters vg-filters" data-reveal>
              {[['all', 'All'], ...tags.map((t) => [t, t])].map(([k, l]) => (
                <button key={k} className={filter === k ? 'on' : ''} aria-pressed={filter === k}
                  onClick={() => setParams(k === 'all' ? {} : { tag: k }, { replace: true, preventScrollReset: true })}>{l}</button>
              ))}
            </div>
          )}

          {items.length === 0 ? (
            <p className="vg-empty">New videos are on their way — follow us on <a href={STUDIO.instagram} target="_blank" rel="noreferrer">Instagram</a> meanwhile.</p>
          ) : (
            <div className="vg-grid" key={filter}>
              {items.map((r, i) => (
                <article key={r.id} className="vg-card" data-reveal style={{ '--d': `${(i % 4) * 70}ms` }}>
                  <button className="reel-poster" onClick={() => setViewer(i)} aria-label={`Play ${r.title}`}>
                    <img src={coverOf(r)} alt="" loading="lazy" draggable="false"
                      onError={isYt(r) ? (e) => { if (!e.currentTarget.src.includes('hqdefault')) e.currentTarget.src = `https://i.ytimg.com/vi/${r.id}/hqdefault.jpg`; } : undefined} />
                    <span className="reel-play"><IconPlay /></span>
                    <span className="reel-meta">
                      {r.tag && <span className="reel-tag">{r.tag}</span>}
                      <strong>{r.title}</strong>
                    </span>
                  </button>
                  <a className="vg-src" href={reelUrl(r)} target="_blank" rel="noreferrer" aria-label={`Open on ${isYt(r) ? 'YouTube' : 'Instagram'}`}>
                    <Icon name={isYt(r) ? 'youtube' : 'insta'} size={16} />
                  </a>
                </article>
              ))}
            </div>
          )}

          <p className="vg-follow" data-reveal>
            More every week on <a href={STUDIO.instagram} target="_blank" rel="noreferrer"><Icon name="insta" size={16} /> Instagram</a>
          </p>
        </div>
      </section>

      {viewer != null && <ReelViewer reels={items} index={viewer} onChange={setViewer} />}
      <CtaBand />
    </>
  );
}
