/**
 * SEO for the public website (the React app is a single page, so the server adds the right <head> per URL):
 *   GET /robots.txt           crawl rules + sitemap location
 *   GET /sitemap.xml          every public page + portfolio collections, with their photos (image sitemap)
 *   GET /site.webmanifest     app name / icons / colours
 *   every other page          index.html with that page's <title>, description, canonical URL, Open Graph /
 *                             Twitter tags, robots rules and JSON-LD structured data; unknown URLs get a real 404.
 *
 * The public address comes from SITE_URL (e.g. https://guidephotostudio.com); without it, the request's own host.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { Category, Faq, Setting } from './models/index.js';
import { DEFAULT_SITE } from './cms/defaults.js';

const LIVE = { published: { $ne: false } };
const BRAND = 'Guide Photo Studio';
const DEFAULT_IMAGE = '/images/wedding/w05.jpg';
// Maternity / baby / birthday moved to the sister studio; old links stay out of search results.
const MOVED = new Set(['maternity', 'baby', 'birthday']);

/** Public pages: title, description, sitemap priority / change frequency, share image. */
const PAGES = {
  '/': {
    title: `${BRAND} | Cinematic Wedding Photography in Noida`, full: true,
    description: 'Cinematic wedding photography & films, pre-wedding and portrait shoots in Noida, Delhi NCR and destinations — a family studio, four generations strong.',
    priority: '1.0', changefreq: 'weekly',
  },
  '/portfolio': { title: 'Wedding & Pre-Wedding Photography Portfolio', description: 'Real weddings, pre-wedding stories and portraits by Guide Photo Studio, photographed in Noida, across Delhi NCR and at destination weddings.', priority: '0.9', changefreq: 'weekly', image: '/images/wedding/w13.jpg' },
  '/films': { title: 'Wedding Films & Cinematography', description: 'Cinematic wedding films by Guide Photo Studio: a 5–30 minute film of your day plus a teaser to share, shot by a team of two to three cinematographers.', priority: '0.8', changefreq: 'monthly' },
  '/services': { title: 'Wedding Photography Packages & Pricing', description: 'Wedding photography, wedding films, pre-wedding and portrait packages from Guide Photo Studio, Noida. Every celebration is different — pricing on request.', priority: '0.9', changefreq: 'monthly' },
  '/about': { title: 'Our Studio — Four Generations of Photography', description: 'Guide Photo Studio is a family photography studio in Arun Vihar, Sector 37, Noida — four generations of photographers since the 1940s.', priority: '0.7', changefreq: 'monthly', image: '/images/studio/s8.jpg' },
  '/contact': { title: 'Contact & Book a Shoot', description: 'Check your date and enquire about wedding photography, films, pre-wedding and portrait shoots with Guide Photo Studio, Noida. Call, WhatsApp or visit the studio.', priority: '0.8', changefreq: 'yearly' },
  '/gift-cards': { title: 'Photography Gift Cards', description: 'Give the gift of memories: a Guide Photo Studio gift card for an engagement, wedding or anniversary. Buy online, valid for 12 months on any shoot.', priority: '0.6', changefreq: 'monthly' },
  '/invites': { title: 'Digital Wedding Invitations', description: 'Animated wedding invitation websites by Guide Studio: your story, events with maps, RSVPs, blessings, music and photos — shared with one link on WhatsApp.', priority: '0.7', changefreq: 'monthly' },
  '/careers': { title: 'Careers — Join Our Photography Team', description: 'Work with Guide Photo Studio in Noida: photographers, cinematographers, editors and more. See open roles and apply online.', priority: '0.5', changefreq: 'monthly' },
  '/privacy': { title: 'Privacy Policy', description: 'How Guide Photo Studio collects, uses and protects your personal information and your photographs.', priority: '0.2', changefreq: 'yearly' },
};
/**
 * Old Wix-site addresses (still in Google) → the matching new page, with a permanent 301 so rankings carry over.
 * Keys are lower-case paths without a trailing slash.
 */
