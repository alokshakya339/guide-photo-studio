/**
 * Demo wedding invitations used by the "See a live demo" links on /invites.
 * Safe to run any time (and on production): it creates or refreshes only these demo slugs.
 *
 *   npm run seed:invite-demos --prefix server
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Invitation } from '../invites/models.js';

const W = (n) => `/images/wedding/w${String(n).padStart(2, '0')}.jpg`;

const shared = {
  partner1: 'Riya', partner2: 'Raman',
  headline: 'invite you to celebrate their wedding',
  families: 'Mr. Rakesh & Mrs. Sunita Sharma and Mr. Anil & Mrs. Kavita Kapoor request the pleasure of your company',
  weddingDate: '2027-02-14',
  city: 'Mussoorie, Uttarakhand',
  hashtag: '#RiyaWedsRaman',
  coverPhoto: W(12),
  couplePhoto: W(15),
  gallery: [W(1), W(4), W(5), W(8), W(14)],
  couple: {
    p1Parents: 'Daughter of Mr. Rakesh & Mrs. Sunita Sharma',
    p1Bio: 'An architect who sketches every sunrise she sees — and has seen more of them than most.',
    p1Photo: '',
    p2Parents: 'Son of Mr. Anil & Mrs. Kavita Kapoor',
    p2Bio: 'An engineer who plans every trek down to the last snack, and still forgets his jacket.',
    p2Photo: '',
  },
  timeline: [
    { year: '2019', title: 'A wrong turn', text: 'Two lost hikers, one map, and a long argument about which way was north.' },
    { year: '2022', title: 'Base camp', text: 'Weekend climbs became weekday dinners, and the map stayed in one backpack.' },
    { year: '2026', title: 'The summit', text: 'At the top of a misty ridge, a ring came out of a snack pouch. She said yes.' },
  ],
  events: [
    { name: 'Haldi', date: '2027-02-12', time: '10:00 AM', venue: 'Pine Courtyard', address: 'Kempty Road, Mussoorie, Uttarakhand 248179', dressCode: 'Bright and easy — it will get messy.', colors: ['#f2c14e', '#f7e1a0', '#ffffff'] },
    { name: 'Mehendi', date: '2027-02-12', time: '4:00 PM', venue: 'Pine Courtyard', address: 'Kempty Road, Mussoorie, Uttarakhand 248179', dressCode: 'Garden greens and florals.', colors: ['#5b8c3a', '#a8cf5f', '#efe6cf'] },
    { name: 'Sangeet', date: '2027-02-13', time: '7:00 PM', venue: 'Ridge Ballroom', address: 'Camel’s Back Road, Mussoorie, Uttarakhand 248179', dressCode: 'Indo-western', colors: [] },
    { name: 'Wedding & Reception', date: '2027-02-14', time: '6:00 PM onwards', venue: 'Cloud Meadow Lawn', address: 'Landour Cantt, Mussoorie, Uttarakhand 248179', dressCode: 'Traditional finery with a touch of gold.', colors: ['#b8902f', '#8c2f2f', '#f3ead8'] },
  ],
  family: [
    { name: 'Rohan Sharma', relation: 'Brother of the bride', photo: '' },
    { name: 'Isha Kapoor', relation: 'Sister of the groom', photo: '' },
  ],
  contacts: [
    { name: 'Rakesh Sharma', role: 'Bride’s family', phone: '+919205128749' },
    { name: 'Anil Kapoor', role: 'Groom’s family', phone: '+919205128749' },
  ],
  rsvpEnabled: true,
  rsvpDeadline: '2027-01-31',
  wishesEnabled: true,
  showStudioCta: true,
  package: 'luxury',
  paymentStatus: 'waived',
  status: 'preview', // reachable only with the preview link, like the /invites page uses
  notes: 'Demo invitation for the /invites page. Recreate with: npm run seed:invite-demos --prefix server',
};

// slugs + preview tokens must match the DEMO links in client/src/pages/Invites.jsx
const DEMOS = [
  { slug: 'riya-raman-editorial', template: 'editorial', previewToken: '7ac156702610955deecc28c4d9424765' },
  { slug: 'riya-raman-demo', template: 'royal', previewToken: '0b791c53afd83aafb416a2256d7c89c6' },
  { slug: 'riya-raman-floral', template: 'floral', previewToken: 'bebaa3acc2a1d8d43bc4b678c7509d00', coverPhoto: W(17) },
  { slug: 'riya-raman-marigold', template: 'marigold', previewToken: '02a72dc65bdb456a7a2082dd44502510', coverPhoto: W(5) },
  { slug: 'riya-raman-midnight', template: 'midnight', previewToken: '57643efa6d353dd83cf150ca17510f59', coverPhoto: '/images/home/couple-3.jpg' },
  { slug: 'riya-raman-minimal', template: 'minimal', previewToken: 'a99a3ad51dde1edc1f3033601cfd618c', coverPhoto: '/images/home/couple-4.jpg' },
  { slug: 'riya-raman-temple', template: 'temple', previewToken: '3f9c1e7a5b2d48c6a0e4f71b9d2c86e5', coverPhoto: W(5) },
  { slug: 'riya-raman-scroll', template: 'scroll', previewToken: 'c4e82a1f9b6d4073a5e1d8f2b7c39a60', coverPhoto: W(17) },
  {
    slug: 'riya-raman-rajwada', template: 'rajwada', previewToken: '5d2a9e7c1b4f4a38b6e0c3d9f8a17e42', coverPhoto: '/images/home/couple-2.jpg',
    family: [
      { name: 'Shri Suresh Sharma & Family', relation: 'Chacha-Chachi' },
      { name: 'Shri Manoj Sharma & Family', relation: 'Tau-Tai' },
      { name: 'Smt. Asha Gupta & Family', relation: 'Bua' },
      { name: 'Shri Rajendra Mehta & Family', relation: 'Mama-Mami' },
    ],
  },
  { slug: 'riya-raman-codex', template: 'codex', previewToken: '8b1d5f3e7a2c4e96b0d4a8f1c6e37b25', coverPhoto: '/images/home/couple-2.jpg' },
];

await mongoose.connect(process.env.MONGO_URI);
for (const d of DEMOS) {
  const res = await Invitation.findOneAndUpdate({ slug: d.slug }, { $set: { ...shared, ...d } }, { upsert: true, new: true, runValidators: true });
  console.log(`✓ ${res.slug} (${res.template}) → /invite/${res.slug}?preview=${res.previewToken}`);
}
await mongoose.disconnect();
