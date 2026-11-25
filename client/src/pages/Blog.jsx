import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useApi } from '../api.js';
import { SITE } from '../site.js';
import { PageHero, useTitle, useReveal, useMounted, Loader, ErrorNote } from '../components/common.jsx';
import { Markdown, readingTime } from '../components/Markdown.jsx';
import { IconArrow, IconWhatsApp } from '../components/Icons.jsx';
import { NotFound } from './Info.jsx';

/*
 * Blog / journal (/blog, /blog/:slug). Posts are written in Admin → Blog.
 * Page titles and Google "article" data for each post are added on the server (server/src/seo.js).
 */

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const minutes = (p) => p.minutes || readingTime(p.body);

export function PostCard({ p, big = false, i = 0 }) {
  return (
    <Link to={`/blog/${p.slug}`} className={`bpost-card ${big ? 'bpost-card--big' : ''}`} data-reveal style={{ '--d': `${(i % 3) * 90}ms` }}>
      <span className="bpost-card__img">
        {p.cover ? <img src={p.cover} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="bpost-card__blank" aria-hidden="true" />}
        {p.category && <span className="bpost-card__cat">{p.category}</span>}
      </span>
      <span className="bpost-card__body">
        <span className="bpost-meta">{fmtDate(p.date)} · {minutes(p)} min read</span>
        <span className="bpost-card__title">{p.title}</span>
        {p.excerpt && <span className="bpost-card__excerpt">{p.excerpt}</span>}
        <span className="bpost-card__more">Read the story <IconArrow width={14} height={14} /></span>
      </span>
    </Link>
  );
}

export function Blog() {
  useTitle('Blog');
  const posts = useApi('/blog');
  useReveal(posts.data?.length);
  const [params, setParams] = useSearchParams();
  const cat = params.get('cat') || 'all';
  const list = posts.data || [];
  const cats = [...new Set(list.map((p) => p.category).filter(Boolean))];
  const shown = cat === 'all' ? list : list.filter((p) => p.category === cat);
  const [first, ...rest] = shown;

  return (
    <>
      <PageHero
        eyebrow="The journal"
        title={<>Stories, tips &amp; <em>ideas</em></>}
        intro="Wedding and pre-wedding photography tips, planning ideas and stories from our shoots, from a family studio four generations strong."
      />
      <section className="section bblog">
        <div className="container">
          {posts.loading && <Loader />}
          <ErrorNote error={posts.error} />
          {cats.length > 1 && (
            <div className="seg bblog__tabs" role="tablist" aria-label="Categories">
              {[['all', 'All'], ...cats.map((c) => [c, c])].map(([k, l]) => (
                <button key={k} role="tab" aria-selected={cat === k} className={cat === k ? 'is-on' : ''}
                  onClick={() => setParams(k === 'all' ? {} : { cat: k }, { replace: true, preventScrollReset: true })}>{l}</button>
              ))}
            </div>
          )}
          {posts.data && !first && (
            <div className="bblog__empty">
              <p className="eyebrow">Coming soon</p>
              <h2 className="etitle">New stories <em>on the way</em></h2>
              <p className="muted">We’re writing our first posts. In the meantime, see our latest work.</p>
              <Link to="/portfolio" className="ebtn ebtn--line">View the portfolio <IconArrow width={16} height={16} /></Link>
            </div>
          )}
          {first && <PostCard p={first} big />}
          {rest.length > 0 && <div className="bpost-grid">{rest.map((p, i) => <PostCard key={p.slug} p={p} i={i} />)}</div>}
        </div>
      </section>
    </>
  );
}

