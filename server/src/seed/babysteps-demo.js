/**
 * Adds BabySteps demo client galleries without touching anything else.
 *
 *   npm run seed:babysteps   (in server/)
 *
 *  - "baby-aarav"   password "babysteps2026" — inside the free period, a few favourites already picked
 *  - "baby-expired" password "babysteps2026" — free period over → renewal screen
 * Studio photos are served from /uploads/babysteps-demo-*.jpg; the rest are Unsplash baby photos.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ClientGallery } from '../models/index.js';

const u = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80`;
const studio = (n) => `/uploads/babysteps-demo-${n}.jpg`;
const DAY = 86400000;

const photos = [
  studio('newborn'),
  u('photo-1546015720-b8b30df5aa27'),
  studio('milestone'),
  u('photo-1544126592-807ade215a0b'),
  u('photo-1510154221590-ff63e90a136f'),
  studio('maternity'),
  u('photo-1617331140180-e8262094733a'),
  u('photo-1522771930-78848d9293e8'),
  studio('cake-smash'),
  u('photo-1535090467336-9501f96eef89'),
  u('photo-1566004100631-35d015d6a491'),
  studio('birthday'),
  u('photo-1530047625168-4b29bfbbe1fc'),
  u('photo-1491013516836-7db643ee125a'),
  studio('family'),
  u('photo-1555252333-9f8e92e65df9'),
];

await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/guide-photo-studio');
const passwordHash = await bcrypt.hash('babysteps2026', 10);

await ClientGallery.deleteMany({ slug: { $in: ['baby-aarav', 'baby-expired'] } });
await ClientGallery.create({
  slug: 'baby-aarav',
  brand: 'babysteps',
  title: 'Baby Aarav · Newborn & Milestones',
  clientName: 'Priya & Rohan Sharma',
  clientPhone: '',
  eventDate: new Date(Date.now() - 6 * DAY),
  passwordHash,
  passwordUpdatedAt: new Date(),
  cover: studio('newborn'),
  selectionLimit: 10,
  allowDownload: true,
  accessUntil: new Date(Date.now() + 84 * DAY),
  photos: photos.map((src, i) => ({ src, favorite: [0, 2, 5].includes(i) })),
});
await ClientGallery.create({
  slug: 'baby-expired',
  brand: 'babysteps',
  title: 'Baby Myra · Cake Smash',
  clientName: 'Demo Parents',
  passwordHash,
  passwordUpdatedAt: new Date(),
  cover: studio('cake-smash'),
  selectionLimit: 10,
  accessUntil: new Date(Date.now() - 3 * DAY),
  photos: photos.slice(0, 8).map((src) => ({ src })),
});
console.log('BabySteps demo galleries (password "babysteps2026"): "baby-aarav" (active), "baby-expired" (renewal screen)');
await mongoose.disconnect();