const BABYSTEPS = 'https://www.babystepsbyguide.com';
const REDIRECTS = {
  '/our-studio': '/about', '/about-8': '/about', '/about-us': '/about',
  '/contact-us': '/contact', '/gift-card': '/gift-cards', '/giftcard': '/gift-cards',
  '/wedding': '/portfolio/wedding', '/weddings': '/portfolio/wedding', '/copy-of-wedding': '/portfolio/wedding', '/copy-of-wedding-1': '/portfolio/wedding',
  '/wedding-films': '/films', '/films-1': '/films',
  '/copy-of-corporate-head-shots': '/portfolio/headshot', '/corporate-head-shots': '/portfolio/headshot', '/head-shots': '/portfolio/headshot',
  '/pre-wedding': '/portfolio/pre-wedding', '/prewedding': '/portfolio/pre-wedding',
  '/maternity': `${BABYSTEPS}/portfolio`, '/mater': `${BABYSTEPS}/portfolio`,
  '/gallry2': '/portfolio', '/album': '/services', '/printing': '/services', '/framing': '/services', '/photo-retouching': '/services',
  '/vhs-to': '/services', '/shop': '/services', '/copy-of-e-commerce-catalogues': '/services', '/copy-of-food-photography': '/services',
  '/s-projects-side-by-side': '/portfolio', '/general-5': '/', '/coming-soon-01': '/', '/blogs': '/', '/blog': '/', '/home': '/',
  '/portfolio-collections/my-portfolio': '/portfolio',
  '/portfolio-collections/my-portfolio/cultural-wedding-celebrations': '/portfolio/wedding',
  '/portfolio-collections/my-portfolio/elegant-wedding-moments': '/portfolio/wedding',
  '/portfolio-collections/my-portfolio/traditional-attire-showcases': '/portfolio/wedding',
  '/portfolio-collections/my-portfolio/romantic-outdoor-portraits': '/portfolio/pre-wedding',
  '/portfolio-collections/my-portfolio/elegant-indoor-portraits': '/portfolio/headshot',
  '/portfolio-collections/my-portfolio/joyful-event-photography': '/portfolio',
  // plural / alternative collection names
  '/portfolio/weddings': '/portfolio/wedding', '/portfolio/pre-weddings': '/portfolio/pre-wedding', '/portfolio/prewedding': '/portfolio/pre-wedding',
  '/portfolio/headshots': '/portfolio/headshot', '/portfolio/head-shots': '/portfolio/headshot',
};
/** Where an old / non-canonical URL should go (or null). Also folds UPPER-case and trailing slashes. */
function redirectFor(req) {
  const raw = req.path;
  const p = raw.toLowerCase().replace(/\/+$/, '') || '/';
  if (REDIRECTS[p]) return REDIRECTS[p];
  if (p.startsWith('/product-page/')) return '/services';
  if (p.startsWith('/portfolio-collections/')) return '/portfolio';
  if (p !== raw && !/^\/(invite|client|account|admin)\//.test(raw)) return p; // /About/ → /about
  return null;
}

/** App areas that must never be indexed (still served normally). */
const PRIVATE = [/^\/admin(\/|$)/, /^\/account(\/|$)/, /^\/client(\/|$)/];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const xml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const clip = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1).replace(/\s+\S*$/, '')}…` : t; };

/** https://domain (no trailing slash) — from SITE_URL, else the request. */
export function siteOrigin(req) {
  const env = String(process.env.SITE_URL || '').trim().replace(/\/$/, '');
  if (/^https?:\/\/[^/]+$/i.test(env) && !/your-domain/i.test(env)) return env;
  return `${req.protocol}://${req.get('host')}`;
}
const abs = (origin, u) => (!u ? '' : /^https?:\/\//i.test(u) ? u : `${origin}${u.startsWith('/') ? '' : '/'}${u}`);

async function siteSettings() {
  const doc = await Setting.findOne({ key: 'site' }).lean().catch(() => null);
  return { ...DEFAULT_SITE, ...(doc?.data || {}) };
}

/** schema.org description of the studio (shown by Google for brand / local searches). */
function businessJsonLd(origin, s) {
  const social = s.social || {};
  return {
    '@context': 'https://schema.org',
    '@type': ['ProfessionalService', 'LocalBusiness'],
    '@id': `${origin}/#studio`,
    name: BRAND,
    url: `${origin}/`,
    logo: `${origin}/images/brand/logo-square.png`,
    image: `${origin}${DEFAULT_IMAGE}`,
    description: PAGES['/'].description,
    telephone: s.phoneRaw || s.phone || '+919205128749',
    email: s.email || 'Guidestudio7@gmail.com',
    address: { '@type': 'PostalAddress', streetAddress: '2013, near AVCC Club, Arun Vihar, Sector 37', addressLocality: 'Noida', addressRegion: 'Uttar Pradesh', postalCode: '201301', addressCountry: 'IN' },
    areaServed: ['Noida', 'Delhi NCR', 'India'],
    hasMap: 'https://www.google.com/maps/search/?api=1&query=Guide%20Photo%20Studio%2C%20Arun%20Vihar%2C%20Sector%2037%2C%20Noida',
    priceRange: '₹₹₹',
    knowsAbout: ['Wedding photography', 'Wedding films', 'Pre-wedding shoots', 'Portrait photography', 'Corporate head shots'],
    foundingDate: '1940',
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '09:00', closes: '21:00' }],
    sameAs: [social.instagram, social.facebook, social.youtube].filter(Boolean),
  };
}

