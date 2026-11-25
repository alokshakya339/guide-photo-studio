/**
 * Small, idempotent data migrations run at server start (safe to run on every boot and on production).
 */
import bcrypt from 'bcryptjs';
import { Category, Package, Setting, Admin, BlogPost } from './models/index.js';
import { STARTER_POSTS } from './seed/blogPosts.js';

// Shoots that BabySteps by Guide (babystepsbyguide.com) now covers. Hidden on Guide Photo Studio, kept in admin.
const BABYSTEPS_SLUGS = ['maternity', 'baby', 'birthday'];

/**
 * Admin login from ADMIN_EMAIL / ADMIN_PASSWORD (Hostinger environment variables): created on first start, and the
 * password is updated whenever ADMIN_PASSWORD changes — so "change the variable and restart" resets it.
 */
async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || !password) { if (!(await Admin.exists({}))) console.warn('[admin] ADMIN_EMAIL / ADMIN_PASSWORD not set — no admin login yet'); return; }
  const admin = await Admin.findOne({ email });
  if (admin && (await bcrypt.compare(password, admin.passwordHash))) return;
  await Admin.updateOne({ email }, { $set: { email, passwordHash: await bcrypt.hash(password, 10) } }, { upsert: true });
  console.log(`[admin] Admin account ready: ${email}`);
}

export async function runMigrations() {
  await ensureAdmin();
  // 1) Older categories / packages have no "published" field yet: they were live, so mark them live.
  await Category.updateMany({ published: { $exists: false } }, { $set: { published: true } });
  await Package.updateMany({ published: { $exists: false } }, { $set: { published: true } });

  // 2) Once only: hide the categories and packages that moved to BabySteps. Admin can switch them back on.
  const key = 'migration:2026-11-hide-babysteps-overlap';
  if (!(await Setting.exists({ key }))) {
    const c = await Category.updateMany({ slug: { $in: BABYSTEPS_SLUGS } }, { $set: { published: false } });
    const p = await Package.updateMany({ category: { $in: BABYSTEPS_SLUGS } }, { $set: { published: false } });
    await Setting.create({ key, data: { at: new Date(), categories: c.modifiedCount, packages: p.modifiedCount } });
    console.log(`[migrate] hid ${c.modifiedCount} categories and ${p.modifiedCount} packages now covered by BabySteps`);
  }

  // 3) Once only: add the starter blog posts (SEO articles) — local and production alike. Only slugs that don't exist
  //    yet are inserted, and it never runs again, so posts edited or deleted in Admin → Blog stay that way.
  const blogKey = 'migration:2026-11-starter-blog';
  if (!(await Setting.exists({ key: blogKey }))) {
    const have = new Set((await BlogPost.find({ slug: { $in: STARTER_POSTS.map((p) => p.slug) } }).select('slug').lean()).map((p) => p.slug));
    const fresh = STARTER_POSTS.filter((p) => !have.has(p.slug));
    if (fresh.length) await BlogPost.insertMany(fresh.map((p) => ({ ...p, date: new Date(p.date), author: 'Guide Photo Studio', published: true })));
    await Setting.create({ key: blogKey, data: { at: new Date(), added: fresh.map((p) => p.slug) } });
    console.log(`[migrate] added ${fresh.length} starter blog posts`);
  }
}
