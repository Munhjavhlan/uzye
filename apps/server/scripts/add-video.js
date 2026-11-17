import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { hasFfmpeg, transcode, packageForStreaming } from './media-pipeline.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const DATA_DIR = path.join(ROOT, 'data');

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[++i];
    else out._.push(argv[i]);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const input = args._[0];
if (!input || !fs.existsSync(input)) {
  console.error('Хэрэглээ: npm run add-video -- <файл.mp4> --title "Гарчиг" [--channel demo] [--category programming] [--description "..."]');
  process.exit(1);
}
if (!hasFfmpeg()) {
  console.error('ffmpeg олдсонгүй. Эхлээд ffmpeg суулгана уу.');
  process.exit(1);
}

const readJson = (name, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'));
  } catch {
    return fallback;
  }
};
const users = readJson('users.json', []);
const videos = readJson('videos.json', []);
const views = readJson('views.json', {});

const channel = users.find((u) => u.username === (args.channel || 'demo'));
if (!channel) {
  console.error(`"${args.channel}" суваг олдсонгүй. Байгаа сувгууд: ${users.map((u) => u.username).join(', ')}`);
  process.exit(1);
}

const id = randomBytes(9).toString('base64url').slice(0, 11);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uzye-add-'));
const encoded = path.join(tmp, 'encoded.mp4');

console.log('1/2 Видеог H.264/AAC болгон кодлож байна...');
transcode(input, encoded);
console.log('2/2 Сегментүүдэд хувааж байна...');
const manifest = packageForStreaming(encoded, path.join(ROOT, 'media', 'videos', id));
fs.rmSync(tmp, { recursive: true, force: true });

videos.push({
  id,
  title: args.title || path.basename(input, path.extname(input)),
  description: args.description || '',
  channelId: channel.id,
  category: args.category || 'programming',
  tags: [],
  duration: manifest.duration,
  baseLikes: 0,
  createdAt: new Date().toISOString(),
});
views[id] = 0;
fs.writeFileSync(path.join(DATA_DIR, 'videos.json'), JSON.stringify(videos, null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'views.json'), JSON.stringify(views, null, 2));

console.log(`✅ Нэмэгдлээ: ${id} (${manifest.segments.length} сегмент). Серверийг дахин асаана уу.`);