const websiteJsonLd = (origin) => ({
  '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${origin}/#website`, name: BRAND, alternateName: ['Guide Studio', 'Guide Photo Studio Noida'],
  url: `${origin}/`, inLanguage: 'en-IN', publisher: { '@id': `${origin}/#studio` },
});

/** What a URL should say about itself. Returns null for pages that don't exist (→ 404). */
async function pageMeta(req) {
  const p = req.path.replace(/\/+$/, '') || '/';
  const origin = siteOrigin(req);
  const base = { origin, canonical: `${origin}${p === '/' ? '/' : p}`, image: DEFAULT_IMAGE, type: 'website', index: true, jsonld: [] };

  if (PRIVATE.some((rx) => rx.test(p))) return { ...base, title: BRAND, full: true, description: PAGES['/'].description, index: false };
  if (PAGES[p]) {
    const meta = { ...base, ...PAGES[p] };
    if (p === '/services') {
      const faqs = await Faq.find().sort('order').limit(30).lean().catch(() => []);
      if (faqs.length) meta.jsonld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) });
    }
    if (p !== '/') meta.jsonld.push(breadcrumbs(origin, [[PAGES[p].title.split(' — ')[0], p]]));
    return meta;
  }
  const m = p.match(/^\/portfolio\/([a-z0-9-]+)$/);
  if (m) {
    if (MOVED.has(m[1])) return { ...base, title: 'This collection has moved to BabySteps', description: 'Maternity, newborn and baby shoots are now with our sister studio, BabySteps by Guide.', index: false };
    const c = await Category.findOne({ slug: m[1], ...LIVE }).lean().catch(() => null);
    if (!c) return null;
    const desc = c.description || c.tagline || `${c.title} photography by Guide Photo Studio, Noida.`;
    return {
      ...base,
      // "Weddings" → "Wedding Photography", "Head Shots" → "Head Shot Photography"
      title: `${c.title.replace(/s$/i, '')} Photography in Noida & Delhi NCR`,
      description: clip(`${desc} ${c.images?.length ? `${c.images.length} photos.` : ''}`, 160),
      image: c.cover || DEFAULT_IMAGE,
      jsonld: [
        breadcrumbs(origin, [['Portfolio', '/portfolio'], [c.title, p]]),
        { '@context': 'https://schema.org', '@type': 'ImageGallery', name: `${c.title} — ${BRAND}`, url: `${origin}${p}`, image: (c.images || []).slice(0, 12).map((i) => abs(origin, i.src)) },
      ],
    };
  }
  return null;
}

