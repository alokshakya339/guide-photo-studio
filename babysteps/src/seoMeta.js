// Page titles & descriptions — ONE source used by the browser app (usePage) and the server (server/src/seo.js),
// so Google, social previews and AI search all see the same wording.
//
// Keywords come from what people actually type into Google for this kind of studio (Nov 2026 research):
//   "newborn photoshoot in Noida", "maternity photoshoot in Noida", "baby photoshoot in Noida",
//   "cake smash photoshoot Noida", "pre birthday photoshoot Noida", "family photoshoot Noida",
//   "newborn / baby photographer in Noida", "... Greater Noida", "... Delhi NCR", "... price".
// Google results use "photoshoot" far more than "photography", so titles lead with it and descriptions use both.

export const SITE = 'BabySteps Guide Studio';
export const CITY = 'Noida';
export const AREAS = ['Noida', 'Greater Noida', 'Delhi', 'Ghaziabad', 'Delhi NCR'];

export const HOME_TITLE = `Newborn, Maternity & Baby Photoshoot in Noida · ${SITE}`;
export const HOME_DESC = 'Premium newborn, maternity, milestone, cake smash & family photoshoots in Sector 37, Noida by Tanya & Sarthak Chopra. Safe posing, gowns & props included.';
export const SLOGAN = 'Capturing tiny moments, creating lifetime memories.';

/** Keyword-first page name for each session page (URL slug → title). Unknown slugs get "<Title> Photoshoot in Noida". */
const SESSION_KW = {
  maternity: 'Maternity Photoshoot in Noida',
  newborn: 'Newborn Photoshoot in Noida',
  milestones: 'Baby Milestone Photoshoot in Noida',
  'pre-birthday': 'Pre-Birthday Photoshoot in Noida',
  'cake-smash': 'Cake Smash Photoshoot in Noida',
  family: 'Family Photoshoot in Noida',
};

const clip = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t; };
const minPrice = (sessions = []) => {
  const p = sessions.map((x) => Number(String(x.from || '').replace(/[^\d]/g, ''))).filter(Boolean);
  return p.length ? Math.min(...p).toLocaleString('en-IN') : '';
};

export function sessionSeo(s) {
  if (!s) return { title: 'Page not found', description: '' };
  const title = SESSION_KW[s.slug] || `${s.title} Photoshoot in Noida`;
  const description = clip(`${title} at BabySteps Guide Studio, Sector 37. ${s.text || ''}${s.when ? ` Best time: ${s.when}.` : ''}${s.from ? ` Packages from ₹${s.from}.` : ''}`);
  return { title, description };
}

/** Section pages. `sessions` lets the copy quote the current lowest price. */
export function pageSeo(key, { sessions = [], address = '', phone = '' } = {}) {
  const from = minPrice(sessions);
  const map = {
    portfolio: ['Newborn, Maternity & Baby Photoshoot Portfolio', 'See real newborn, maternity, baby milestone, cake smash and family photoshoots from our studio in Sector 37, Noida.'],
    videos: ['Baby & Maternity Photoshoot Videos', 'Watch reels, behind-the-scenes clips and podcast episodes from our newborn, maternity and baby photoshoots in Sector 37, Noida.'],
    services: ['Photoshoot Packages & Prices in Noida', `Newborn, maternity, baby milestone, cake smash & family photoshoot packages in Noida${from ? ` from ₹${from}` : ''}. Clear prices, gowns & props included, add-ons listed.`],
    about: ['Newborn & Maternity Photographers in Noida', 'Meet Tanya & Sarthak Chopra, the husband-wife newborn, maternity and baby photographers behind BabySteps Guide Studio in Sector 37, Noida.'],
    contact: ['Book a Baby or Maternity Photoshoot in Noida', clip(`Book your newborn, maternity or baby photoshoot in Noida.${address ? ` Studio: ${address}.` : ''}${phone ? ` Call or WhatsApp ${phone}.` : ''}`)],
    blog: ['Newborn & Maternity Photoshoot Tips', 'Guides for parents-to-be and new parents: when to book a newborn photoshoot, maternity shoot tips, cake smash ideas and more from our Noida studio.'],
    'gift-cards': ['Baby & Maternity Photoshoot Gift Cards', 'Gift a maternity, newborn or baby photoshoot in Noida — BabySteps gift cards for moms-to-be and new parents, bought online in minutes.'],
    privacy: ['Privacy Policy', `How ${SITE} collects, uses and protects your personal information and photographs.`],
  };
  const m = map[key];
  return m ? { title: m[0], description: m[1] } : null;
}

/* ---------- The "AI overview" copy ----------
 * Google's AI Overview, ChatGPT, Perplexity etc. summarise the text they can SEE on the page. These give them one
 * clear, factual, quotable description of the studio. Shown visibly on the home page and reused in JSON-LD and
 * llms.txt so every source says the same thing. Keep it true — never add claims the studio can't back up. */

export function studioSummary(sessions = []) {
  const from = minPrice(sessions);
  return `${SITE} (also known as BabySteps by Guide) is a premium maternity, newborn and baby photography studio in Sector 37, Noida, run by husband-wife `
    + 'photographers Tanya & Sarthak Chopra and backed by Guide Photo Studio, trusted by families for generations. '
    + 'The studio captures every early chapter (maternity at 28–34 weeks, newborn at 5–15 days, 3, 6 & 9-month milestones, '
    + 'pre-birthday, cake smash and family portraits) in a warm, temperature-controlled space with safe, gentle newborn posing. '
    + `Gowns, wraps, props and themed sets are included, edited photos arrive in a private online gallery${from ? `, and packages start from ₹${from}` : ''}. `
    + `Families visit from ${AREAS.slice(0, -1).join(', ')} and across Delhi NCR.`;
}

/** Short reasons to book (title, line). */
export function studioHighlights(sessions = []) {
  const from = minPrice(sessions);
  return [
    ['Husband-wife photographers', 'Tanya & Sarthak Chopra run the studio, backed by Guide Photo Studio, trusted by families for generations.'],
    ['Newborn safety first', 'Temperature-controlled studio and trained, gentle newborn handling, with a parent’s hand always close.'],
    ['Everything included', 'Maternity gowns, newborn wraps, props and custom themed sets. Just bring your little one.'],
    ['Private online gallery', 'High-resolution edited photos in your own gallery, with albums and prints on selected packages.'],
    [from ? `Packages from ₹${from}` : 'Clear package prices', 'Transparent prices with add-ons listed, plus custom packages and gift cards.'],
    ['Easy to reach', 'Sector 37, Noida. Monday to Saturday, 10 am–6 pm, by appointment. English & Hindi spoken.'],
  ];
}

/** Price & location answers: the two things people most often ask Google / AI about a studio. */
export function keyFaqs(sessions = [], studio = {}) {
  const priced = sessions.filter((s) => s.title && s.from).map((s) => `${s.title.toLowerCase()} shoots start from ₹${s.from}`);
  const out = [];
  if (priced.length) out.push({ q: 'How much does a newborn or maternity photoshoot cost in Noida?', a: `At ${SITE}, ${priced.join(', ')}. Every package includes outfits or props and professionally edited photos, and we can tailor a custom package to your budget.` });
  if (studio.address) out.push({ q: `Where is ${SITE} located?`, a: `The studio is at ${studio.address}${studio.postalCode ? ` ${studio.postalCode}` : ''}, serving Noida, Greater Noida, Delhi and Ghaziabad. Sessions are by appointment, Monday to Saturday. Call or WhatsApp ${studio.phone || 'us'} to book.` });
  return out;
}
