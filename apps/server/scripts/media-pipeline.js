import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const SEGMENT_SECONDS = 4;

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(`${cmd} алдаа (${r.status}):\n${(r.stderr || '').split('\n').slice(-15).join('\n')}`);
  }
  return r.stdout;
}

export function hasFfmpeg() {
  const r = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  return r.status === 0;
}

export function encodeArgs() {
  return [
    '-c:v', 'libx264', '-profile:v', 'main', '-level', '3.1',
    '-preset', 'veryfast', '-crf', '28',
    '-pix_fmt', 'yuv420p',
    '-force_key_frames', `expr:gte(t,n_forced*${SEGMENT_SECONDS})`,
    '-sc_threshold', '0',
    '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-ar', '44100',
  ];
}

export function probe(file) {
  const out = run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]);
  return JSON.parse(out);
}

function avcCodecString(stream) {
  const profiles = { Baseline: '42', 'Constrained Baseline': '42', Main: '4d', High: '64' };
  const p = profiles[stream.profile] || '4d';
  const constraint = p === '42' ? 'e0' : '40';
  const level = Number(stream.level || 31).toString(16).padStart(2, '0');
  return `avc1.${p}${constraint}${level}`;
}

export function packageForStreaming(sourceMp4, outDir, { thumbnailAt = 2 } = {}) {
  fs.mkdirSync(outDir, { recursive: true });

  run('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-i', sourceMp4,
    '-c', 'copy',
    '-f', 'hls',
    '-hls_time', String(SEGMENT_SECONDS),
    '-hls_playlist_type', 'vod',
    '-hls_segment_type', 'fmp4',
    '-hls_fmp4_init_filename', 'init.mp4',
    '-hls_segment_filename', path.join(outDir, 'seg_%d.m4s'),
    path.join(outDir, 'playlist.m3u8'),
  ]);

  const playlist = fs.readFileSync(path.join(outDir, 'playlist.m3u8'), 'utf8');
  const durations = [...playlist.matchAll(/#EXTINF:([\d.]+)/g)].map((m) => Number(m[1]));
  let start = 0;
  const segments = durations.map((d, i) => {
    const size = fs.statSync(path.join(outDir, `seg_${i}.m4s`)).size;
    const seg = { url: `seg_${i}.m4s`, start: Number(start.toFixed(3)), duration: d, size };
    start += d;
    return seg;
  });
  fs.rmSync(path.join(outDir, 'playlist.m3u8'));

  const info = probe(sourceMp4);
  const v = info.streams.find((s) => s.codec_type === 'video');
  const a = info.streams.find((s) => s.codec_type === 'audio');
  const codecs = [avcCodecString(v), a ? 'mp4a.40.2' : null].filter(Boolean).join(', ');

  const manifest = {
    duration: Number(start.toFixed(3)),
    width: v.width,
    height: v.height,
    mime: `video/mp4; codecs="${codecs}"`,
    init: 'init.mp4',
    segmentSeconds: SEGMENT_SECONDS,
    segments,
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  run('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-ss', String(Math.min(thumbnailAt, manifest.duration / 2)),
    '-i', sourceMp4,
    '-frames:v', '1',
    '-vf', 'scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2',
    '-q:v', '4',
    path.join(outDir, 'thumbnail.jpg'),
  ]);

  return manifest;
}

export function transcode(input, outputMp4) {
  run('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-i', input,
    '-vf', 'scale=-2:min(480\\,ih)',
    '-r', '30',
    ...encodeArgs(),
    '-movflags', '+faststart',
    outputMp4,
  ]);
}
