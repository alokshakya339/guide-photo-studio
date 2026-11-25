/**
 * Search, local "geo" and AI-search (GEO) support for the single-page site:
 *  - /robots.txt (welcomes Google, Bing and AI answer engines), /sitemap.xml, /llms.txt and /llms-full.txt,
 *    all generated from the live content
 *  - every HTML page gets its own keyword <title>, description, canonical URL, Open Graph / Twitter tags,
 *    geo meta tags and schema.org JSON-LD, injected server-side
 *  - a plain-HTML copy of each page's real content inside <noscript> — ChatGPT, Claude, Perplexity, Bing and
 *    social previews mostly do NOT run JavaScript, so without it they would see an empty page.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Setting } from './models.js';
import * as D from '../../src/data.js'; // the website's built-in defaults
import { SITE, AREAS, HOME_TITLE, HOME_DESC, SLOGAN, sessionSeo, pageSeo, studioSummary, studioHighlights, keyFaqs } from '../../src/seoMeta.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clipText = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t; };
const plain = (md) => String(md || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#>*_`]/g, ' ').replace(/^\s*-\s+/gm, '');
const num = (v) => Number(String(v || '').replace(/[^\d]/g, ''));

const OG_IMAGE = '/og-image.jpg';
const IMAGE_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

export const origin = (req) => (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
const abs = (o, src) => (!src ? '' : /^https?:\/\//.test(src) ? src : `${o}${src.startsWith('/') ? '' : '/'}${src}`);

/** Defaults merged with what the admin saved (short cache so edits show up quickly). */
let cache = { at: 0, data: null };
export async function content() {
  if (cache.data && Date.now() - cache.at < 60_000) return cache.data;
  let saved = {};
  try { saved = (await Setting.findOne({ key: 'babysteps' }).lean())?.data || {}; } catch { /* db not ready → defaults */ }
  const studio = { ...D.STUDIO, ...Object.fromEntries(Object.entries(saved.studio || {}).filter(([, v]) => v !== '' && v != null)) };
  const sessions = (saved.sessions?.length ? saved.sessions : D.JOURNEY).filter((s) => s.title && (s.slug || s.title));
  const blog = (saved.blog?.length ? saved.blog : D.BLOG).filter((p) => p.title && p.slug && p.published !== false);
  const images = { ...D.IMG, ...(saved.images || {}) };
  const faqs = (saved.faqs?.length ? saved.faqs : D.FAQS).filter((f) => f.q && f.a);
  const packages = Object.fromEntries(Object.entries(D.PACKAGES).map(([k, v]) => [k, { ...v, ...(saved.packages?.[k] || {}) }]));
  const gallery = (saved.gallery?.length ? saved.gallery : D.GALLERY).filter((x) => x.src);
  cache = { at: Date.now(), data: { studio, sessions, blog, images, faqs, packages, gallery, raw: saved } };
  return cache.data;
}
export const clearSeoCache = () => { cache = { at: 0, data: null }; };

/* ---------- Local geo facts (address, map pin, hours) ---------- */

