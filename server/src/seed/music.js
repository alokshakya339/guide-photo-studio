/**
 * Adds the default music library (public-domain / CC0 tracks) to a database — safe on production:
 * it only fills an EMPTY library and touches nothing else.
 *
 *   MONGO_URI="<Atlas URI>" npm run seed:music --prefix server
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { MusicTrack } from '../models/index.js';
import { DEFAULT_MUSIC } from './music-defaults.js';

await mongoose.connect(process.env.MONGO_URI);
const existing = await MusicTrack.countDocuments();
if (existing) console.log(`Music library: kept existing (${existing} tracks) — nothing changed.`);
else { await MusicTrack.insertMany(DEFAULT_MUSIC); console.log(`Music library: added ${DEFAULT_MUSIC.length} tracks.`); }
await mongoose.disconnect();
