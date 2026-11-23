/**
 * Creates/updates the admin account from .env. Never deletes your content.
 *   npm run seed            (in babysteps/server)
 * Outside production it also adds demo galleries (password "babysteps2026"): "baby-aarav" and "baby-expired".
 * In production demos are skipped unless you run:  npm run seed -- --demo
 */
import './env.js'; // must stay first
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Admin, ClientGallery } from './models.js';
import { saveImage } from './storage.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DAY = 86400000;
await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/babysteps');

const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  await Admin.findOneAndUpdate({ email: ADMIN_EMAIL.toLowerCase() }, { email: ADMIN_EMAIL.toLowerCase(), passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10) }, { upsert: true });
  console.log(`Admin account ready: ${ADMIN_EMAIL}`);
} else {
  console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set in server/.env — no admin account created');
}

const wantDemo = process.env.NODE_ENV !== 'production' || process.argv.includes('--demo');
if (!wantDemo) {
  console.log('Production: demo galleries skipped (use "npm run seed -- --demo" to add them).');
  await mongoose.disconnect();
  process.exit(0);
}

// Store the studio photos as uploads so demo galleries load them like real client uploads.
const names = ['newborn', 'maternity', 'milestone', 'cake-smash', 'birthday', 'family'];
for (const n of names) {
  const from = [path.resolve(here, '../../public/images', `${n}.jpg`), path.resolve(here, '../../dist/images', `${n}.jpg`)].find((f) => fs.existsSync(f));
  if (from) await saveImage(fs.readFileSync(from), `demo-${n}.jpg`, 'image/jpeg');
}
const studio = (n) => `/uploads/demo-${n}.jpg`;
const u = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80`;
const photos = [
  studio('newborn'), u('photo-1546015720-b8b30df5aa27'), studio('milestone'), u('photo-1544126592-807ade215a0b'),
  u('photo-1510154221590-ff63e90a136f'), studio('maternity'), u('photo-1617331140180-e8262094733a'), u('photo-1522771930-78848d9293e8'),
  studio('cake-smash'), u('photo-1535090467336-9501f96eef89'), u('photo-1566004100631-35d015d6a491'), studio('birthday'),
  u('photo-1530047625168-4b29bfbbe1fc'), u('photo-1491013516836-7db643ee125a'), studio('family'), u('photo-1555252333-9f8e92e65df9'),
];
const passwordHash = await bcrypt.hash('babysteps2026', 10);
await ClientGallery.deleteMany({ slug: { $in: ['baby-aarav', 'baby-expired'] } });
await ClientGallery.create({
  slug: 'baby-aarav', title: 'Baby Aarav · Newborn & Milestones', clientName: 'Priya & Rohan Sharma',
  eventDate: new Date(Date.now() - 6 * DAY), passwordHash, passwordUpdatedAt: new Date(), cover: studio('newborn'),
  selectionLimit: 10, allowDownload: true, accessUntil: new Date(Date.now() + 84 * DAY),
  photos: photos.map((src, i) => ({ src, favorite: [0, 2, 5].includes(i) })),
});
await ClientGallery.create({
  slug: 'baby-expired', title: 'Baby Myra · Cake Smash', clientName: 'Demo Parents', passwordHash, passwordUpdatedAt: new Date(),
  cover: studio('cake-smash'), selectionLimit: 10, accessUntil: new Date(Date.now() - 3 * DAY), photos: photos.slice(0, 8).map((src) => ({ src })),
});
console.log('Demo galleries (password "babysteps2026"): "baby-aarav" (active), "baby-expired" (renewal screen)');
await mongoose.disconnect();
