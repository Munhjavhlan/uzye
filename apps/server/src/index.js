import http from 'node:http';
import path from 'node:path';
import { config } from './config.js';
import { Router } from './lib/router.js';
import { HttpError, sendJson, readJson, parseCookies } from './lib/http.js';
import { resolveSafe, fileStat, sendFile } from './lib/static.js';
import { flushAll } from './db.js';
import { SESSION_COOKIE, userFromToken } from './auth.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerVideoRoutes } from './routes/videos.js';
import { registerCommentRoutes } from './routes/comments.js';
import { registerChannelRoutes } from './routes/channels.js';
import { registerLibraryRoutes } from './routes/library.js';

const router = new Router();
registerAuthRoutes(router);
registerVideoRoutes(router);
registerCommentRoutes(router);
registerChannelRoutes(router);
registerLibraryRoutes(router);

async function handleApi(req, res, url) {
  const match = router.match(req.method, url.pathname);
  if (!match) throw new HttpError(404, 'API олдсонгүй');
  if (match.methodNotAllowed) throw new HttpError(405, 'Энэ method зөвшөөрөгдөөгүй');

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];

  const ctx = {
    req,
    params: match.params,
    query: Object.fromEntries(url.searchParams),
    body: await readJson(req),
    token,
    user: userFromToken(token),
    ip: req.socket.remoteAddress,
    status: 200,
    cookies: [],
    setCookie(c) {
      this.cookies.push(c);
    },
  };

  const data = await match.handler(ctx);
  if (ctx.cookies.length) res.setHeader('Set-Cookie', ctx.cookies);
  sendJson(res, ctx.status, data);
}

function handleStatic(req, res, url) {
  const p = url.pathname;
  let full = null;
  let cacheControl = 'no-cache';

  if (p.startsWith('/media/')) {
    full = resolveSafe(config.mediaDir, p.slice('/media'.length));
    cacheControl = 'public, max-age=86400';
  } else if (p.startsWith('/pkg/')) {
    const [, , name, ...rest] = p.split('/');
    const dir = config.packages[name];
    if (dir) full = resolveSafe(dir, '/' + rest.join('/'));
  } else {
    full = resolveSafe(config.webDir, p === '/' ? '/index.html' : p);
  }

  const st = full && fileStat(full);
  if (st) return sendFile(req, res, full, st, { cacheControl });

  if (!path.extname(p) && !p.startsWith('/media/') && !p.startsWith('/pkg/')) {
    const index = path.join(config.webDir, 'index.html');
    return sendFile(req, res, index, fileStat(index));
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Олдсонгүй');
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const started = Date.now();
  try {
    if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
    else handleStatic(req, res, url);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error(err);
    if (!res.headersSent) sendJson(res, status, { error: status === 500 ? 'Серверийн алдаа' : err.message });
  } finally {
    if (url.pathname.startsWith('/api/') && process.env.QUIET !== '1') {
      console.log(`${req.method} ${url.pathname}${url.search} → ${res.statusCode} (${Date.now() - started}мс)`);
    }
  }
});

server.listen(config.port, () => {
  console.log(`\n▶  Үзье ажиллаж байна: http://localhost:${config.port}\n`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    flushAll();
    server.close();
    process.exit(0);
  });
}
