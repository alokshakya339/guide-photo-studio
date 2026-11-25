import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Category, Package, Testimonial, Faq, Inquiry, Job, Application, Setting, Film, Reel, Award, BlogPost } from '../models/index.js';
import { DEFAULT_SITE } from '../cms/defaults.js';
import { normalizeGiftCode, GIFT_CODE_RX } from '../giftCodes.js';

const router = Router();

/** Everything the site shell needs: settings + published films and reels. */
router.get('/site', async (_req, res) => {
  const [doc, films, reels, awards] = await Promise.all([
    Setting.findOne({ key: 'site' }).lean(),
    Film.find({ published: true }).sort('order').lean(),
    Reel.find({ published: true }).sort('order').lean(),
    Award.find({ published: true }).sort({ order: 1, createdAt: 1 }).lean(),
  ]);
  res.set('Cache-Control', 'no-cache');
  res.json({
    ...DEFAULT_SITE,
    ...(doc?.data || {}),
    films: films.map((f) => ({ id: f.youtubeId, title: f.title, subtitle: f.subtitle, blurb: f.blurb, tags: f.tags, poster: f.poster, previewStart: f.previewStart, previewLength: f.previewLength })),
    reels: reels.filter((r) => r.youtubeId || r.instagramId).map((r) => ({ id: r.platform === 'instagram' ? r.instagramId : r.youtubeId, platform: r.platform || 'youtube', title: r.title, tag: r.tag, thumbnail: r.thumbnail })),
    awards: awards.map(({ _id, title, org, year, category, note, image, link }) => ({ id: _id, title, org, year, category, note, image, link })),
  });
});

/** BabySteps sub-brand site content (edited in the BabySteps admin). Empty object → site uses its built-in defaults. */
router.get('/babysteps/content', async (_req, res) => {
  const doc = await Setting.findOne({ key: 'babysteps' }).lean();
  res.set('Cache-Control', 'no-cache');
  res.json(doc?.data || {});
});

const LIVE = { published: { $ne: false } };

router.get('/categories', async (_req, res) => {
  const cats = await Category.find(LIVE).sort('order').lean();
  res.json(
    cats.map(({ images, ...c }) => ({
      ...c,
      count: images.length,
      preview: images.slice(0, 4).map((i) => i.src),
    }))
  );
});

router.get('/categories/:slug', async (req, res) => {
  const cat = await Category.findOne({ slug: req.params.slug, ...LIVE }).lean();
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  res.json(cat);
});

/** Featured images across all categories, for the homepage. */
router.get('/featured', async (_req, res) => {
  const cats = await Category.find(LIVE).sort('order').lean();
  const featured = cats.flatMap((c) =>
    c.images.filter((i) => i.featured).map((i) => ({ ...i, category: c.title, slug: c.slug }))
  );
  res.json(featured);
});

router.get('/packages', async (_req, res) => {
  // All packages are priced "on request" on the public site; the real prices stay editable in admin.
  const rows = await Package.find(LIVE).sort('order').lean();
  res.json(rows.map((p) => ({ ...p, startingPrice: null })));
});

router.get('/testimonials', async (_req, res) => {
  res.json(await Testimonial.find({ published: true }).sort('-createdAt').lean());
});

/* ---------- Blog ---------- */
const BLOG_LIVE = { published: true };
/** Published posts, newest first (no body — the list only needs cards). */
router.get('/blog', async (_req, res) => {
  const posts = await BlogPost.find(BLOG_LIVE).sort({ date: -1, createdAt: -1 }).select('-body -order -__v').lean();
  // Reading time needs the length of each body.
  const lengths = await BlogPost.aggregate([{ $match: BLOG_LIVE }, { $project: { words: { $size: { $regexFindAll: { input: { $ifNull: ['$body', ''] }, regex: /\S+/ } } } } }]);
  const words = Object.fromEntries(lengths.map((l) => [String(l._id), l.words]));
  res.json(posts.map((p) => ({ ...p, minutes: Math.max(1, Math.round((words[String(p._id)] || 0) / 200)) })));
});

router.get('/blog/:slug', async (req, res) => {
  const post = await BlogPost.findOne({ slug: String(req.params.slug).toLowerCase(), published: true }).select('-order -__v').lean();
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});

router.get('/faqs', async (_req, res) => {
  res.json(await Faq.find().sort('order').lean());
});

const inquiryLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

router.post('/inquiries', inquiryLimiter, async (req, res) => {
  const { name, phone, email, eventType, eventDate, location, budget, message, source, website, giftCode, company, designation } = req.body || {};
  const corporate = source === 'corporate';
  // `website` is a hidden honeypot field; real visitors leave it empty.
  if (website) return res.status(201).json({ ok: true });

  const errors = {};
  if (!name || String(name).trim().length < 2) errors.name = 'Please enter your name';
  if (!phone || !/^[+\d][\d\s-]{7,18}$/.test(String(phone).trim())) errors.phone = 'Please enter a valid phone number';
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Please enter a valid email';
  if (corporate && !email) errors.email = 'Please enter your work email';
  if (corporate && (!company || String(company).trim().length < 2)) errors.company = 'Please enter your company name';
  if (eventDate && Number.isNaN(Date.parse(eventDate))) errors.eventDate = 'Invalid date';
  const gift = giftCode ? normalizeGiftCode(giftCode) : '';
  if (gift && !GIFT_CODE_RX.test(gift)) errors.giftCode = 'Gift card codes look like GS-XXXX-XXXX';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields', errors });

  const inquiry = await Inquiry.create({
    name, phone, email, eventType, location, budget, message, source, giftCode: gift || undefined,
    company: company || undefined, designation: designation || undefined,
    eventDate: eventDate ? new Date(eventDate) : undefined,
  });
  res.status(201).json({ ok: true, id: inquiry._id });
});

/* ---------- Careers ---------- */
router.get('/jobs', async (_req, res) => {
  res.json(await Job.find({ open: true }).sort('order').lean());
});

const applyLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });
const isUrl = (v) => !v || /^https?:\/\/\S+\.\S+/i.test(String(v).trim());

router.post('/applications', applyLimiter, async (req, res) => {
  const { name, phone, email, role, level, portfolio, resume, instagram, message, website } = req.body || {};
  if (website) return res.status(201).json({ ok: true }); // honeypot

  const errors = {};
  if (!name || String(name).trim().length < 2) errors.name = 'Please enter your name';
  if (!phone || !/^[+\d][\d\s-]{7,18}$/.test(String(phone).trim())) errors.phone = 'Please enter a valid phone number';
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Please enter a valid email';
  if (!role) errors.role = 'Choose the role you’re applying for';
  if (!isUrl(portfolio)) errors.portfolio = 'Paste a full link starting with https://';
  if (!isUrl(resume)) errors.resume = 'Paste a full link starting with https://';
  if (level === 'experienced' && !portfolio) errors.portfolio = 'Share a link to your work (Drive, Behance, Instagram, YouTube…)';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields', errors });

  const appn = await Application.create({
    name, phone, email, role, portfolio, resume, message,
    level: level === 'experienced' ? 'experienced' : 'fresher',
    instagram: instagram ? String(instagram).replace(/^@/, '') : undefined,
  });
  res.status(201).json({ ok: true, id: appn._id });
});

export default router;
