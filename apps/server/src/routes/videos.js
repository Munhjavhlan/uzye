import { store, db, search, findVideo, readManifest, videoSummary, videoDetail, reactionCounts, channelDetail, findUser } from '../db.js';
import { requireUser } from '../auth.js';
import { HttpError } from '../lib/http.js';

function getVideoOr404(id) {
  const v = findVideo(id);
  if (!v) throw new HttpError(404, 'Видео олдсонгүй');
  return v;
}

const recentViews = new Map();
const VIEW_WINDOW_MS = 30 * 60 * 1000;

export function registerVideoRoutes(router) {
  router.get('/api/videos', (ctx) => {
    let list = db.videos;
    const cat = ctx.query.category;
    if (cat && cat !== 'all') list = list.filter((v) => v.category === cat);
    list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { videos: list.map((v) => videoSummary(v, ctx.user)) };
  });

  router.get('/api/videos/:id', (ctx) => {
    const v = getVideoOr404(ctx.params.id);
    return { video: videoDetail(v, ctx.user) };
  });

  router.get('/api/videos/:id/related', (ctx) => {
    const v = getVideoOr404(ctx.params.id);
    const scored = db.videos
      .filter((x) => x.id !== v.id)
      .map((x) => ({
        x,
        score: (x.channelId === v.channelId ? 2 : 0) + (x.category === v.category ? 1 : 0) + Math.log10(1 + (db.views[x.id] || 0)) / 10,
      }))
      .sort((a, b) => b.score - a.score);
    return { videos: scored.map((s) => videoSummary(s.x, ctx.user)) };
  });

  router.get('/api/videos/:id/manifest', (ctx) => {
    const v = getVideoOr404(ctx.params.id);
    const m = readManifest(v.id);
    if (!m) throw new HttpError(404, 'Видеоны сегментүүд олдсонгүй (npm run seed ажиллуулна уу)');
    const base = `/media/videos/${v.id}/`;
    return {
      ...m,
      init: base + m.init,
      segments: m.segments.map((s) => ({ ...s, url: base + s.url })),
    };
  });

  router.post('/api/videos/:id/view', (ctx) => {
    const v = getVideoOr404(ctx.params.id);
    const who = ctx.user ? `u:${ctx.user.id}` : `ip:${ctx.ip}`;
    const key = `${who}:${v.id}`;
    const last = recentViews.get(key) || 0;
    if (Date.now() - last > VIEW_WINDOW_MS) {
      recentViews.set(key, Date.now());
      db.views[v.id] = (db.views[v.id] || 0) + 1;
      store.save('views');
    }
    return { views: db.views[v.id] };
  });

  router.post('/api/videos/:id/reaction', (ctx) => {
    const user = requireUser(ctx);
    const v = getVideoOr404(ctx.params.id);
    const value = Number(ctx.body.value);
    if (![1, -1, 0].includes(value)) throw new HttpError(400, 'value нь 1, -1, 0 байх ёстой');

    const rest = db.reactions.filter((r) => !(r.userId === user.id && r.videoId === v.id));
    if (value !== 0) rest.push({ userId: user.id, videoId: v.id, value, createdAt: new Date().toISOString() });
    store.set('reactions', rest);

    return { ...reactionCounts(v), myReaction: value };
  });

  router.get('/api/suggest', (ctx) => {
    const q = String(ctx.query.q || '').slice(0, 100);
    return { query: q, suggestions: search.suggest(q, 8) };
  });

  router.get('/api/search', (ctx) => {
    const q = String(ctx.query.q || '').slice(0, 100);
    const ids = search.searchVideos(q);
    const videos = ids.map((id) => videoSummary(findVideo(id), ctx.user));
    const nq = q.trim().toLowerCase();
    const channels = nq
      ? db.users
          .filter((u) => db.videos.some((v) => v.channelId === u.id))
          .filter((u) => u.displayName.toLowerCase().includes(nq) || u.username.includes(nq))
          .map((u) => channelDetail(findUser(u.id), ctx.user))
      : [];
    return { query: q, videos, channels };
  });
}
