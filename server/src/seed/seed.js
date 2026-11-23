/**
 * Seeds MongoDB with Guide Photo Studio's portfolio, packages and FAQs,
 * a demo client gallery and the admin account from .env.
 *
 *   npm run seed            -> wipes and reloads portfolio/packages/FAQs, keeps inquiries & testimonials
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Category, Package, Faq, ClientGallery, Admin, Plan, Job, Film, Reel, MusicTrack, Setting, Media } from '../models/index.js';
import { DEFAULT_MUSIC } from './music-defaults.js';
import { DEFAULT_SITE, DEFAULT_FILMS, DEFAULT_REELS } from '../cms/defaults.js';

const range = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}${String(i + 1).padStart(2, '0')}.jpg`);

const weddingImgs = range('/images/wedding/w', 25);
const birthdayImgs = range('/images/birthday/b', 23);
const featuredWedding = new Set(['w05', 'w04', 'w15', 'w14', 'w20', 'w11', 'w01', 'w25'].map((n) => `/images/wedding/${n}.jpg`));
const featuredBirthday = new Set(['b03', 'b19', 'b09'].map((n) => `/images/birthday/${n}.jpg`));

const categories = [
  {
    slug: 'wedding',
    title: 'Weddings',
    tagline: 'Candid, cinematic, timeless',
    description:
      'From the haldi to the vidaai, we blend candid, contemporary and fine-art photography to tell the story of your day the way it felt.',
    cover: '/images/portfolio/wedding.jpg',
    order: 1,
    images: [
      { src: '/images/portfolio/wedding.jpg', alt: 'Bride and groom in an intimate portrait', featured: true },
      { src: '/images/home/couple-3.jpg', alt: 'Couple in a grand chandelier-lit palace hall', featured: true },
      ...weddingImgs.map((src) => ({ src, alt: 'Wedding moment captured by Guide Photo Studio', featured: featuredWedding.has(src) })),
    ],
  },
  {
    slug: 'pre-wedding',
    title: 'Pre-Wedding',
    tagline: 'Your story, before the big day',
    description: 'Destination and city pre-wedding shoots across Delhi NCR, Jaipur and beyond, with styling and location guidance.',
    cover: '/images/portfolio/pre-wedding.jpg',
    order: 2,
    images: [
      { src: '/images/portfolio/pre-wedding.jpg', alt: 'Pre-wedding couple portrait outdoors', featured: true },
      { src: '/images/home/couple-2.jpg', alt: 'Couple at Jal Mahal, Jaipur', featured: true },
      { src: '/images/home/couple-1.jpg', alt: 'Couple under a lit Ferris wheel at dusk', featured: true },
      { src: '/images/home/couple-4.jpg', alt: 'Couple in a moody night-time close-up', featured: true },
    ],
  },
  {
    slug: 'maternity',
    title: 'Maternity',
    tagline: 'Celebrating the glow',
    description: 'Elegant outdoor and in-studio maternity portraits with flowing gowns, soft light and a relaxed pace.',
    cover: '/images/portfolio/maternity.jpg',
    order: 3,
    images: [{ src: '/images/portfolio/maternity.jpg', alt: 'Expecting mother in a flowing red gown', featured: true }],
  },
  {
    slug: 'baby',
    title: 'Baby Shoot',
    tagline: 'Tiny moments, big memories',
    description: 'Newborn, milestone and first-birthday portraits with themed setups, props and plenty of patience.',
    cover: '/images/portfolio/baby.jpg',
    order: 4,
    images: [
      { src: '/images/portfolio/baby.jpg', alt: 'Baby girl in a pink dress at an outdoor themed setup', featured: true },
      { src: '/images/birthday/b07.jpg', alt: 'Mother holding her baby daughter' },
      { src: '/images/birthday/b05.jpg', alt: 'Parents with their baby at a celebration' },
    ],
  },
  {
    slug: 'birthday',
    title: 'Birthday',
    tagline: 'Parties full of joy',
    description: 'Birthday and family celebration coverage, including décor, cake-cutting, candid guests and family portraits.',
    cover: '/images/portfolio/birthday.jpg',
    order: 5,
    images: [
      { src: '/images/portfolio/birthday.jpg', alt: 'Birthday girl in front of a themed balloon setup', featured: true },
      ...birthdayImgs.map((src) => ({ src, alt: 'Birthday celebration', featured: featuredBirthday.has(src) })),
    ],
  },
  {
    slug: 'headshot',
    title: 'Head Shots',
    tagline: 'Portfolio & professional portraits',
    description: 'Studio headshots and model portfolios for actors, professionals and creators, shot in our Noida studio.',
    cover: '/images/portfolio/headshot.jpg',
    order: 6,
    images: [{ src: '/images/portfolio/headshot.jpg', alt: 'Studio headshot against a grey backdrop', featured: true }],
  },
];

// Pricing from the studio's published FAQ. "null" = price on request.
const packages = [
  {
    title: 'Wedding Photography',
    category: 'wedding',
    startingPrice: 125000,
    unit: 'per day',
    description: 'Full-day candid and traditional coverage by our lead photographers.',
    includes: [
      'Up to 8 hours on location',
      '500–1000 edited images',
      'Online delivery in high & low resolution',
      'Premium album with Premium Wedding Packages',
    ],
    highlight: true,
    order: 1,
  },
  {
    title: 'Wedding Films',
    category: 'wedding',
    startingPrice: 100000,
    unit: '',
    description: 'Cinematic storytelling by a team of 2–3 cinematographers.',
    includes: ['5–30 minute cinematic wedding film', 'Short teaser for social media', 'Licensed music'],
    order: 2,
  },
  {
    title: 'Pre-Wedding Shoot',
    category: 'pre-wedding',
    startingPrice: 30000,
    unit: '',
    description: 'City or destination shoot with location and styling guidance.',
    includes: ['50–100 edited images', 'Optional 1–3 minute "Save the Date" film', 'Location planning help'],
    order: 3,
  },
  {
    title: 'Maternity & Baby',
    category: 'maternity',
    startingPrice: null,
    description: 'Studio or outdoor sessions for maternity, newborn and milestone portraits.',
    includes: ['Studio or outdoor session', 'Props and themed setups', 'Edited high-resolution images'],
    order: 4,
  },
  {
    title: 'Birthdays & Events',
    category: 'birthday',
    startingPrice: null,
    description: 'Coverage for birthdays, anniversaries and family celebrations.',
    includes: ['Candid and family portraits', 'Décor and detail shots', 'Optional highlight video'],
    order: 5,
  },
  {
    title: 'Headshots & Portfolio',
    category: 'headshot',
    startingPrice: null,
    description: 'Professional headshots and model portfolios in our Noida studio.',
    includes: ['Studio lighting setup', 'Multiple looks', 'Retouched final images'],
    order: 6,
  },
];

const faqs = [
  {
    question: 'How much does wedding photography cost?',
    answer:
      'Pricing is on request, because every wedding is different. It depends on the number of days and functions, hours on location, and the photos, films and albums you want. Send us your dates and we will share package options.',
  },
  {
    question: 'What will we receive after the wedding?',
    answer:
      'You receive 500–1000 professionally edited images in both high and low resolution through an online gallery, available to download for about three months. Premium Wedding Packages also include a customisable premium album. Wedding films include a 5–30 minute cinematic film plus a short teaser.',
  },
  {
    question: 'How do we confirm our date?',
    answer:
      'A 50% advance secures your date, and the balance is due on the event day. Editing begins once the final payment is received.',
  },
  {
    question: 'Do you travel for destination weddings?',
    answer:
      'Yes. We are based in Noida and shoot across Delhi NCR and destinations. For outstation shoots, travel, local transport and stay are covered by the client; we are happy to book these and add them to your invoice.',
  },
  {
    question: 'Who will photograph our event?',
    answer:
      'Sandeep Chopra and Sarthak Chopra are our lead photographers, supported by up to two assistants. Wedding films are shot by a team of two to three cinematographers.',
  },
  {
    question: 'What is your photography style?',
    answer:
      'A blend of candid, contemporary, fine-art and documentary wedding photography, together with posed family and couple portraits.',
  },
].map((f, i) => ({ ...f, order: i + 1 }));

const plans = [
  {
    code: 'monthly',
    name: 'Monthly',
    period: 'monthly',
    amount: 29900, // ₹299 / month (placeholder)
    description: 'Keep your gallery online, month to month.',
    features: ['Unlimited viewing & sharing', 'Full-resolution downloads', 'Cancel any time'],
    order: 1,
  },
  {
    code: 'yearly',
    name: 'Yearly',
    period: 'yearly',
    amount: 249900, // ₹2,499 / year (placeholder)
    description: 'Best value: a full year of gallery hosting.',
    features: ['Everything in Monthly', 'Save ~30% vs monthly', 'Renewal reminder before each year'],
    order: 2,
  },
];

// Open roles from the studio's "We're Hiring" post. Duties are typical for each role — edit to match the studio.
const jobs = [
  {
    slug: 'video-editor',
    title: 'Video Editor',
    icon: 'video',
    summary: 'Cut cinematic wedding films, teasers and reels that feel the way the day felt.',
    duties: ['Edit wedding films, teasers and pre-wedding films', 'Cut vertical reels and Shorts for Instagram & YouTube', 'Colour grade and sync music and audio'],
    skills: ['Premiere Pro / DaVinci Resolve / Final Cut', 'A sense of story, pacing and music'],
    order: 1,
  },
  {
    slug: 'photo-editor',
    title: 'Photo Editor',
    icon: 'photo',
    summary: 'Turn hundreds of frames into a polished, consistent set of wedding and portrait photos.',
    duties: ['Cull and colour-correct wedding & event shoots', 'Retouch portraits, maternity and baby photos', 'Design album spreads and client deliveries'],
    skills: ['Lightroom & Photoshop', 'An eye for skin tones and consistent colour'],
    order: 2,
  },
  {
    slug: 'social-media-manager',
    title: 'Social Media Manager & Strategist',
    icon: 'megaphone',
    summary: 'Grow Guide Photo Studio online and tell our stories on Instagram, YouTube and beyond.',
    duties: ['Plan and publish the content calendar', 'Write captions and hooks, and manage DMs and comments', 'Track what works and report on growth'],
    skills: ['Instagram & YouTube Shorts know-how', 'Basic Canva / editing skills'],
    order: 3,
  },
];

async function run() {
  
await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to', mongoose.connection.name);

  // CMS content is only inserted when a collection is empty, so edits made in the admin panel survive
  // re-seeding. Run `npm run seed -- --reset` to wipe and restore the original content.
  const reset = process.argv.includes('--reset');
  async function seedCollection(Model, rows, label) {
    if (reset) await Model.deleteMany({});
    if (await Model.countDocuments()) return console.log(`${label}: kept existing (${await Model.countDocuments()})`);
    await Model.insertMany(rows);
    console.log(`${label}: seeded ${rows.length}`);
  }
  await seedCollection(Category, categories, 'Portfolio categories');
  await seedCollection(Package, packages, 'Packages');
  await seedCollection(Faq, faqs, 'FAQs');
  await seedCollection(Job, jobs, 'Careers roles');
  await seedCollection(Film, DEFAULT_FILMS, 'Films');
  await seedCollection(Reel, DEFAULT_REELS, 'Reels');
  await seedCollection(MusicTrack, DEFAULT_MUSIC, 'Music library');

  if (reset) await Setting.deleteOne({ key: 'site' });
  await Setting.findOneAndUpdate({ key: 'site' }, { $setOnInsert: { key: 'site', data: DEFAULT_SITE } }, { upsert: true });
  console.log('Site settings ready');

  // Register the bundled photos in the media library so they can be picked in the CMS.
  if (reset) await Media.deleteMany({ folder: { $in: ['bundled'] } });
  if (!(await Media.countDocuments({ folder: 'bundled' }))) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../client/public/images');
    const files = [];
    for (const dir of fs.readdirSync(root)) {
      if (dir === 'brand' || !fs.statSync(path.join(root, dir)).isDirectory()) continue;
      for (const f of fs.readdirSync(path.join(root, dir))) if (/\.(jpe?g|png|webp)$/i.test(f)) files.push(`/images/${dir}/${f}`);
    }
    await Media.insertMany(files.map((url) => ({ url, originalName: url.split('/').slice(-2).join('/'), folder: 'bundled' })));
    console.log(`Media library: registered ${files.length} bundled photos`);
  }

  // Hosting plans (amounts in paise). Placeholder prices — change them in Admin → Plans.
  for (const p of plans) {
    await Plan.findOneAndUpdate({ code: p.code }, { $setOnInsert: p }, { upsert: true });
  }
  console.log(`Hosting plans ready: ${plans.map((p) => p.code).join(', ')}`);

  // Demo client galleries so proofing and the paywall can be tried immediately.
  // Demo client galleries (shared test password) are for local testing only — skipped with --production.
  if (!process.argv.includes('--production')) {
    await ClientGallery.deleteMany({ slug: { $in: ['demo-wedding', 'demo-expired'] } });
    const day = 86400000;
    await ClientGallery.create({
      slug: 'demo-wedding',
      title: 'Demo Wedding Gallery',
      clientName: 'Demo Client',
      passwordHash: await bcrypt.hash('guide2026', 10),
      cover: '/images/wedding/w14.jpg',
      selectionLimit: 10,
      accessUntil: new Date(Date.now() + 75 * day), // inside the free period
      photos: weddingImgs.slice(10, 25).map((src) => ({ src })),
    });
    await ClientGallery.create({
      slug: 'demo-expired',
      title: 'Demo Expired Gallery',
      clientName: 'Demo Client',
      passwordHash: await bcrypt.hash('guide2026', 10),
      cover: '/images/wedding/w04.jpg',
      selectionLimit: 10,
      accessUntil: new Date(Date.now() - 5 * day), // free period over → paywall
      photos: weddingImgs.slice(0, 10).map((src) => ({ src })),
    });
    console.log('Demo galleries (password "guide2026"): "demo-wedding" (free period), "demo-expired" (paywall)');
  }

  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    await Admin.findOneAndUpdate(
      { email: ADMIN_EMAIL.toLowerCase() },
      { email: ADMIN_EMAIL.toLowerCase(), passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10) },
      { upsert: true }
    );
    console.log(`Admin account ready: ${ADMIN_EMAIL}`);
  } else {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set; no admin account created');
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
