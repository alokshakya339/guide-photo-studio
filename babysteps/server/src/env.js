// Loads settings before anything else: ./.env (cwd) and server/.env, whichever exist.
// On Hostinger, values come from the panel's environment variables instead (never overwritten here).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env'), quiet: true });
