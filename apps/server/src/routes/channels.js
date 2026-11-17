import { store, db, findChannel, channelDetail, videoSummary, subscriberCount } from '../db.js';
import { requireUser } from '../auth.js';
import { HttpError } from '../lib/http.js';

function getChannelOr404(key) {
  const c = findChannel(key);
  if (!c) throw new HttpError(404, 'Суваг олдсонгүй');
  return c;
}

export function registerChannelRoutes(router) {
  router.get('/api/channels/:key', (ctx) => {
    const channel = getChannelOr404(ctx.params.key);
    let videos = db.videos.filter((v) => v.channelId === channel.id);
    if (ctx.query.sort === 'popular') videos.sort((a, b) => (db.views[b.id] || 0) - (db.views[a.id] || 0));
    else videos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      channel: channelDetail(channel, ctx.user),
      videos: videos.map((v) => videoSummary(v, ctx.user)),
    };
  });

  router.post('/api/channels/:key/subscribe', (ctx) => {
    const user = requireUser(ctx);
    const channel = getChannelOr404(ctx.params.key);
    if (channel.id === user.id) throw new HttpError(400, 'Өөрийн сувгийг захиалах боломжгүй');
    const exists = db.subscriptions.some((s) => s.userId === user.id && s.channelId === channel.id);
    if (!exists) {
      db.subscriptions.push({ userId: user.id, channelId: channel.id, createdAt: new Date().toISOString() });
      store.save('subscriptions');
    }
    return { subscribed: true, subscribers: subscriberCount(channel) };
  });

  router.delete('/api/channels/:key/subscribe', (ctx) => {
    const user = requireUser(ctx);
    const channel = getChannelOr404(ctx.params.key);
    store.set('subscriptions', db.subscriptions.filter((s) => !(s.userId === user.id && s.channelId === channel.id)));
    return { subscribed: false, subscribers: subscriberCount(channel) };
  });
}
