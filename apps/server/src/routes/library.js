import { store, db, findVideo, findUser, videoSummary, channelDetail } from '../db.js';
import { requireUser } from '../auth.js';
import { HttpError } from '../lib/http.js';
import { normalize } from '../lib/search.js';

function getVideoOr404(id) {
  const v = findVideo(id);
  if (!v) throw new HttpError(404, 'Видео олдсонгүй');
  return v;
}

export function registerLibraryRoutes(router) {

  router.get('/api/watch-later', (ctx) => {
    const user = requireUser(ctx);
    const items = db.watchLater
      .filter((w) => w.userId === user.id && findVideo(w.videoId))
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    return { videos: items.map((w) => ({ ...videoSummary(findVideo(w.videoId), user), addedAt: w.addedAt })) };
  });

  router.post('/api/watch-later', (ctx) => {
    const user = requireUser(ctx);
    const v = getVideoOr404(String(ctx.body.videoId || ''));
    if (!db.watchLater.some((w) => w.userId === user.id && w.videoId === v.id)) {
      db.watchLater.push({ userId: user.id, videoId: v.id, addedAt: new Date().toISOString() });
      store.save('watchLater');
    }
    return { inWatchLater: true };
  });

  router.delete('/api/watch-later/:videoId', (ctx) => {
    const user = requireUser(ctx);
    store.set('watchLater', db.watchLater.filter((w) => !(w.userId === user.id && w.videoId === ctx.params.videoId)));
    return { inWatchLater: false };
  });

  router.get('/api/history', (ctx) => {
    const user = requireUser(ctx);
    const q = normalize(ctx.query.q || '');
    const items = db.history
      .filter((h) => h.userId === user.id)
      .map((h) => ({ h, v: findVideo(h.videoId) }))
      .filter(({ v }) => v && (!q || normalize(v.title).includes(q)))
      .sort((a, b) => b.h.watchedAt.localeCompare(a.h.watchedAt));
    return {
      items: items.map(({ h, v }) => ({ video: videoSummary(v, user), watchedAt: h.watchedAt, position: h.position })),
    };
  });

  router.post('/api/history', (ctx) => {
    const user = requireUser(ctx);
    const v = getVideoOr404(String(ctx.body.videoId || ''));
    const position = Math.max(0, Math.min(Number(ctx.body.position) || 0, v.duration));
    const now = new Date().toISOString();
    const existing = db.history.find((h) => h.userId === user.id && h.videoId === v.id);
    if (existing) {
      existing.position = position;
      existing.watchedAt = now;
    } else {
      db.history.push({ userId: user.id, videoId: v.id, position, watchedAt: now });
    }
    store.save('history');
    return { ok: true, position };
  });

  router.delete('/api/history/:videoId', (ctx) => {
    const user = requireUser(ctx);
    store.set('history', db.history.filter((h) => !(h.userId === user.id && h.videoId === ctx.params.videoId)));
    return { ok: true };
  });

  router.delete('/api/history', (ctx) => {
    const user = requireUser(ctx);
    store.set('history', db.history.filter((h) => h.userId !== user.id));
    return { ok: true };
  });

  router.get('/api/liked', (ctx) => {
    const user = requireUser(ctx);
    const items = db.reactions
      .filter((r) => r.userId === user.id && r.value === 1 && findVideo(r.videoId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { videos: items.map((r) => videoSummary(findVideo(r.videoId), user)) };
  });

  router.get('/api/subscriptions', (ctx) => {
    const user = requireUser(ctx);
    const subs = db.subscriptions.filter((s) => s.userId === user.id);
    const ids = new Set(subs.map((s) => s.channelId));
    const channels = subs.map((s) => findUser(s.channelId)).filter(Boolean).map((c) => channelDetail(c, user));
    const videos = db.videos
      .filter((v) => ids.has(v.channelId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((v) => videoSummary(v, user));
    return { channels, videos };
  });
}
