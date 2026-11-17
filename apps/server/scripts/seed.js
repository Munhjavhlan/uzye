import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { hashPassword } from '../src/lib/password.js';
import { hasFfmpeg, encodeArgs, packageForStreaming } from './media-pipeline.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const DATA_DIR = path.join(ROOT, 'data');
const VIDEO_DIR = path.join(ROOT, 'media', 'videos');
const FORCE = process.argv.includes('--force');

const makeId = (slug) => createHash('sha1').update(slug).digest('base64url').slice(0, 11);

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

const PASSWORD = 'demo1234';
const users = [
  { slug: 'kodacademy', displayName: 'Код Академи', color: '#2563eb', baseSubscribers: 128000, description: 'Програмчлалыг монгол хэлээр, энгийнээр заадаг суваг.' },
  { slug: 'baigal', displayName: 'Байгаль Монгол', color: '#16a34a', baseSubscribers: 54300, description: 'Монголын байгалийн үзэсгэлэнт газрууд.' },
  { slug: 'togloom', displayName: 'Тоглоомын Төв', color: '#9333ea', baseSubscribers: 87100, description: 'Шатар, логик тоглоом, симуляциуд.' },
  { slug: 'hugjim', displayName: 'Хөгжмийн Өргөө', color: '#ea580c', baseSubscribers: 23900, description: 'Хичээл хийх үед сонсох тайван хөгжим.' },
  { slug: 'demo', displayName: 'Demo Хэрэглэгч', color: '#0891b2', baseSubscribers: 0, description: '' },
].map((u, i) => ({
  id: makeId('user-' + u.slug),
  username: u.slug,
  displayName: u.displayName,
  passwordHash: hashPassword(PASSWORD),
  avatarColor: u.color,
  description: u.description,
  baseSubscribers: u.baseSubscribers,
  createdAt: daysAgo(900 - i * 120),
}));
const userBySlug = Object.fromEntries(users.map((u) => [u.username, u]));

const PAD = "aevalsrc='0.06*sin(2*PI*220*t)*(0.6+0.4*sin(2*PI*0.25*t))+0.04*sin(2*PI*329.63*t)*(0.5+0.5*sin(2*PI*0.17*t))+0.03*sin(2*PI*440*t)':s=44100";
const NATURE = 'anoisesrc=color=brown:amplitude=0.09:r=44100';
const MELODY = "aevalsrc='0.22*sin(2*PI*196*t)*(0.55+0.45*sin(2*PI*0.5*t))+0.14*sin(2*PI*293.66*t)*(0.5+0.5*sin(2*PI*0.33*t+1))+0.1*sin(2*PI*392*t)*(0.5+0.5*sin(2*PI*0.2*t+2))':s=44100";
const LOFI = "aevalsrc='0.16*sin(2*PI*130.81*t)*(0.6+0.4*sin(2*PI*0.75*t))+0.12*sin(2*PI*164.81*t)+0.1*sin(2*PI*196*t)*(0.5+0.5*sin(2*PI*1.5*t))+0.015*(random(0)*2-1)':s=44100";

const GRID = (c) => `if(lt(mod(X+T*40\\,80)\\,5)+lt(mod(Y+T*20\\,80)\\,5)\\,${c}\\,${Math.round(c / 6)})`;
const CHESS = "geq=lum='if(mod(floor((X+T*30)/45)+floor(Y/45)\\,2)\\,225\\,45)':cb=128:cr=128";

