import { randomBytes } from 'node:crypto';
import { store, db, findVideo, findUser, publicUser } from '../db.js';
import { requireUser } from '../auth.js';
import { HttpError } from '../lib/http.js';

function commentDto(c, viewer, video) {
  const likes = (c.baseLikes || 0) + db.commentLikes.filter((l) => l.commentId === c.id).length;
  return {
    id: c.id,
    text: c.text,
    createdAt: c.createdAt,
    parentId: c.parentId,
    author: publicUser(findUser(c.userId)),
    isCreator: c.userId === video.channelId,
    likes,
    liked: Boolean(viewer) && db.commentLikes.some((l) => l.commentId === c.id && l.userId === viewer.id),
    canDelete: Boolean(viewer) && (viewer.id === c.userId || viewer.id === video.channelId),
  };
}

export function registerCommentRoutes(router) {
  router.get('/api/videos/:id/comments', (ctx) => {
    const video = findVideo(ctx.params.id);
    if (!video) throw new HttpError(404, 'Видео олдсонгүй');
    const all = db.comments.filter((c) => c.videoId === video.id);
    const dtos = all.map((c) => commentDto(c, ctx.user, video));

    const top = dtos.filter((c) => !c.parentId);
    const replies = dtos.filter((c) => c.parentId);
    if (ctx.query.sort === 'new') top.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else top.sort((a, b) => b.likes - a.likes || b.createdAt.localeCompare(a.createdAt));

    const comments = top.map((c) => ({
      ...c,
      replies: replies.filter((r) => r.parentId === c.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }));
    return { count: all.length, comments };
  });

  router.post('/api/videos/:id/comments', (ctx) => {
    const user = requireUser(ctx);
    const video = findVideo(ctx.params.id);
    if (!video) throw new HttpError(404, 'Видео олдсонгүй');
    const text = String(ctx.body.text || '').trim();
    if (!text) throw new HttpError(400, 'Сэтгэгдэл хоосон байна');
    if (text.length > 2000) throw new HttpError(400, 'Сэтгэгдэл 2000 тэмдэгтээс хэтэрсэн');

    let parentId = null;
    if (ctx.body.parentId) {
      const parent = db.comments.find((c) => c.id === ctx.body.parentId && c.videoId === video.id);
      if (!parent) throw new HttpError(404, 'Хариулах сэтгэгдэл олдсонгүй');
      parentId = parent.parentId || parent.id;
    }

    const c = {
      id: randomBytes(8).toString('base64url'),
      videoId: video.id,
      userId: user.id,
      parentId,
      text,
      baseLikes: 0,
      createdAt: new Date().toISOString(),
    };
    db.comments.push(c);
    store.save('comments');
    ctx.status = 201;
    return { comment: { ...commentDto(c, user, video), replies: [] } };
  });

  router.delete('/api/comments/:id', (ctx) => {
    const user = requireUser(ctx);
    const c = db.comments.find((x) => x.id === ctx.params.id);
    if (!c) throw new HttpError(404, 'Сэтгэгдэл олдсонгүй');
    const video = findVideo(c.videoId);
    if (c.userId !== user.id && video?.channelId !== user.id) throw new HttpError(403, 'Устгах эрхгүй');
    const removed = new Set([c.id, ...db.comments.filter((x) => x.parentId === c.id).map((x) => x.id)]);
    store.set('comments', db.comments.filter((x) => !removed.has(x.id)));
    store.set('commentLikes', db.commentLikes.filter((l) => !removed.has(l.commentId)));
    return { ok: true, removed: removed.size };
  });

  router.post('/api/comments/:id/like', (ctx) => {
    const user = requireUser(ctx);
    const c = db.comments.find((x) => x.id === ctx.params.id);
    if (!c) throw new HttpError(404, 'Сэтгэгдэл олдсонгүй');
    const existing = db.commentLikes.find((l) => l.commentId === c.id && l.userId === user.id);
    if (existing) store.set('commentLikes', db.commentLikes.filter((l) => l !== existing));
    else {
      db.commentLikes.push({ commentId: c.id, userId: user.id });
      store.save('commentLikes');
    }
    const likes = (c.baseLikes || 0) + db.commentLikes.filter((l) => l.commentId === c.id).length;
    return { liked: !existing, likes };
  });
}
