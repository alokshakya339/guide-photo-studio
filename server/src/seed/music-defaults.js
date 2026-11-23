/**
 * Default music library — public-domain / CC0 recordings from Wikimedia Commons (no attribution required),
 * stored in the studio's R2 bucket. Sources: Mendelssohn Wedding March (European Archive via Musopen, PD);
 * Bach Air (The U.S. Air Force Strings, PD US-government work); Bach BWV 147 (Orchestra Gli Armonici via Musopen, CC0);
 * Debussy Clair de lune (Laurens Goedhart, PD dedication); Satie Gymnopédie No. 1 (Robin Alciatore via Musopen, PD);
 * Schubert Ave Maria (Free Tim, CC0).
 */
export const DEFAULT_MUSIC = [
  { title: 'Wedding March', artist: 'Felix Mendelssohn · European Archive', mood: 'Festive', url: 'https://pub-03c4e03c4f4e48f49b7937a026594510.r2.dev/guide-invites/music-library/6f021a1326cb8c3c.mp3' },
  { title: 'Air on the G String', artist: 'J.S. Bach · The Air Force Strings', mood: 'Calm', url: 'https://pub-03c4e03c4f4e48f49b7937a026594510.r2.dev/guide-invites/music-library/be5e29da38a509e2.mp3' },
  { title: 'Jesu, Joy of Man’s Desiring', artist: 'J.S. Bach · Orchestra Gli Armonici', mood: 'Classical', url: 'https://pub-03c4e03c4f4e48f49b7937a026594510.r2.dev/guide-invites/music-library/a036f2ca92faf820.mp3' },
  { title: 'Clair de Lune', artist: 'Claude Debussy · Laurens Goedhart, piano', mood: 'Romantic', url: 'https://pub-03c4e03c4f4e48f49b7937a026594510.r2.dev/guide-invites/music-library/1317d706dcc3635c.mp3' },
  { title: 'Gymnopédie No. 1', artist: 'Erik Satie · Robin Alciatore, piano', mood: 'Calm', url: 'https://pub-03c4e03c4f4e48f49b7937a026594510.r2.dev/guide-invites/music-library/92309c0163248257.mp3' },
  { title: 'Ave Maria', artist: 'Franz Schubert · Free Tim', mood: 'Romantic', url: 'https://pub-03c4e03c4f4e48f49b7937a026594510.r2.dev/guide-invites/music-library/d4e541e2dd70c2f6.mp3' },
].map((t, i) => ({ ...t, published: true, order: i + 1 }));