export function Post() {
  const { slug } = useParams();
  const post = useApi(`/blog/${encodeURIComponent(slug)}`, [slug]);
  const all = useApi('/blog');
  const p = post.data;
  useTitle(p?.title || 'Blog');
  useReveal(`${p?.slug}-${all.data?.length}`);
  const [copied, setCopied] = useState(false);
  const mounted = useMounted(); // the page address is only known in the browser: fill share links in after mount

  if (post.loading && !p) return <div className="section"><div className="container"><Loader /></div></div>;
  if (post.error?.status === 404 || (!post.loading && !p && !post.error)) return <NotFound />;
  if (post.error) return <div className="section"><div className="container"><ErrorNote error={post.error} /></div></div>;

  const url = mounted ? window.location.href : '';
  const related = (all.data || []).filter((x) => x.slug !== p.slug)
    .sort((a, b) => (b.category === p.category) - (a.category === p.category)).slice(0, 3);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };

  return (
    <>
      <article className="bpost">
        <header className={`bpost__hero ${p.cover ? 'bpost__hero--img' : ''}`}>
          {p.cover && <img src={p.cover} alt="" referrerPolicy="no-referrer" />}
          <div className="container bpost__hero-copy">
            <nav className="bpost__crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/blog">Blog</Link>{p.category && <><span>/</span><span>{p.category}</span></>}</nav>
            <h1>{p.title}</h1>
            <p className="bpost__meta">{p.author && <>By {p.author} · </>}{fmtDate(p.date)} · {readingTime(p.body)} min read</p>
          </div>
        </header>

        <div className="container bpost__layout">
          <div className="bpost__body">
            {p.excerpt && <p className="bpost__lead">{p.excerpt}</p>}
            <Markdown text={p.body} />
            {p.tags?.length > 0 && <p className="bpost__tags">{p.tags.map((t) => <span key={t}>#{t}</span>)}</p>}
          </div>
          <aside className="bpost__side">
            <div className="bpost__card">
              <p className="eyebrow">Share this story</p>
              <div className="bpost__share">
                <a href={`https://wa.me/?text=${encodeURIComponent(`${p.title} — ${url}`)}`} target="_blank" rel="noreferrer" aria-label="Share on WhatsApp"><IconWhatsApp width={18} height={18} /></a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer" aria-label="Share on Facebook">f</a>
                <button type="button" onClick={copy} aria-label="Copy link">{copied ? '✓' : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
                )}</button>
              </div>
              {copied && <small className="muted">Link copied</small>}
            </div>
            <div className="bpost__card bpost__card--cta">
              <h3>Planning your wedding?</h3>
              <p className="muted">Share your date and plans with {SITE.name}. We’ll check availability and send package options.</p>
              <Link className="ebtn ebtn--dark" to="/contact">Check your date <IconArrow width={16} height={16} /></Link>
            </div>
          </aside>
        </div>
      </article>

      {related.length > 0 && (
        <section className="section bpost-related">
          <div className="container">
            <div className="ehead" data-reveal>
              <div><p className="eyebrow">Keep reading</p><h2 className="etitle">More from the <em>journal</em></h2></div>
              <Link to="/blog" className="elink">All posts <IconArrow width={14} height={14} /></Link>
            </div>
            <div className="bpost-grid">{related.map((r, i) => <PostCard key={r.slug} p={r} i={i} />)}</div>
          </div>
        </section>
      )}
    </>
  );
}

/** "From the journal" strip for the Home page — hidden until there is at least one published post. */
export function LatestPosts() {
  const posts = useApi('/blog');
  const list = (posts.data || []).slice(0, 3);
  useReveal(list.length); // cards arrive after the page's own reveal pass
  if (!list.length) return null;
  return (
    <section className="esec blatest">
      <div className="container">
        <div className="ehead" data-reveal>
          <div><p className="eyebrow">From the journal</p><h2 className="etitle">Tips &amp; <em>stories</em></h2></div>
          <Link to="/blog" className="elink">All posts <IconArrow width={14} height={14} /></Link>
        </div>
        <div className="bpost-grid">{list.map((p, i) => <PostCard key={p.slug} p={p} i={i} />)}</div>
      </div>
    </section>
  );
}
