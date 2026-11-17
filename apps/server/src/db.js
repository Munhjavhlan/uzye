import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { JsonStore } from './lib/store.js';
import { SearchIndex } from './lib/search.js';

export const store = new JsonStore(config.dataDir);

store.load('videos', []);
store.load('users', []);
store.load('sessions', []);
store.load('views', {});
store.load('reactions', []);
store.load('comments', []);
store.load('commentLikes', []);
store.load('subscriptions', []);
store.load('watchLater', []);
store.load('history', []);

export const db = {
  get videos() { return store.get('videos'); },
  get users() { return store.get('users'); },
  get sessions() { return store.get('sessions'); },
  get views() { return store.get('views'); },
  get reactions() { return store.get('reactions'); },
  get comments() { return store.get('comments'); },
  get commentLikes() { return store.get('commentLikes'); },
  get subscriptions() { return store.get('subscriptions'); },
  get watchLater() { return store.get('watchLater'); },
  get history() { return store.get('history'); },
};

export const search = new SearchIndex({
  getVideos: () => db.videos,
  getUser: (id) => db.users.find((u) => u.id === id),
  getViews: (id) => db.views[id] || 0,
});

export const findVideo = (id) => db.videos.find((v) => v.id === id);
export const findUser = (id) => db.users.find((u) => u.id === id);
export const findChannel = (key) =>
  db.users.find((u) => u.id === key || u.username === String(key).replace(/^@/, '').toLowerCase());

const manifestCache = new Map();
export function readManifest(id) {
  if (!manifestCache.has(id)) {
    const file = path.join(config.mediaDir, 'videos', id, 'manifest.json');
    if (!fs.existsSync(file)) return null;
    manifestCache.set(id, JSON.parse(fs.readFileSync(file, 'utf8')));
  }
  return manifestCache.get(id);
}

export function subscriberCount(channel) {
  return (channel.baseSubscribers || 0) + db.subscriptions.filter((s) => s.channelId === channel.id).length;
}
export function isSubscribed(userId, channelId) {
  return Boolean(userId) && db.subscriptions.some((s) => s.userId === userId && s.channelId === channelId);
}
export function reactionCounts(video) {
  let likes = video.baseLikes || 0;
  let dislikes = 0;
  for (const r of db.reactions) {
    if (r.videoId !== video.id) continue;
    if (r.value === 1) likes++;
    else dislikes++;
  }
  return { likes, dislikes };
}

export function publicUser(u) {
  if (!u) return null;
  return { id: u.id, username: u.username, displayName: u.displayName, avatarColor: u.avatarColor };
}

export function videoSummary(v, viewer) {
  const channel = findUser(v.channelId);
  const out = {
    id: v.id,
    title: v.title,
    duration: v.duration,
    createdAt: v.createdAt,
    category: v.category,
    views: db.views[v.id] || 0,
    thumbnail: `/media/videos/${v.id}/thumbnail.jpg`,
    channel: publicUser(channel),
    inWatchLater: false,
    progress: 0,
  };
  if (viewer) {
    out.inWatchLater = db.watchLater.some((w) => w.userId === viewer.id && w.videoId === v.id);
    const h = db.history.find((x) => x.userId === viewer.id && x.videoId === v.id);
    if (h) out.progress = Math.min(1, h.position / v.duration);
  }
  return out;
}

export function videoDetail(v, viewer) {
  const channel = findUser(v.channelId);
  const { likes, dislikes } = reactionCounts(v);
  const mine = viewer && db.reactions.find((r) => r.userId === viewer.id && r.videoId === v.id);
  const h = viewer && db.history.find((x) => x.userId === viewer.id && x.videoId === v.id);
  return {
    ...videoSummary(v, viewer),
    description: v.description,
    tags: v.tags,
    likes,
    dislikes,
    myReaction: mine ? mine.value : 0,
    resumeAt: h && h.position < v.duration - 5 ? h.position : 0,
    commentCount: db.comments.filter((c) => c.videoId === v.id).length,
    channel: {
      ...publicUser(channel),
      subscribers: subscriberCount(channel),
      subscribed: isSubscribed(viewer?.id, channel.id),
    },
  };
}

export function channelDetail(u, viewer) {
  return {
    ...publicUser(u),
    description: u.description || '',
    createdAt: u.createdAt,
    subscribers: subscriberCount(u),
    subscribed: isSubscribed(viewer?.id, u.id),
    videoCount: db.videos.filter((v) => v.channelId === u.id).length,
    isMe: viewer?.id === u.id,
  };
}

export function flushAll() {
  store.flushAll();
}
