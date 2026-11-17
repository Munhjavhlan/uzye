import { randomBytes, createHash } from 'node:crypto';
import { config } from './config.js';
import { store, db, findUser } from './db.js';
import { HttpError, cookie } from './lib/http.js';

export const SESSION_COOKIE = 'sid';

const hashToken = (t) => createHash('sha256').update(t).digest('hex');

export function createSession(userId) {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  db.sessions.push({
    tokenHash: hashToken(token),
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + config.sessionMaxAgeMs).toISOString(),
  });
  store.save('sessions');
  return cookie(SESSION_COOKIE, token, { maxAge: config.sessionMaxAgeMs });
}

export function destroySession(token) {
  if (token) {
    const h = hashToken(token);
    store.set('sessions', db.sessions.filter((s) => s.tokenHash !== h));
  }
  return cookie(SESSION_COOKIE, '', { maxAge: 0 });
}

export function userFromToken(token) {
  if (!token) return null;
  const h = hashToken(token);
  const s = db.sessions.find((x) => x.tokenHash === h);
  if (!s) return null;
  if (new Date(s.expiresAt).getTime() < Date.now()) return null;
  return findUser(s.userId) || null;
}

export function requireUser(ctx) {
  if (!ctx.user) throw new HttpError(401, 'Энэ үйлдлийг хийхийн тулд нэвтэрнэ үү');
  return ctx.user;
}
