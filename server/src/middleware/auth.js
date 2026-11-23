import jwt from 'jsonwebtoken';

export function signToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/** Requires a valid admin JWT. */
export function requireAdmin(req, res, next) {
  try {
    const payload = jwt.verify(readToken(req) || '', process.env.JWT_SECRET);
    if (payload.role !== 'admin') throw new Error('not admin');
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Admin login required' });
  }
}

/** Requires a JWT issued for the gallery named in :slug (admins may also pass). */
export function requireGalleryAccess(req, res, next) {
  try {
    const payload = jwt.verify(readToken(req) || '', process.env.JWT_SECRET);
    const ok = payload.role === 'admin' || (payload.role === 'client' && payload.gallery === req.params.slug);
    if (!ok) throw new Error('wrong gallery');
    req.viewer = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Please enter the gallery password' });
  }
}
