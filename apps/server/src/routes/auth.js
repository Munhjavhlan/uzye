import { randomBytes } from 'node:crypto';
import { store, db, publicUser } from '../db.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { createSession, destroySession } from '../auth.js';
import { HttpError } from '../lib/http.js';

const COLORS = ['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#db2777', '#4f46e5', '#65a30d'];

export function registerAuthRoutes(router) {
  router.post('/api/auth/register', (ctx) => {
    const username = String(ctx.body.username || '').trim().toLowerCase();
    const password = String(ctx.body.password || '');
    const displayName = String(ctx.body.displayName || '').trim() || username;

    if (!/^[a-z0-9_.]{3,20}$/.test(username)) {
      throw new HttpError(400, 'Хэрэглэгчийн нэр 3-20 тэмдэгт, зөвхөн латин үсэг, тоо, _ . байна');
    }
    if (password.length < 6) throw new HttpError(400, 'Нууц үг хамгийн багадаа 6 тэмдэгт байна');
    if (displayName.length > 40) throw new HttpError(400, 'Нэр хэт урт байна');
    if (db.users.some((u) => u.username === username)) throw new HttpError(409, 'Энэ нэр бүртгэлтэй байна');

    const user = {
      id: randomBytes(8).toString('base64url'),
      username,
      displayName,
      passwordHash: hashPassword(password),
      avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
      description: '',
      baseSubscribers: 0,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    store.save('users');

    ctx.setCookie(createSession(user.id));
    ctx.status = 201;
    return { user: publicUser(user) };
  });

  router.post('/api/auth/login', (ctx) => {
    const username = String(ctx.body.username || '').trim().toLowerCase();
    const password = String(ctx.body.password || '');
    const user = db.users.find((u) => u.username === username);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new HttpError(401, 'Нэр эсвэл нууц үг буруу байна');
    }
    ctx.setCookie(createSession(user.id));
    return { user: publicUser(user) };
  });

  router.post('/api/auth/logout', (ctx) => {
    ctx.setCookie(destroySession(ctx.token));
    return { ok: true };
  });

  router.get('/api/auth/me', (ctx) => ({ user: publicUser(ctx.user) }));
}