function breadcrumbs(origin, trail) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [['Home', '/'], ...trail].map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${origin}${url}` })),
  };
}

/**
 * Plain-HTML copy of the page for crawlers that don't run JavaScript (Bing, social previews, AI search): heading,
 * description, studio contact details and links to every public page. Visitors never see it.
 */
let navCache = { at: 0, cats: [] };
async function navCollections() {
  if (Date.now() - navCache.at < 60_000) return navCache.cats;
  const cats = await Category.find(LIVE).sort('order').select('slug title').lean().catch(() => []);
  navCache = { at: Date.now(), cats };
  return cats;
}
function noscript(meta, title) {
  const links = [
    ['/', 'Home'], ['/portfolio', 'Portfolio'], ...navCache.cats.map((c) => [`/portfolio/${c.slug}`, `${c.title} photography`]),
    ['/films', 'Wedding films'], ['/services', 'Packages & pricing'], ['/about', 'Our studio'], ['/contact', 'Contact & booking'],
    ['/gift-cards', 'Gift cards'], ['/invites', 'Digital wedding invitations'], ['/careers', 'Careers'],
  ];
  const parts = title.split(' | ');
  const heading = meta.full && parts.length > 1 ? parts[1] : parts[0]; // home: "Cinematic Wedding Photography in Noida"
  return `<noscript><h1>${esc(heading)}</h1><p>${esc(meta.description)}</p>`
    + '<p>Guide Photo Studio · 2013, near AVCC Club, Arun Vihar, Sector 37, Noida, Uttar Pradesh 201301 · +91 92051 28749</p>'
    + `<nav><ul>${links.map(([u, l]) => `<li><a href="${esc(meta.origin + u)}">${esc(l)}</a></li>`).join('')}</ul></nav></noscript>`;
}

/** index.html with this page's head tags swapped in. */
function renderHead(html, meta, settings) {
  const title = meta.full ? meta.title : `${meta.title} | ${BRAND}`;
  const img = abs(meta.origin, meta.image);
  const ld = [...(meta.index ? [businessJsonLd(meta.origin, settings)] : []), ...(meta.canonical === `${meta.origin}/` ? [websiteJsonLd(meta.origin)] : []), ...meta.jsonld];
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<meta name="robots" content="${meta.index ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'}" />`,
    meta.index && `<link rel="canonical" href="${esc(meta.canonical)}" />`,
    `<meta property="og:site_name" content="${BRAND}" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${esc(meta.canonical)}" />`,
    img && `<meta property="og:image" content="${esc(img)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    img && `<meta name="twitter:image" content="${esc(img)}" />`,
    ...ld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`),
  ].filter(Boolean).join('\n    ');
  return html
    .replace('<div id="root"></div>', `<div id="root"></div>\n    ${noscript(meta, title)}`)
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, '')
    .replace(/<meta\s+property="og:[^>]*>\s*/g, '')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '')
    .replace('</head>', `    ${tags}\n  </head>`);
}