const S = 's=640x360:r=24';
const SMALL = 's=160x90:r=24';
const UPSCALE = 'scale=640:360:flags=neighbor';
const videos = [
  { slug: 'js-promise', channel: 'kodacademy', category: 'programming', duration: 44, days: 2, baseLikes: 4200, views: 51234,
    title: 'JavaScript Promise 10 минутад — async/await хүртэл',
    description: 'Promise гэж юу вэ, then/catch хэрхэн ажилладаг, async/await-ыг хэзээ ашиглах вэ гэдгийг жишээгээр тайлбарлав.\n\n00:00 Танилцуулга\n00:12 Promise үүсгэх\n00:28 async/await',
    tags: ['javascript', 'promise', 'async'],
    video: `gradients=${S}:c0=0x1e3a8a:c1=0x0ea5e9:c2=0x6366f1:speed=0.015`, audio: PAD },
  { slug: 'web-components', channel: 'kodacademy', category: 'programming', duration: 52, days: 9, baseLikes: 3100, views: 32870,
    title: 'Web Component гэж юу вэ? Custom Elements ба Shadow DOM',
    description: 'Framework ашиглахгүйгээр өөрийн HTML таг үүсгэх аргыг үзье. customElements.define, Shadow DOM, slot.',
    tags: ['web components', 'shadow dom', 'html'],
    video: `cellauto=${SMALL}:rule=110,${UPSCALE},format=rgb24,colorchannelmixer=rr=0.3:gg=0.8:bb=1`, audio: PAD },
  { slug: 'node-stream', channel: 'kodacademy', category: 'programming', duration: 64, days: 21, baseLikes: 2650, views: 27100,
    title: 'Node.js Stream ойлгох нь — видео хэрхэн хэсэг хэсгээр дамждаг вэ',
    description: 'Readable, Writable stream, HTTP Range хүсэлт, видеог сегментээр дамжуулах зарчим.',
    tags: ['node.js', 'stream', 'video'],
    video: `testsrc2=${S}`, audio: PAD },
  { slug: 'css-grid', channel: 'kodacademy', category: 'programming', duration: 40, days: 45, baseLikes: 5800, views: 98320,
    title: 'CSS Grid эхлэгчдэд — бүрэн заавар',
    description: 'grid-template-columns, gap, auto-fill, minmax ашиглан YouTube шиг responsive grid хийх.',
    tags: ['css', 'grid', 'responsive'],
    video: `color=c=0x0f172a:${S},format=gbrp,geq=r='${GRID(56)}':g='${GRID(189)}':b='${GRID(248)}'`, audio: PAD },
  { slug: 'khuvsgul', channel: 'baigal', category: 'nature', duration: 60, days: 4, baseLikes: 7300, views: 143200,
    title: 'Хөвсгөл нуурын үүр цайх мөч — тайван 1 минут',
    description: 'Монголын "хөх сувд" Хөвсгөл нуур. Чихэвчээр сонсохыг зөвлөж байна.',
    tags: ['хөвсгөл', 'нуур', 'байгаль'],
    video: `gradients=${S}:c0=0x0c4a6e:c1=0x7dd3fc:c2=0xf0f9ff:speed=0.01`, audio: NATURE },
  { slug: 'gobi-stars', channel: 'baigal', category: 'nature', duration: 48, days: 15, baseLikes: 9100, views: 210500,
    title: 'Говийн шөнийн од эрхэс — timelapse',
    description: 'Говь цөлийн тунгалаг тэнгэр дэх од эрхсийн эргэлт.',
    tags: ['говь', 'од', 'timelapse'],
    video: `mandelbrot=${S}:inner=mincol`, audio: NATURE },
  { slug: 'altai', channel: 'baigal', category: 'nature', duration: 40, days: 60, baseLikes: 2200, views: 31800,
    title: 'Алтайн уулсаар аялах нь',
    description: 'Баян-Өлгийн Алтай Таван Богд — ногоон хөндий, мөсөн гол.',
    tags: ['алтай', 'аялал', 'уул'],
    video: `gradients=${S}:c0=0x14532d:c1=0x84cc16:c2=0x78350f:speed=0.012`, audio: NATURE },
  { slug: 'chess-sicilian', channel: 'togloom', category: 'gaming', duration: 56, days: 1, baseLikes: 1800, views: 12650,
    title: 'Шатрын нээлтүүд: Сицили хамгаалалт',
    description: '1.e4 c5 — хамгийн алдартай хамгаалалтын үндсэн санаанууд.',
    tags: ['шатар', 'нээлт', 'сицили'],
    video: `color=c=gray:${S},${CHESS}`, audio: PAD },
  { slug: 'cellular-tetris', channel: 'togloom', category: 'gaming', duration: 32, days: 30, baseLikes: 950, views: 8420,
    title: 'Rule 30 — энгийн дүрмээс гарах эмх замбараагүй байдал',
    description: 'Нэг мөрт эсийн автомат (cellular automaton), Rule 30-ын гайхалтай хээ.',
    tags: ['симуляци', 'математик'],
    video: `cellauto=${SMALL}:rule=30,${UPSCALE},format=rgb24,colorchannelmixer=rr=1:gg=0.4:bb=0.9`, audio: PAD },
  { slug: 'game-of-life', channel: 'togloom', category: 'gaming', duration: 68, days: 90, baseLikes: 15200, views: 402300,
    title: "Conway's Game of Life — 4 дүрмээр амьдрал симуляци",
    description: 'Эс бүр хөршийнхөө тоогоор амьд үлдэх эсвэл үхэх. Энгийн дүрмээс нарийн хэв маяг үүсдэг.',
    tags: ['game of life', 'симуляци', 'алгоритм'],
    video: `life=${SMALL}:mold=10:ratio=0.1:death_color=#3b0764:life_color=#a855f7,${UPSCALE}`, audio: PAD },
  { slug: 'morin-khuur', channel: 'hugjim', category: 'music', duration: 72, days: 6, baseLikes: 6600, views: 88000,
    title: 'Морин хуурын аялгуу (синтез) — дууны долгионоор',
    description: 'Дууны долгионыг (waveform) шууд харуулсан тайван аялгуу.',
    tags: ['морин хуур', 'хөгжим', 'тайван'],
    visualizer: 'showwaves=s=640x360:mode=cline:rate=24:colors=0xf97316|0xfacc15', audio: MELODY },
  { slug: 'lofi-study', channel: 'hugjim', category: 'music', duration: 80, days: 12, baseLikes: 12400, views: 260700,
    title: 'Lo-fi хичээлийн хөгжим — анхаарал төвлөрүүлэх',
    description: 'Хичээл хийх, код бичих үед сонсох lo-fi. Спектрограмм дээр дууны давтамжийг харж болно.',
    tags: ['lofi', 'хичээл', 'хөгжим'],
    visualizer: 'showspectrum=s=640x360:slide=scroll:mode=combined:color=magma:scale=cbrt,fps=24', audio: LOFI },
].map((v) => ({ ...v, id: makeId('video-' + v.slug) }));

