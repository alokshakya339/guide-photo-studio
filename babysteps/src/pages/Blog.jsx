import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Icon, WhatsAppIcon } from '../Icons.jsx';
import { BLOG, BLOG_CATEGORIES, STUDIO } from '../data.js';
import { Label, PageHero, usePage, useSeo, useReveal } from '../lib.jsx';
import { HeartDivider } from '../Decor.jsx';
import { Markdown, readingTime } from '../markdown.jsx';
import { asset } from '../api.js';
import NotFound from './NotFound.jsx';

const img = (s) => (String(s || '').startsWith('/uploads/') ? asset(s) : s);
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
/** Published posts, newest first. */
export const publishedPosts = () => BLOG.filter((p) => p.published !== false && p.slug && p.title).sort((a, b) => String(b.date).localeCompare(String(a.date)));

export function PostCard({ p, big = false, i = 0 }) {
  return (
    <Link to={`/blog/${p.slug}`} className={`post-card ${big ? 'big' : ''}`} data-reveal style={{ '--d': `${(i % 3) * 90}ms` }}>
      <span className="post-card-img">{p.cover && <img src={img(p.cover)} alt="" loading="lazy" referrerPolicy="no-referrer" />}<span className="post-cat">{p.category}</span></span>
      <span className="post-card-body">
        <span className="post-meta">{fmtDate(p.date)} · {readingTime(p.body)} min read</span>
        <span className="post-title">{p.title}</span>
        {p.excerpt && <span className="post-excerpt">{p.excerpt}</span>}
        <span className="post-more">Read the story <Icon name="arrow" size={16} /></span>
      </span>
    </Link>
  );
}

export function Blog() {
  useSeo('blog');
  useReveal();
  const [params, setParams] = useSearchParams();
  const cat = params.get('cat') || 'all';
  const posts = publishedPosts();
  const cats = BLOG_CATEGORIES.filter((c) => posts.some((p) => p.category === c));
  const shown = cat === 'all' ? posts : posts.filter((p) => p.category === cat);
  const [first, ...rest] = shown;

  return (
    <>
      <PageHero
        crumb={[[null, 'Blog']]}
        title={<>The BabySteps <em>journal</em></>}
        intro="Helpful guides, inspiration and studio stories to help you prepare for your session and enjoy every little step of early parenthood."
      />
      <section className="section blog">
        <div className="wrap">
          {cats.length > 1 && (
            <div className="feat-tabs blog-tabs" role="tablist" aria-label="Categories">
              {[['all', 'All'], ...cats.map((c) => [c, c])].map(([k, l]) => (
                <button key={k} role="tab" aria-selected={cat === k} className={cat === k ? 'on' : ''}
                  onClick={() => setParams(k === 'all' ? {} : { cat: k }, { replace: true, preventScrollReset: true })}>{l}</button>
              ))}
            </div>
          )}
          {!first ? (
            <div className="cg-empty"><p className="bh-script">New stories coming soon</p><p className="muted">Check back shortly — we're writing our next post.</p></div>
          ) : (
            <>
              <PostCard p={first} big />
              {rest.length > 0 && <div className="post-grid">{rest.map((p, i) => <PostCard key={p.slug} p={p} i={i} />)}</div>}
            </>
          )}
        </div>
      </section>
    </>
  );
}

export function Post() {
  const { slug } = useParams();
  const posts = publishedPosts();
  const p = posts.find((x) => x.slug === slug);
  usePage(p?.title || 'Not found', p?.excerpt);
  useReveal();
  const [copied, setCopied] = useState(false);
  if (!p) return <NotFound />;

  const url = typeof window !== 'undefined' ? window.location.href : '';
  const related = posts.filter((x) => x.slug !== p.slug).sort((a, b) => (b.category === p.category) - (a.category === p.category)).slice(0, 3);
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ } };

  return (
    <>
      <article className="post">
        <header className="post-hero">
          {p.cover && <img src={img(p.cover)} alt="" referrerPolicy="no-referrer" />}
          <div className="wrap post-hero-copy">
            <nav className="crumbs light" aria-label="Breadcrumb"><Link to="/">Home</Link><Link to="/blog">Blog</Link><span>{p.category}</span></nav>
            <h1>{p.title}</h1>
            <p className="post-hero-meta">{p.author && <>By {p.author} · </>}{fmtDate(p.date)} · {readingTime(p.body)} min read</p>
          </div>
        </header>

        <div className="wrap post-layout">
          <div className="post-body">
            {p.excerpt && <p className="post-lead">{p.excerpt}</p>}
            <HeartDivider />
            <Markdown text={p.body} resolveImage={img} />
            {p.tags?.length > 0 && <p className="post-tags">{p.tags.map((t) => <span key={t}>#{t}</span>)}</p>}
          </div>
          <aside className="post-side">
            <div className="post-side-card">
              <Label>Share this story</Label>
              <div className="post-share">
                <a href={`https://wa.me/?text=${encodeURIComponent(`${p.title} — ${url}`)}`} target="_blank" rel="noreferrer" aria-label="Share on WhatsApp"><WhatsAppIcon size={18} /></a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer" aria-label="Share on Facebook">f</a>
                <button onClick={copy} aria-label="Copy link">{copied ? '✓' : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7" /></svg>
                )}</button>
              </div>
              {copied && <small>Link copied</small>}
            </div>
            <div className="post-side-card cta">
              <p className="bh-script">Ready for your session?</p>
              <p className="muted">Reserve your date with {STUDIO.name} — we reply within 24 hours.</p>
              <Link className="btn btn-dark btn-block" to="/contact#book">Book a session</Link>
            </div>
          </aside>
        </div>
      </article>

      {related.length > 0 && (
        <section className="section post-related">
          <div className="wrap">
            <div className="center-head" data-reveal><Label>Keep reading</Label><h2 className="h2">More from the <em>journal</em></h2></div>
            <div className="post-grid">{related.map((r, i) => <PostCard key={r.slug} p={r} i={i} />)}</div>
          </div>
        </section>
      )}
    </>
  );
}

/** "From the blog" strip for the home page. */
export function LatestPosts() {
  const posts = publishedPosts().slice(0, 3);
  if (!posts.length) return null;
  return (
    <section className="section latest-posts">
      <div className="wrap">
        <div className="head-row" data-reveal>
          <div><Label>From the blog</Label><h2 className="h2">Tips & stories <em>for parents</em></h2></div>
          <Link className="btn-text" to="/blog">All articles <Icon name="arrow" size={16} /></Link>
        </div>
        <div className="post-grid">{posts.map((p, i) => <PostCard key={p.slug} p={p} i={i} />)}</div>
      </div>
    </section>
  );
}
