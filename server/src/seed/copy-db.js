/**
 * Copy every collection from one MongoDB database to another — e.g. your local content into MongoDB Atlas
 * before going live. Nothing is deleted from the source.
 *
 *   SOURCE_URI="mongodb://127.0.0.1:27017/guide-photo-studio" \
 *   TARGET_URI="mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/guide-photo-studio" \
 *   npm run db:copy --prefix server
 *
 * Refuses to write into a target that already has data, unless you add --replace (which first empties the
 * target collections that also exist in the source).
 */
import mongoose from 'mongoose';

const { SOURCE_URI, TARGET_URI } = process.env;
const replace = process.argv.includes('--replace');
const hide = (u) => String(u).replace(/\/\/([^:@/]+):([^@]+)@/, '//$1:•••@');

if (!SOURCE_URI || !TARGET_URI) { console.error('Set SOURCE_URI and TARGET_URI (see the top of this file).'); process.exit(1); }
if (SOURCE_URI === TARGET_URI) { console.error('SOURCE_URI and TARGET_URI are the same database.'); process.exit(1); }

const { MongoClient } = mongoose.mongo;
const src = new MongoClient(SOURCE_URI);
const dst = new MongoClient(TARGET_URI);
try {
  await Promise.all([src.connect(), dst.connect()]);
  const from = src.db(); const to = dst.db();
  console.log(`From: ${hide(SOURCE_URI)}\nTo:   ${hide(TARGET_URI)}`);
  const cols = (await from.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).filter((n) => !n.startsWith('system.'));
  const existing = new Set((await to.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  const busy = [];
  for (const n of cols) if (existing.has(n) && (await to.collection(n).estimatedDocumentCount()) > 0) busy.push(n);
  if (busy.length && !replace) {
    console.error(`The target already has data in: ${busy.join(', ')}.\nNothing was copied. Re-run with --replace to overwrite those collections.`);
    process.exit(2);
  }
  for (const n of cols) {
    const docs = await from.collection(n).find({}).toArray();
    if (replace) await to.collection(n).deleteMany({});
    if (docs.length) {
      for (let i = 0; i < docs.length; i += 500) await to.collection(n).insertMany(docs.slice(i, i + 500), { ordered: false });
    }
    const idx = (await from.collection(n).indexes()).filter((x) => x.name !== '_id_');
    for (const { key, name, v, ns, ...opts } of idx) await to.collection(n).createIndex(key, { name, ...opts }).catch(() => {});
    console.log(`  ✓ ${n}: ${docs.length}`);
  }
  console.log('Done.');
} finally {
  await Promise.allSettled([src.close(), dst.close()]);
}