const escapePath = (p) => p.replace(/\\/g, '/').replace(/:/g, '\\:');

function findFont() {
  const candidates = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
    '/Library/Fonts/Arial Unicode.ttf',
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    'C:/Windows/Fonts/arialbd.ttf',
    'C:/Windows/Fonts/arial.ttf',
  ];
  const found = candidates.find((f) => fs.existsSync(f));
  return found ? `fontfile='${escapePath(found)}':` : '';
}

function generateVideo(v, tmpDir) {
  const font = findFont();
  const titleFile = path.join(tmpDir, `${v.id}.txt`);
  fs.writeFileSync(titleFile, v.title);

  const overlay = [
    `drawtext=${font}textfile='${escapePath(titleFile)}':fontsize=18:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=12:x=20:y=20`,
    `drawtext=${font}text='%{pts\\:hms}':fontsize=30:fontcolor=white:borderw=3:bordercolor=black:x=20:y=h-th-20`,
    `drawtext=${font}text='сегмент #%{eif\\:floor(t/4)\\:d}':fontsize=20:fontcolor=yellow:borderw=2:bordercolor=black:x=20:y=62`,
  ].join(',');

  const out = path.join(tmpDir, `${v.id}.mp4`);
  let args;
  if (v.visualizer) {
    args = ['-f', 'lavfi', '-i', v.audio,
      '-filter_complex', `[0:a]asplit[a1][a2];[a1]${v.visualizer},format=yuv420p,${overlay}[v]`,
      '-map', '[v]', '-map', '[a2]'];
  } else {
    args = ['-f', 'lavfi', '-i', v.video, '-f', 'lavfi', '-i', v.audio,
      '-filter_complex', `[0:v]format=yuv420p,${overlay}[v]`,
      '-map', '[v]', '-map', '1:a'];
  }
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args, '-t', String(v.duration), ...encodeArgs(), out], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`"${v.title}" үүсгэхэд алдаа:\n${r.stderr}`);
  return out;
}