function geoFacts(st) {
  const m = String(process.env.STUDIO_GEO || st.geo || '').match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  const lat = m ? Number(m[1]) : null;
  const lng = m ? Number(m[2]) : null;
  const hm = String(process.env.STUDIO_HOURS || st.hours || 'Mo-Sa 10:00-18:00').match(/^([A-Za-z]{2})-([A-Za-z]{2}) (\d\d:\d\d)-(\d\d:\d\d)$/);
  const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const FULL = { Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday' };
  const days = hm ? DAYS.slice(DAYS.indexOf(hm[1]), DAYS.indexOf(hm[2]) + 1).map((d) => FULL[d]) : [];
  const street = String(st.address || '').split(',').slice(0, 2).join(',').trim();
  const mapUrl = lat != null ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : st.mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(st.mapQuery)}` : '';
  return {
    lat, lng, days, opens: hm?.[3], closes: hm?.[4], street, mapUrl,
    postalCode: String(st.postalCode || '').trim(),
    hoursText: days.length ? `${days[0]}–${days[days.length - 1]}, ${hm[3]}–${hm[4]} (by appointment)` : '',
  };
}

/* ---------- Per-page meta ---------- */

/** Title / description / image for a path. */
async function metaFor(p) {
  const c = await content();
  const parts = p.replace(/\/+$/, '').split('/').filter(Boolean);
  // 1200×630 share image for the home page and anything without its own photo (the size social previews expect).
  const base = { title: HOME_TITLE, description: HOME_DESC, image: OG_IMAGE, imageAlt: `${SITE} — newborn, maternity & cake smash photoshoots in Noida`, type: 'website' };
  const page = (title, description, image, imageAlt) => ({ ...base, title: `${title} · ${SITE}`, description: description || base.description, image: image || base.image, imageAlt: image ? (imageAlt || `${title} — ${SITE}, Noida`) : base.imageAlt });

  if (!parts.length) return base;
  const [a, b] = parts;
  if (a === 'portfolio' && b) {
    const s = c.sessions.find((x) => x.slug === b);
    if (!s) return { ...page('Page not found'), noindex: true };
    const m = sessionSeo(s);
    return { ...page(m.title, m.description, s.img, s.alt), session: s };
  }
  if (a === 'blog' && b) {
    const post = c.blog.find((x) => x.slug === b);
    return post
      ? { ...page(post.title, clipText(post.excerpt || plain(post.body)), post.cover, post.title), type: 'article', published: post.date, post }
      : { ...page('Page not found'), noindex: true };
  }
  const imgFor = { portfolio: c.images.maternity, videos: c.images.newborn, services: c.images.cake, about: c.images.family, contact: c.images.newborn, blog: c.images.milestone, privacy: c.images.family, 'gift-cards': c.images.birthday };
  const m = pageSeo(a, { sessions: c.sessions, address: c.studio.address, phone: c.studio.phone });
  if (m) return { ...page(m.title, m.description, imgFor[a]), key: a };
  if (a === 'unsubscribe') return { ...page('Email preferences', 'Manage your BabySteps emails.'), noindex: true };
  if (a === 'client' || a === 'admin') return { ...page(a === 'admin' ? 'Admin' : 'Client Gallery', 'Private area.'), noindex: true };
  return { ...page('Page not found'), noindex: true };
}

/* ---------- Plain-HTML page content for crawlers that don't run JavaScript ---------- */

/** Tiny Markdown → HTML for blog bodies (## headings, lists, quotes, bold/italic, links). */
function mdHtml(md, o) {
  const inline = (t) => esc(t)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, l, u) => `<a href="${esc(abs(o, u.replace(/&amp;/g, '&')))}">${l}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  const out = [];
  let list = null;
  const flush = () => { if (list) { out.push(`<${list.tag}>${list.items.map((i) => `<li>${i}</li>`).join('')}</${list.tag}>`); list = null; } };
  for (const raw of String(md || '').split('\n')) {
    const line = raw.trim();
    let m;
    if (!line) { flush(); continue; }
    if ((m = line.match(/^(#{2,4})\s+(.*)/))) { flush(); out.push(`<h${m[1].length + 1}>${inline(m[2])}</h${m[1].length + 1}>`); continue; }
    if ((m = line.match(/^[-*]\s+(.*)/)) || (m = line.match(/^\d+\.\s+(.*)/))) {
      const tag = /^\d/.test(line) ? 'ol' : 'ul';
      if (list?.tag !== tag) { flush(); list = { tag, items: [] }; }
      list.items.push(inline(m[1])); continue;
    }
    flush();
    if ((m = line.match(/^>\s?(.*)/))) out.push(`<blockquote>${inline(m[1])}</blockquote>`);
    else out.push(`<p>${inline(line)}</p>`);
  }
  flush();
  return out.join('');
}

function napHtml(c, g) {
  const st = c.studio;
  return `<address><strong>${esc(SITE)}</strong><br>${esc(st.address)}${g.postalCode ? ` – ${esc(g.postalCode)}` : ''}, India<br>`
    + `Phone / WhatsApp: <a href="tel:${esc(String(st.phone || '').replace(/\s+/g, ''))}">${esc(st.phone)}</a> · Email: ${esc(st.email)}`
    + `${g.hoursText ? `<br>Hours: ${esc(g.hoursText)}` : ''}${g.mapUrl ? `<br><a href="${esc(g.mapUrl)}">Directions on Google Maps</a>` : ''}`
    + `<br>Serving ${esc(AREAS.join(', '))}.</address>`;
}

const faqHtml = (faqs) => `<h2>Frequently asked questions</h2><dl>${faqs.map((f) => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join('')}</dl>`;

function sessionsHtml(o, c) {
  return `<h2>Photoshoots we offer in Noida</h2><ul>${c.sessions.map((s) => {
    const m = sessionSeo(s);
    return `<li><a href="${esc(`${o}/portfolio/${s.slug}`)}">${esc(m.title)}</a> — ${esc(s.text)}${s.when ? ` Best time: ${esc(s.when)}.` : ''}${s.from ? ` From ₹${esc(s.from)}.` : ''}</li>`;
  }).join('')}</ul>`;
}

function packagesHtml(c, only) {
  return Object.entries(c.packages).filter(([k]) => !only || only.includes(k)).map(([, p]) => (
    `<h2>${esc(p.label)} photoshoot packages</h2>${p.blurb ? `<p>${esc(p.blurb)}</p>` : ''}<ul>${(p.plans || []).map((pl) => `<li><strong>${esc(pl.name)} — ₹${esc(pl.price)}</strong>: ${esc((pl.features || []).join(', '))}</li>`).join('')}</ul>`
    + (p.addons?.length ? `<p>Add-ons: ${esc(p.addons.map(([n, v]) => `${n} (${v})`).join('; '))}</p>` : '')
  )).join('');
}

const ABOUT = 'BabySteps Guide Studio is run by Tanya & Sarthak Chopra, a husband-wife photography duo specialising in maternity, newborn and baby photography in Noida. The studio is powered by Guide Photo Studio, trusted by families for generations. Tanya\'s warm, caring approach keeps mothers and little ones calm and comfortable, while Sarthak brings years of portrait photography and visual storytelling.';

async function noscriptContent(o, pathname, m) {
  const c = await content();
  const g = geoFacts(c.studio);
  const h1 = m.title.split(' · ')[0];
  const nav = [
    ['/', 'Home'], ['/portfolio', 'Portfolio'], ['/videos', 'Videos'], ['/services', 'Packages & prices'], ['/about', 'About us'], ['/contact', 'Book a photoshoot'], ['/blog', 'Blog'], ['/gift-cards', 'Gift cards'],
    ...c.sessions.map((s) => [`/portfolio/${s.slug}`, sessionSeo(s).title]),
    ...c.blog.map((p) => [`/blog/${p.slug}`, p.title]),
  ];
  let body = '';
  if (m.noindex) body = '';
  else if (m.post) {
    const p = m.post;
    body = `<article><p>${p.date ? `Published ${esc(p.date)}` : ''}${p.author ? ` by ${esc(p.author)}` : ''}</p>${mdHtml(p.body, o)}</article>`;
  } else if (m.session) {
    const s = m.session;
    body = `<p>${esc(s.text)}</p><ul>${s.when ? `<li>Best time: ${esc(s.when)}</li>` : ''}${s.from ? `<li>Packages from ₹${esc(s.from)}</li>` : ''}${(s.perks || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
      + packagesHtml(c, s.pkg ? [s.pkg] : null);
  } else if (m.key === 'services') body = sessionsHtml(o, c) + packagesHtml(c) + faqHtml(c.faqs);
  else if (m.key === 'about') body = `<p>${esc(ABOUT)}</p>`;
  else if (m.key === 'contact') body = `<p>Send an enquiry or WhatsApp us — we reply within 24 hours.</p>${faqHtml(c.faqs.slice(0, 4))}`;
  else if (m.key === 'portfolio') body = sessionsHtml(o, c);
  else if (m.key === 'blog') body = `<ul>${c.blog.map((p) => `<li><a href="${esc(`${o}/blog/${p.slug}`)}">${esc(p.title)}</a> — ${esc(p.excerpt || '')}</li>`).join('')}</ul>`;
  else if (pathname === '/') body = `<p>${esc(studioSummary(c.sessions))}</p><ul>${studioHighlights(c.sessions).map(([t, d]) => `<li><strong>${esc(t)}</strong>: ${esc(d)}</li>`).join('')}</ul>${sessionsHtml(o, c)}${faqHtml([...keyFaqs(c.sessions, c.studio), ...c.faqs])}`;

  return `<noscript><main><h1>${esc(h1)}</h1><p>${esc(m.description)}</p>${body}${m.noindex ? '' : napHtml(c, g)}`
    + `<nav><ul>${nav.map(([u, l]) => `<li><a href="${esc(o + u)}">${esc(l)}</a></li>`).join('')}</ul></nav></main></noscript>`;
}

/** Inject per-page tags into the built index.html. */
let shell = { mtime: 0, html: '' };
function readShell(dist) {
  const file = path.join(dist, 'index.html');
  const { mtimeMs } = fs.statSync(file);
  if (mtimeMs !== shell.mtime) shell = { mtime: mtimeMs, html: fs.readFileSync(file, 'utf8') };
  return shell.html;
}

/**
 * Speed: put the admin-saved content straight into the page (the app then renders immediately instead of
 * waiting for /api/babysteps/content), and on the home page preload the first hero photo.
 */
async function inlineContent(pathname) {
  const c = await content();
  const json = JSON.stringify(c.raw || {}).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, '');
  const hero = pathname === '/' && c.images?.newborn;
  return [
    hero ? `<link rel="preload" as="image" href="${esc(hero)}" fetchpriority="high" />` : '',
    `<script>window.__BS_CONTENT__=${json};</script>`,
  ].filter(Boolean).join('\n    ');
}

/* ---------- Structured data (schema.org JSON-LD) ---------- */

const CAT_NAME = { newborn: 'Newborn', maternity: 'Maternity', milestone: 'Baby milestone', cake: 'Cake smash', birthday: 'Pre-birthday', family: 'Family' };

/**
 * One linked @graph per page (every entity has an @id, so Google and AI engines see one connected studio):
 *   WebSite · LocalBusiness (address + PIN, map pin, service area, hours, full price list) · founders ·
 *   WebPage (breadcrumb, main image, main entity) · BreadcrumbList · and per page: Service + offers (session pages),
 *   FAQPage (only where FAQs are visible: services, contact), ItemList (portfolio), Blog / BlogPosting,
 *   ImageGallery (session & portfolio photos).
 * No Review / AggregateRating: Google only accepts ratings collected by a third party (e.g. the Google Business
 * Profile) — never self-written ones — and the site has no real star ratings to mark up.
 * Overrides: STUDIO_HOURS ("Mo-Sa 10:00-18:00"), STUDIO_GEO ("lat,lng"), STUDIO_SAMEAS (extra profile URLs, comma
 * separated — add the Google Business Profile / Facebook / YouTube links) — otherwise /admin → Studio details.
 */
async function structuredData(o, pathname, m) {
  const c = await content();
  const st = c.studio;
  const g = geoFacts(st);
  const id = (frag) => `${o}/#${frag}`;
  const studioRef = { '@id': id('studio') };
  const placeRef = { '@id': id('place') };
  const url = `${o}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}`;
  const phone = String(st.phone || '').replace(/\s+/g, '');
  const owned = (src) => !/unsplash\.com|pexels\.com/.test(String(src)); // stock photos are never credited to the studio
  const imageObj = (src, caption, extra = {}) => {
    const u = abs(o, src);
    if (!u) return undefined;
    return {
      '@type': 'ImageObject', url: u, contentUrl: u, ...(caption ? { caption, name: caption } : {}), contentLocation: placeRef,
      ...(owned(src) ? { creator: studioRef, creditText: SITE, copyrightNotice: `© ${SITE}` } : {}), ...extra,
    };
  };

  const prices = c.sessions.map((x) => num(x.from)).filter(Boolean);
  const planPrices = Object.values(c.packages).flatMap((p) => (p.plans || []).map((pl) => num(pl.price))).filter(Boolean);
  const all = [...prices, ...planPrices];
  const founders = [
    { '@type': 'Person', '@id': id('tanya'), name: 'Tanya Chopra', jobTitle: 'Co-founder & Photographer', worksFor: studioRef, spouse: { '@id': id('sarthak') }, knowsAbout: ['Newborn photography', 'Maternity photography', 'Safe newborn posing'] },
    { '@type': 'Person', '@id': id('sarthak'), name: 'Sarthak Chopra', jobTitle: 'Co-founder & Photographer', worksFor: studioRef, spouse: { '@id': id('tanya') }, knowsAbout: ['Portrait photography', 'Family photography', 'Visual storytelling'] },
  ];
  const areaServed = [
    ...AREAS.filter((a) => a !== 'Delhi NCR').map((name) => ({ '@type': 'City', name, containedInPlace: { '@type': 'AdministrativeArea', name: 'Delhi NCR' } })),
    ...(g.lat != null ? [{ '@type': 'GeoCircle', geoMidpoint: { '@type': 'GeoCoordinates', latitude: g.lat, longitude: g.lng }, geoRadius: 40000 }] : []),
  ];
  const address = {
    '@type': 'PostalAddress', streetAddress: g.street, addressLocality: 'Noida', addressRegion: 'Uttar Pradesh',
    ...(g.postalCode ? { postalCode: g.postalCode } : {}), addressCountry: 'IN',
  };
  const geo = g.lat != null ? { '@type': 'GeoCoordinates', latitude: g.lat, longitude: g.lng } : undefined;
  const hours = g.days.length ? [{ '@type': 'OpeningHoursSpecification', dayOfWeek: g.days.map((d) => `https://schema.org/${d}`), opens: g.opens, closes: g.closes }] : undefined;
  const sessionForPkg = (k) => c.sessions.filter((x) => x.pkg === k).map((x) => sessionSeo(x).title);
  const planOffer = (pl, pkgLabel, extra = {}) => ({
    '@type': 'Offer', name: `${pkgLabel} photoshoot — ${pl.name}`, price: num(pl.price), priceCurrency: 'INR',
    availability: 'https://schema.org/InStock', url: `${o}/services`, seller: studioRef, areaServed: { '@type': 'City', name: 'Noida' },
    ...(pl.features?.length ? { description: pl.features.join(', ') } : {}), ...extra,
  });

  const biz = {
    '@type': ['LocalBusiness', 'ProfessionalService'],
    '@id': id('studio'),
    name: SITE,
    legalName: st.name || SITE,
    alternateName: ['BabySteps by Guide', 'BabySteps by Guide Studio', 'babystepsbyguide', 'BabySteps Noida', 'BabySteps Studio Noida'],
    description: studioSummary(c.sessions),
    disambiguatingDescription: 'BabySteps by Guide (babystepsbyguide.com, Instagram @babystepsbyguide) is a newborn, maternity and baby photography studio in Sector 37, Noida, run by husband-wife photographers Tanya & Sarthak Chopra. It is not related to the video game "Baby Steps".',
    slogan: SLOGAN,
    url: `${o}/`,
    logo: { '@type': 'ImageObject', '@id': id('logo'), url: `${o}/icon-512.png`, contentUrl: `${o}/icon-512.png`, width: 512, height: 512, caption: SITE },
    image: [c.images.newborn, c.images.maternity, c.images.cake, c.images.family].map((src) => abs(o, src)).filter(Boolean),
    telephone: phone,
    email: st.email,
    address,
    geo,
    location: placeRef,
    hasMap: g.mapUrl || undefined,
    areaServed,
    priceRange: all.length ? `₹${Math.min(...all).toLocaleString('en-IN')} – ₹${Math.max(...all).toLocaleString('en-IN')}` : undefined,
    currenciesAccepted: 'INR',
    paymentAccepted: 'Cash, UPI, Credit Card, Debit Card, Net Banking',
    openingHoursSpecification: hours,
    contactPoint: [{ '@type': 'ContactPoint', contactType: 'reservations', telephone: phone, email: st.email, url: `${o}/contact`, availableLanguage: ['English', 'Hindi'], areaServed: 'IN', hoursAvailable: hours }],
    founder: founders.map((f) => ({ '@id': f['@id'] })),
    employee: founders.map((f) => ({ '@id': f['@id'] })),
    sameAs: [st.instagram, process.env.STUDIO_SAMEAS].filter(Boolean).flatMap((x) => String(x).split(',')).map((x) => x.trim()).filter(Boolean),
    parentOrganization: { '@type': 'Organization', '@id': 'https://www.guidephotostudio.com/#organization', name: st.parent || 'Guide Photo Studio', url: 'https://www.guidephotostudio.com/' },
    knowsAbout: ['Newborn photography', 'Maternity photography', 'Baby milestone photography', 'Cake smash photography', 'Pre-birthday photoshoots', 'Family photography', 'Safe newborn posing'],
    knowsLanguage: ['en', 'hi'],
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'Temperature-controlled studio', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Maternity gowns provided', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Newborn props and wraps provided', value: true },
    ],
    makesOffer: c.sessions.map((x) => ({ '@id': `${o}/portfolio/${x.slug}#service` })),
    hasOfferCatalog: {
      '@type': 'OfferCatalog', '@id': id('catalog'), name: 'Photoshoot packages in Noida',
      itemListElement: Object.entries(c.packages).map(([k, p]) => ({
        '@type': 'OfferCatalog', name: `${p.label} photoshoot packages`, description: p.blurb,
        itemListElement: (p.plans || []).filter((pl) => num(pl.price)).map((pl) => planOffer(pl, p.label, {
          itemOffered: { '@type': 'Service', name: `${p.label} photoshoot — ${pl.name}`, serviceType: sessionForPkg(k).join(', ') || `${p.label} photography`, provider: studioRef },
        })),
      })),
    },
  };
  // The studio as a place on the map (what "near me" and map answers anchor to).
  const place = { '@type': 'Place', '@id': id('place'), name: `${SITE}, Sector 37, Noida`, address, geo, hasMap: g.mapUrl || undefined };

  const graph = [
    { '@type': 'WebSite', '@id': id('website'), name: SITE, alternateName: ['BabySteps by Guide', 'BabySteps by Guide Studio', 'babystepsbyguide'], url: `${o}/`, description: HOME_DESC, publisher: studioRef, about: studioRef, inLanguage: 'en-IN' },
    biz, place, ...founders,
  ];

  // Page + breadcrumbs
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  const pageName = m.title.split(' · ')[0];
  let mainEntity = studioRef;
  if (m.session) mainEntity = { '@id': `${url}#service` };
  else if (m.type === 'article') mainEntity = { '@id': `${url}#article` };
  else if (m.key === 'blog') mainEntity = { '@id': `${url}#blog` };
  else if (m.key === 'portfolio') mainEntity = { '@id': `${url}#list` };
  else if (m.key === 'services') mainEntity = { '@id': id('catalog') };
  if (!m.noindex) {
    const type = m.key === 'about' ? 'AboutPage' : m.key === 'contact' ? 'ContactPage' : m.key === 'portfolio' ? 'CollectionPage' : m.key === 'blog' ? 'CollectionPage' : 'WebPage';
    graph.push({
      '@type': type, '@id': `${url}#webpage`, url, name: m.title, headline: pageName, description: m.description,
      isPartOf: { '@id': id('website') }, about: studioRef, mainEntity, inLanguage: 'en-IN',
      primaryImageOfPage: imageObj(m.image, pageName), ...(parts.length ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
      ...(m.published ? { datePublished: m.published } : {}),
    });
  }
  if (parts.length && !m.noindex) {
    const crumbs = [{ name: 'Home', item: `${o}/` }];
    const label = { portfolio: 'Portfolio', videos: 'Videos', services: 'Packages & Prices', about: 'About Us', contact: 'Contact', blog: 'Blog', privacy: 'Privacy Policy', 'gift-cards': 'Gift Cards' };
    crumbs.push({ name: label[parts[0]] || parts[0], item: `${o}/${parts[0]}` });
    if (parts[1]) crumbs.push({ name: pageName, item: `${o}/${parts[0]}/${parts[1]}` });
    graph.push({ '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: crumbs.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, item: x.item })) });
  }

  // FAQs — only on the pages that actually show them (Google requires the Q&A to be visible on the page).
  if (!m.noindex && (m.key === 'services' || m.key === 'contact' || pathname === '/')) {
    const faqs = m.key === 'contact' ? c.faqs.slice(0, 4) : pathname === '/' ? [...keyFaqs(c.sessions, c.studio), ...c.faqs] : c.faqs;
    if (faqs.length) graph.push({ '@type': 'FAQPage', '@id': `${url}#faq`, isPartOf: { '@id': `${url}#webpage` }, mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  }

  // Session pages: the service, its packages and its photos.
  if (m.session) {
    const s = m.session;
    const pk = c.packages[s.pkg];
    const photos = c.gallery.filter((x) => x.cat === s.key).slice(0, 12);
    graph.push({
      '@type': 'Service', '@id': `${url}#service`, name: pageName, serviceType: `${s.title} photography`, category: 'Photography',
      description: `${s.text}${s.when ? ` Best time: ${s.when}.` : ''}`, provider: studioRef, areaServed, url,
      image: imageObj(s.img, `${pageName} — ${SITE}`),
      audience: { '@type': 'PeopleAudience', audienceType: s.key === 'maternity' ? 'Expecting parents' : 'Parents of babies and young children' },
      ...(s.perks?.length ? { additionalProperty: s.perks.map((x) => ({ '@type': 'PropertyValue', name: 'Included', value: x })) } : {}),
      ...(num(s.from) ? { offers: (pk?.plans?.length ? pk.plans : [{ name: s.title, price: s.from }]).filter((pl) => num(pl.price)).map((pl) => planOffer(pl, pk?.label || s.title)) } : {}),
    });
    if (photos.length) {
      graph.push({ '@type': 'ImageGallery', '@id': `${url}#gallery`, name: `${pageName} — sample photos`, isPartOf: { '@id': `${url}#webpage` }, about: { '@id': `${url}#service` }, image: photos.map((x) => imageObj(x.src, x.alt || `${CAT_NAME[x.cat] || 'Baby'} photoshoot in Noida`)) });
    }
  }

  // Portfolio: every session as a list, plus the photo gallery.
  if (m.key === 'portfolio') {
    graph.push({ '@type': 'ItemList', '@id': `${url}#list`, name: 'Photoshoots in Noida', numberOfItems: c.sessions.length, itemListElement: c.sessions.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: sessionSeo(x).title, url: `${o}/portfolio/${x.slug}` })) });
    graph.push({ '@type': 'ImageGallery', '@id': `${url}#gallery`, name: 'BabySteps portfolio', isPartOf: { '@id': `${url}#webpage` }, image: c.gallery.slice(0, 24).map((x) => imageObj(x.src, x.alt || `${CAT_NAME[x.cat] || 'Baby'} photoshoot in Noida`)) });
  }

  // Blog index and posts.
  const author = (p) => {
    const a = String(p?.author || '');
    const t = /tanya/i.test(a); const s = /sarthak/i.test(a);
    const ref = (k, n) => ({ '@type': 'Person', '@id': id(k), name: n, url: `${o}/about` });
    return t && !s ? ref('tanya', 'Tanya Chopra') : s && !t ? ref('sarthak', 'Sarthak Chopra') : [ref('tanya', 'Tanya Chopra'), ref('sarthak', 'Sarthak Chopra')];
  };
  if (m.key === 'blog') {
    graph.push({
      '@type': 'Blog', '@id': `${url}#blog`, name: 'The BabySteps journal', description: m.description, url, publisher: studioRef, inLanguage: 'en-IN',
      blogPost: c.blog.map((p) => ({ '@type': 'BlogPosting', '@id': `${o}/blog/${p.slug}#article`, headline: p.title, url: `${o}/blog/${p.slug}`, datePublished: p.date || undefined, image: abs(o, p.cover) || undefined, author: author(p) })),
    });
  }
  if (m.type === 'article') {
    const p = m.post || {};
    graph.push({
      '@type': 'BlogPosting', '@id': `${url}#article`, headline: pageName, description: m.description, url,
      image: imageObj(m.image, pageName), datePublished: m.published || undefined, dateModified: p.updated || m.published || undefined,
      articleSection: p.category || undefined, keywords: Array.isArray(p.tags) ? p.tags.join(', ') : undefined,
      wordCount: plain(p.body).split(/\s+/).filter(Boolean).length || undefined,
      author: author(p), publisher: studioRef, isPartOf: { '@id': `${o}/blog#blog` }, mainEntityOfPage: { '@id': `${url}#webpage` },
      about: ((a) => (a.length ? a : undefined))(c.sessions.filter((x) => (p.tags || []).concat(p.category || '').some((t) => new RegExp(x.title.split(' ')[0], 'i').test(t))).map((x) => ({ '@id': `${o}/portfolio/${x.slug}#service` }))),
      inLanguage: 'en-IN',
    });
  }
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

/**
 * Server-side rendering: the built renderer (dist-ssr/entry-server.js, made by `npm run build`) turns each public
 * page into full HTML, which the browser then hydrates. Private screens (admin, client galleries) are never
 * pre-rendered. If the renderer is missing or a page throws, the page falls back to normal browser rendering
 * (plus the <noscript> copy), so SSR can never take the site down. Set SSR=off in the env to disable it.
 */
let ssrMod;
async function ssr(dist, url, raw) {
  if (process.env.SSR === 'off') return '';
  if (ssrMod === undefined) {
    const file = path.join(dist, '..', 'dist-ssr', 'entry-server.js');
    try { ssrMod = fs.existsSync(file) ? await import(pathToFileURL(file).href) : null; } catch (e) { console.error('SSR renderer failed to load:', e.message); ssrMod = null; }
    if (!ssrMod) console.warn('SSR off: dist-ssr/entry-server.js not found — run `npm run build`.');
  }
  if (!ssrMod) return '';
  try { return ssrMod.render(url, raw); } catch (e) { console.error(`SSR failed for ${url}:`, e.message); return ''; }
}

export function htmlHandler(dist) {
  return async (req, res, next) => {
    try {
      const o = origin(req);
      const m = await metaFor(req.path);
      const g = geoFacts((await content()).studio);
      const url = `${o}${req.path === '/' ? '/' : req.path.replace(/\/+$/, '')}`;
      const img = abs(o, m.image);
      const imgType = IMAGE_TYPES[String(m.image || '').split('?')[0].split('.').pop().toLowerCase()];
      const priv = ['client', 'admin'].includes(req.path.split('/')[1]);
      const app = priv ? '' : await ssr(dist, req.originalUrl, (await content()).raw);
      const tags = [
        `<link rel="canonical" href="${esc(url)}" />`,
        m.noindex ? '<meta name="robots" content="noindex" />' : '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />',
        // Local geo tags (read by Bing and some directories / AI crawlers; Google relies on the JSON-LD below).
        '<meta name="geo.region" content="IN-UP" />',
        '<meta name="geo.placename" content="Noida, Uttar Pradesh" />',
        g.lat != null ? `<meta name="geo.position" content="${g.lat};${g.lng}" />` : '',
        g.lat != null ? `<meta name="ICBM" content="${g.lat}, ${g.lng}" />` : '',
        `<link rel="alternate" type="text/plain" title="Summary for AI assistants" href="${esc(o)}/llms.txt" />`,
        `<meta property="og:site_name" content="${SITE}" />`,
        `<meta property="og:type" content="${m.type}" />`,
        `<meta property="og:url" content="${esc(url)}" />`,
        `<meta property="og:title" content="${esc(m.title)}" />`,
        `<meta property="og:description" content="${esc(m.description)}" />`,
        img && `<meta property="og:image" content="${esc(img)}" />`,
        img.startsWith('https://') && `<meta property="og:image:secure_url" content="${esc(img)}" />`,
        imgType && `<meta property="og:image:type" content="${imgType}" />`,
        m.image === OG_IMAGE && '<meta property="og:image:width" content="1200" />',
        m.image === OG_IMAGE && '<meta property="og:image:height" content="630" />',
        img && `<meta property="og:image:alt" content="${esc(m.imageAlt || m.title)}" />`,
        '<meta property="og:locale" content="en_IN" />',
        m.published ? `<meta property="article:published_time" content="${esc(m.published)}" />` : '',
        '<meta name="twitter:card" content="summary_large_image" />',
        `<meta name="twitter:title" content="${esc(m.title)}" />`,
        `<meta name="twitter:description" content="${esc(m.description)}" />`,
        img && `<meta name="twitter:image" content="${esc(img)}" />`,
        img && `<meta name="twitter:image:alt" content="${esc(m.imageAlt || m.title)}" />`,
      ].filter(Boolean).join('\n    ');
      const html = readShell(dist)
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(m.title)}</title>`)
        .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(m.description)}" />`)
        .replace(/\s*<meta property="og:[^>]*>/g, '')
        .replace(/\s*<meta name="twitter:[^>]*>/g, '')
        .replace(/\s*<meta name="geo\.[^>]*>/g, '')
        .replace('<div id="root"></div>', app
          ? `<div id="root" data-ssr>${app}</div>`
          : `<div id="root"></div>\n    ${await noscriptContent(o, req.path, m)}`)
        .replace('</head>', `    ${tags}\n    ${await inlineContent(req.path)}\n    ${await structuredData(o, req.path, m)}\n  </head>`);
      res.status(m.noindex && !priv ? 404 : 200).type('html').set('Cache-Control', 'no-cache').send(html);
    } catch (e) { next(e); }
  };
}

/* ---------- robots.txt, sitemap.xml, llms.txt ---------- */

// Search engines and AI answer engines we want recommending the studio. Remove a name to opt that bot out.
const AI_BOTS = ['Googlebot', 'Bingbot', 'Google-Extended', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Applebot', 'Applebot-Extended', 'Amazonbot', 'meta-externalagent', 'DuckAssistBot', 'CCBot'];

export async function robots(req, res) {
  const rules = 'Allow: /\nDisallow: /admin\nDisallow: /client\nDisallow: /api/\n';
  res.type('text/plain').send(
    `# ${SITE} — search engines and AI assistants are welcome.\n# Plain-text summary for AI: ${origin(req)}/llms.txt\n\n`
    + `User-agent: *\n${rules}\n${AI_BOTS.map((b) => `User-agent: ${b}`).join('\n')}\n${rules}\nSitemap: ${origin(req)}/sitemap.xml\n`,
  );
}

export async function sitemap(req, res) {
  const o = origin(req);
  const c = await content();
  const latest = c.blog.map((p) => p.date).filter(Boolean).sort().pop();
  const urls = [
    ['/', '1.0', latest], ['/portfolio', '0.9'], ['/videos', '0.7'], ['/services', '0.9'], ['/about', '0.7'], ['/contact', '0.8'], ['/blog', '0.7', latest], ['/gift-cards', '0.6'], ['/privacy', '0.3'],
    ...c.sessions.map((s) => [`/portfolio/${s.slug}`, '0.9', null, s.img]),
    ...c.blog.map((p) => [`/blog/${p.slug}`, '0.6', p.date, p.cover]),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.map(([u, pr, d, im]) => `  <url><loc>${esc(o + u)}</loc>${d ? `<lastmod>${esc(d)}</lastmod>` : ''}<priority>${pr}</priority>${im ? `<image:image><image:loc>${esc(abs(o, im))}</image:loc></image:image>` : ''}</url>`).join('\n')}\n</urlset>\n`;
  res.type('application/xml').send(xml);
}

/**
 * /llms.txt — a short Markdown fact sheet AI assistants can read in one go (llmstxt.org).
 * /llms-full.txt — the same plus every package, FAQ and blog post in full.
 */
async function llmsText(o, full) {
  const c = await content();
  const st = c.studio;
  const g = geoFacts(st);
  const L = [];
  L.push(`# ${SITE}`, '', `> ${SLOGAN} ${HOME_DESC}`, '', studioSummary(c.sessions), '');
  L.push('## Why families choose us', '');
  studioHighlights(c.sessions).forEach(([t, d]) => L.push(`- ${t}: ${d}`));
  L.push('');
  L.push('## Key facts', '');
  L.push('- Also known as: BabySteps by Guide (@babystepsbyguide). A photography studio, not related to the video game "Baby Steps"');
  L.push('- What: newborn, maternity, baby milestone (3/6/9 months), pre-birthday, cake smash and family photoshoot studio');
  L.push(`- Where: ${st.address}${g.postalCode ? ` ${g.postalCode}` : ''}, India${g.lat != null ? ` (map pin ${g.lat}, ${g.lng})` : ''}`);
  L.push(`- Serves: ${AREAS.join(', ')}`);
  L.push(`- Phone / WhatsApp: ${st.phone} · Email: ${st.email}`);
  if (g.hoursText) L.push(`- Hours: ${g.hoursText}`);
  L.push('- Photographers: Tanya & Sarthak Chopra (husband-wife team); powered by Guide Photo Studio');
  if (st.instagram) L.push(`- Instagram: ${st.instagram}`);
  L.push(`- Booking: ${o}/contact`, '');
  L.push('## Photoshoots and starting prices', '');
  c.sessions.forEach((s) => L.push(`- [${sessionSeo(s).title}](${o}/portfolio/${s.slug}): ${s.text}${s.when ? ` Best time: ${s.when}.` : ''}${s.from ? ` From ₹${s.from}.` : ''}`));
  L.push('', '## Pages', '');
  [['Packages & prices', '/services', 'every package, inclusions and add-ons'], ['Portfolio', '/portfolio', 'sample work by session type'], ['Videos', '/videos', 'reels, behind the scenes and podcast'], ['About us', '/about', 'the photographers and studio'], ['Contact & booking', '/contact', 'enquiry form, WhatsApp, map'], ['Gift cards', '/gift-cards', 'buy a photoshoot as a gift']]
    .forEach(([n, u, d]) => L.push(`- [${n}](${o}${u}): ${d}`));
  L.push('', '## Guides', '');
  c.blog.forEach((p) => L.push(`- [${p.title}](${o}/blog/${p.slug}): ${p.excerpt || ''}`));
  if (full) {
    L.push('', '## Packages in detail', '');
    Object.values(c.packages).forEach((p) => {
      L.push(`### ${p.label}`, '');
      (p.plans || []).forEach((pl) => L.push(`- ${pl.name} — ₹${pl.price}: ${(pl.features || []).join(', ')}`));
      if (p.addons?.length) L.push(`- Add-ons: ${p.addons.map(([n, v]) => `${n} (${v})`).join('; ')}`);
      L.push('');
    });
    L.push('## Frequently asked questions', '');
    [...keyFaqs(c.sessions, c.studio), ...c.faqs].forEach((f) => L.push(`### ${f.q}`, '', f.a, ''));
    c.blog.forEach((p) => L.push(`## ${p.title}`, '', `${o}/blog/${p.slug}${p.date ? ` · ${p.date}` : ''}`, '', String(p.body || '').replace(/\]\(\//g, `](${o}/`), ''));
  } else {
    L.push('', '## Optional', '', `- [Full details](${o}/llms-full.txt): all packages, FAQs and guides in one file`);
  }
  return `${L.join('\n').trim()}\n`;
}

export async function llms(req, res) {
  res.type('text/plain; charset=utf-8').set('Cache-Control', 'public, max-age=3600').send(await llmsText(origin(req), false));
}
export async function llmsFull(req, res) {
  res.type('text/plain; charset=utf-8').set('Cache-Control', 'public, max-age=3600').send(await llmsText(origin(req), true));
}
