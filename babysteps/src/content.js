// Loads BabySteps content saved in the admin and applies it over the built-in defaults in data.js.
// data.js exports are mutated in place (like the main site's loadSite), so every component keeps
// importing from data.js as usual. Anything never edited keeps its default.
import * as D from './data.js';
import { api, asset } from './api.js';

const clone = (v) => JSON.parse(JSON.stringify(v));

/** Pristine defaults, captured before any saved content is applied (the admin edits on top of these). */
export const DEFAULTS = clone({
  studio: D.STUDIO,
  images: D.IMG,
  sessions: D.JOURNEY,
  packages: D.PACKAGES,
  gallery: D.GALLERY,
  reels: D.REELS,
  testimonials: D.TESTIMONIALS,
  faqs: D.FAQS,
  features: D.FEATURES,
  steps: D.STEPS,
  hero: D.HERO_SLIDES,
  blog: D.BLOG,
});

/**
 * A reel link → { platform, id }. YouTube Shorts / youtu.be / watch links → 'youtube'; Instagram reel links and
 * bare IDs → 'instagram' (bare IDs were always Instagram here; YouTube needs its link).
 */
export function parseReel(v) {
  const s = String(v || '').trim();
  const yt = s.match(/(?:youtube\.com\/(?:shorts\/|watch\?(?:.*&)?v=|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { platform: 'youtube', id: yt[1] };
  const ig = s.match(/instagram\.com\/(?:[\w.]+\/)?(?:reels?|p|tv)\/([^/?#]+)/);
  return { platform: 'instagram', id: ig ? ig[1] : s };
}
export const reelId = (v) => parseReel(v).id;
const slugify = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Studio-server paths ("/uploads/…") must load from that server. */
function withAssets(v) {
  if (typeof v === 'string') return v.startsWith('/uploads/') ? asset(v) : v;
  if (Array.isArray(v)) return v.map(withAssets);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, withAssets(x)]));
  return v;
}
function remap(v, map) {
  if (typeof v === 'string') return map[v] || v;
  if (Array.isArray(v)) return v.map((x) => remap(x, map));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, remap(x, map)]));
  return v;
}
const replaceArray = (target, next) => { if (Array.isArray(next) && next.length) target.splice(0, target.length, ...next); };

const CAT_LABEL = { newborn: 'Newborn', maternity: 'Maternity', milestone: 'Milestone', cake: 'Cake smash', birthday: 'Pre-birthday', family: 'Family' };

/** Put every data.js export back to its built-in default (the server re-applies content after admin edits). */
export function resetContent() {
  const d = clone(DEFAULTS);
  Object.keys(D.STUDIO).forEach((k) => delete D.STUDIO[k]); Object.assign(D.STUDIO, d.studio);
  Object.keys(D.IMG).forEach((k) => delete D.IMG[k]); Object.assign(D.IMG, d.images);
  Object.keys(D.PACKAGES).forEach((k) => delete D.PACKAGES[k]); Object.assign(D.PACKAGES, d.packages);
  [[D.JOURNEY, d.sessions], [D.GALLERY, d.gallery], [D.REELS, d.reels], [D.TESTIMONIALS, d.testimonials], [D.FAQS, d.faqs],
    [D.FEATURES, d.features], [D.STEPS, d.steps], [D.HERO_SLIDES, d.hero], [D.BLOG, d.blog]].forEach(([t, v]) => t.splice(0, t.length, ...v));
}

export function applyContent(raw) {
  if (!raw || typeof raw !== 'object') return;
  const c = withAssets(raw);

  // Key photos: swap them everywhere the default photo was used (sessions, gallery…).
  if (c.images) {
    const map = {};
    Object.entries(c.images).forEach(([k, url]) => { if (url && DEFAULTS.images[k] && DEFAULTS.images[k] !== url) map[DEFAULTS.images[k]] = url; });
    replaceArray(D.JOURNEY, remap(clone(D.JOURNEY), map));
    replaceArray(D.GALLERY, remap(clone(D.GALLERY), map));
    replaceArray(D.HERO_SLIDES, remap(clone(D.HERO_SLIDES), map));
    replaceArray(D.BLOG, remap(clone(D.BLOG), map));
    Object.assign(D.IMG, Object.fromEntries(Object.entries(c.images).filter(([, v]) => v)));
  }
  if (c.studio) Object.assign(D.STUDIO, Object.fromEntries(Object.entries(c.studio).filter(([, v]) => v !== '' && v != null)));
  if (Array.isArray(c.sessions)) {
    replaceArray(D.JOURNEY, c.sessions.filter((s) => s.title).map((s) => {
      const slug = s.slug || slugify(s.title);
      return { ...s, slug, key: s.key || slug, perks: s.perks || [] };
    }));
  }
  if (c.packages) Object.keys(c.packages).forEach((k) => { D.PACKAGES[k] = { ...(D.PACKAGES[k] || {}), ...c.packages[k] }; });
  // Gallery photos only need a category now; captions / screen-reader text fall back to it.
  replaceArray(D.GALLERY, c.gallery?.filter((g) => g.src).map((g) => ({ ...g, alt: g.alt || `${CAT_LABEL[g.cat] || 'Baby'} photography in Noida — BabySteps Guide Studio` })));
  replaceArray(D.REELS, c.reels?.map((r) => ({ ...r, ...parseReel(r.id) })).filter((r) => r.id));
  replaceArray(D.TESTIMONIALS, c.testimonials?.filter((t) => t.text));
  replaceArray(D.FAQS, c.faqs?.filter((f) => f.q));
  replaceArray(D.FEATURES, c.features?.filter((f) => f.title));
  replaceArray(D.STEPS, c.steps?.filter((s) => s.title));
  replaceArray(D.HERO_SLIDES, c.hero?.filter((s) => s.title).map((s) => ({ ...s, img1: s.img1 || s.img })));
  if (Array.isArray(c.blog)) D.BLOG.splice(0, D.BLOG.length, ...c.blog.filter((p) => p.title).map((p) => ({ ...p, slug: p.slug || slugify(p.title) })));
}

/** Fetch saved content; on any failure the site simply renders its defaults. */
export async function loadContent() {
  // Production pages arrive with the content already inside (see server/src/seo.js) — no network wait.
  if (typeof window !== 'undefined' && window.__BS_CONTENT__) { try { applyContent(window.__BS_CONTENT__); } catch { /* defaults */ } return; }
  try {
    const data = await Promise.race([api('/babysteps/content'), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]);
    applyContent(data);
  } catch { /* offline or server down → defaults */ }
}