function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(VIDEO_DIR, { recursive: true });

  const missing = videos.filter((v) => FORCE || !fs.existsSync(path.join(VIDEO_DIR, v.id, 'manifest.json')));
  if (missing.length) {
    if (!hasFfmpeg()) {
      console.error('ffmpeg олдсонгүй. https://ffmpeg.org-оос суулгаад дахин ажиллуулна уу.');
      process.exit(1);
    }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uzye-'));
    for (const v of missing) {
      const t0 = Date.now();
      process.stdout.write(`🎬 ${v.title} ... `);
      const src = generateVideo(v, tmp);
      const outDir = path.join(VIDEO_DIR, v.id);
      fs.rmSync(outDir, { recursive: true, force: true });
      const m = packageForStreaming(src, outDir, { thumbnailAt: v.visualizer ? v.duration / 2 : 2 });
      console.log(`${m.segments.length} сегмент (${((Date.now() - t0) / 1000).toFixed(1)}с)`);
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  } else {
    console.log('Видеонууд бэлэн байна (дахин үүсгэх бол --force).');
  }

  const catalog = videos.map((v) => {
    const manifest = JSON.parse(fs.readFileSync(path.join(VIDEO_DIR, v.id, 'manifest.json'), 'utf8'));
    return {
      id: v.id,
      title: v.title,
      description: v.description,
      channelId: userBySlug[v.channel].id,
      category: v.category,
      tags: v.tags,
      duration: manifest.duration,
      baseLikes: v.baseLikes,
      createdAt: daysAgo(v.days),
    };
  });

  const sampleComments = [
    ['demo', 'Маш ойлгомжтой тайлбарласан байна, баярлалаа! 🙏'],
    ['kodacademy', 'Асуулт байвал сэтгэгдэл дээр бичээрэй.'],
    ['baigal', 'Дараагийн видеог хүлээж байна.'],
    ['togloom', 'Хамгийн сайн хэсэг нь 0:20 орчим 🔥'],
    ['hugjim', 'Энэ видеог хэд дахин үзлээ.'],
  ];
  const comments = [];
  catalog.forEach((v, vi) => {
    for (let k = 0; k < 3; k++) {
      const [slug, text] = sampleComments[(vi + k) % sampleComments.length];
      comments.push({
        id: makeId(`comment-${v.id}-${k}`),
        videoId: v.id,
        userId: userBySlug[slug].id,
        parentId: null,
        text,
        baseLikes: (vi * 7 + k * 13) % 40,
        createdAt: daysAgo(Math.max(0, (vi % 5) - k * 0.3)),
      });
    }
  });

  const write = (name, data) => fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(data, null, 2));
  write('videos.json', catalog);
  write('users.json', users);
  write('comments.json', comments);
  write('views.json', Object.fromEntries(videos.map((v) => [v.id, v.views])));
  for (const empty of ['sessions', 'reactions', 'commentLikes', 'subscriptions', 'watchLater', 'history']) {
    write(`${empty}.json`, []);
  }

  console.log(`\n✅ Бэлэн: ${catalog.length} видео, ${users.length} хэрэглэгч.`);
  console.log(`   Нэвтрэх: demo / ${PASSWORD}  (сувгууд: kodacademy, baigal, togloom, hugjim — ижил нууц үг)`);
}

main();