export function seoRoutes(clientDist) {
  const router = Router();
  let cache = { at: 0, html: '' };
  const indexHtml = () => {
    const file = path.join(clientDist, 'index.html');
    const st = fs.statSync(file);
    if (st.mtimeMs !== cache.at) cache = { at: st.mtimeMs, html: fs.readFileSync(file, 'utf8') };
    return cache.html;
  };

  router.get('/robots.txt', (req, res) => {
    const origin = siteOrigin(req);
    res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send([
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /account',
      'Disallow: /client/',
      'Disallow: /api/',
      '',
      `Sitemap: ${origin}/sitemap.xml`,
      '',
    ].join('\n'));
  });

  router.get('/sitemap.xml', async (req, res, next) => {
    try {
      const origin = siteOrigin(req);
      const cats = await Category.find(LIVE).sort('order').lean();
      const latest = cats.reduce((d, c) => (c.updatedAt > d ? c.updatedAt : d), new Date(0));
      const day = (d) => new Date(d || Date.now()).toISOString().slice(0, 10);
      const url = (loc, { lastmod, changefreq, priority, images = [] }) => [
        '  <url>',
        `    <loc>${xml(loc)}</loc>`,
        lastmod && `    <lastmod>${lastmod}</lastmod>`,
        changefreq && `    <changefreq>${changefreq}</changefreq>`,
        priority && `    <priority>${priority}</priority>`,
        ...images.slice(0, 20).map((i) => `    <image:image><image:loc>${xml(abs(origin, i.src))}</image:loc>${i.title ? `<image:title>${xml(i.title)}</image:title>` : ''}</image:image>`),
        '  </url>',
      ].filter(Boolean).join('\n');
      const body = [
        ...Object.entries(PAGES).map(([p, m]) => url(`${origin}${p}`, {
          changefreq: m.changefreq, priority: m.priority,
          lastmod: p === '/' || p === '/portfolio' ? day(latest.getTime() ? latest : undefined) : undefined,
          images: p === '/portfolio' ? cats.map((c) => ({ src: c.cover, title: c.title })) : [],
        })),
        ...cats.map((c) => url(`${origin}/portfolio/${c.slug}`, {
          lastmod: day(c.updatedAt), changefreq: 'monthly', priority: '0.8',
          images: [{ src: c.cover, title: c.title }, ...(c.images || []).map((i) => ({ src: i.src, title: i.alt || c.title }))],
        })),
      ];
      res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body.join('\n')}\n</urlset>\n`,
      );
    } catch (e) { next(e); }
  });

  router.get('/site.webmanifest', (_req, res) => {
    res.type('application/manifest+json').set('Cache-Control', 'public, max-age=3600').send(JSON.stringify({
      id: '/', name: BRAND, short_name: 'Guide Studio', lang: 'en-IN', dir: 'ltr',
      description: PAGES['/'].description,
      start_url: '/?source=pwa', scope: '/', display: 'standalone', orientation: 'portrait',
      background_color: '#171411', theme_color: '#f7f3ec',
      categories: ['photo', 'lifestyle', 'business'],
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      shortcuts: [
        { name: 'Portfolio', url: '/portfolio', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        { name: 'Gift cards', url: '/gift-cards', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        { name: 'My account', url: '/account', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        { name: 'Book a shoot', url: '/contact', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      ],
    }));
  });

  // Browsers and Google ask for /favicon.ico at the site root.
  router.get('/favicon.ico', (_req, res) => res.set('Cache-Control', 'public, max-age=604800').sendFile(path.join(clientDist, 'favicon.ico')));

  /** Every page of the app: index.html with the right head; real 404 status for unknown URLs. */
  router.get(/^(?!\/api\/|\/uploads\/|\/assets\/).*/, async (req, res, next) => {
    try {
      const to = redirectFor(req);
      if (to) {
        const qs = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
        return res.redirect(301, /^https?:/.test(to) ? to : `${to}${qs}`);
      }
      const html = indexHtml();
      const [meta, settings] = await Promise.all([pageMeta(req), siteSettings(), navCollections()]);
      const page = meta || { origin: siteOrigin(req), canonical: '', title: 'Page not found', description: PAGES['/'].description, image: DEFAULT_IMAGE, type: 'website', index: false, jsonld: [] };
      res.status(meta ? 200 : 404).set('Cache-Control', 'no-cache').type('html').send(renderHead(html, page, settings));
    } catch (e) { next(e); }
  });

  return router;
}
