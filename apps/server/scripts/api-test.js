import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PORT = 3999;
const BASE = `http://localhost:${PORT}`;
let server;
let tmp;
let cookie = '';

async function call(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null, headers: res.headers };
}

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uzye-test-'));
  fs.cpSync(path.join(ROOT, 'data'), tmp, { recursive: true });
  server = spawn(process.execPath, [path.join(ROOT, 'apps/server/src/index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: tmp, QUIET: '1' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(BASE + '/api/auth/me');
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error('Сервер асаагүй');
});

after(async () => {
  await new Promise((resolve) => {
    server.once('exit', resolve);
    server.kill();
  });
  fs.rmSync(tmp, { recursive: true, force: true });
});

let videoId;

test('Видеоны жагсаалт ирнэ', async () => {
  const { status, data } = await call('GET', '/api/videos');
  assert.equal(status, 200);
  assert.ok(data.videos.length >= 10);
  videoId = data.videos[0].id;
});

test('Шаардлага 1: Autocomplete — бичиж буй үгээр нэр санал болгоно', async () => {
  const { data } = await call('GET', '/api/suggest?q=' + encodeURIComponent('хөв'));
  assert.ok(data.suggestions.some((s) => s.startsWith('Хөвсгөл')), JSON.stringify(data));
  const multi = await call('GET', '/api/suggest?q=' + encodeURIComponent('game li'));
  assert.ok(multi.data.suggestions[0].includes('Game of Life'));
});

test('Шаардлага 2: Stream — manifest сегментүүдтэй, сегмент Range дэмжинэ', async () => {
  const { data: m } = await call('GET', `/api/videos/${videoId}/manifest`);
  assert.ok(m.segments.length > 3, 'олон сегменттэй');
  assert.match(m.mime, /avc1/);
  const seg = await fetch(BASE + m.segments[1].url);
  const bytes = (await seg.arrayBuffer()).byteLength;
  const total = m.segments.reduce((s, x) => s + x.size, 0);
  assert.ok(bytes < total / 2);
  const part = await fetch(BASE + m.segments[0].url, { headers: { Range: 'bytes=0-99' } });
  assert.equal(part.status, 206);
  assert.equal((await part.arrayBuffer()).byteLength, 100);
});

test('Нэвтрээгүй үед watch later 401 буцаана', async () => {
  const { status } = await call('POST', '/api/watch-later', { videoId });
  assert.equal(status, 401);
});

test('Бүртгүүлэх ба нэвтрэх', async () => {
  const reg = await call('POST', '/api/auth/register', { username: 'tester', password: 'secret12', displayName: 'Тестер' });
  assert.equal(reg.status, 201);
  const me = await call('GET', '/api/auth/me');
  assert.equal(me.data.user.username, 'tester');
});

test('Шаардлага 3: Watch later — нэмэх, жагсаалтад гарах, хасах', async () => {
  await call('POST', '/api/watch-later', { videoId });
  let list = await call('GET', '/api/watch-later');
  assert.deepEqual(list.data.videos.map((v) => v.id), [videoId]);
  await call('DELETE', `/api/watch-later/${videoId}`);
  list = await call('GET', '/api/watch-later');
  assert.equal(list.data.videos.length, 0);
});

test('Шаардлага 4: History — үзсэн видео байрлалтайгаа хадгалагдана', async () => {
  await call('POST', '/api/history', { videoId, position: 12.5 });
  const { data } = await call('GET', '/api/history');
  assert.equal(data.items[0].video.id, videoId);
  assert.equal(data.items[0].position, 12.5);
  const detail = await call('GET', `/api/videos/${videoId}`);
  assert.equal(detail.data.video.resumeAt, 12.5);
});

test('Like, comment, subscribe', async () => {
  const like = await call('POST', `/api/videos/${videoId}/reaction`, { value: 1 });
  assert.equal(like.data.myReaction, 1);
  const c = await call('POST', `/api/videos/${videoId}/comments`, { text: 'Сайн видео' });
  assert.equal(c.status, 201);
  const reply = await call('POST', `/api/videos/${videoId}/comments`, { text: 'Хариулт', parentId: c.data.comment.id });
  assert.equal(reply.data.comment.parentId, c.data.comment.id);
  const { data: v } = await call('GET', `/api/videos/${videoId}`);
  const sub = await call('POST', `/api/channels/${v.video.channel.id}/subscribe`, {});
  assert.equal(sub.data.subscribed, true);
  const feed = await call('GET', '/api/subscriptions');
  assert.equal(feed.data.channels.length, 1);
});

test('Path traversal хамгаалалт', async () => {
  const res = await fetch(BASE + '/media/%2e%2e/data/users.json');
  assert.equal(res.status, 404);
});
