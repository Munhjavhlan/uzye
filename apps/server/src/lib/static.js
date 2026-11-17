import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.m4s': 'video/iso.segment',
  '.webmanifest': 'application/manifest+json',
};

const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg']);
const gzipCache = new Map();

export function resolveSafe(rootDir, relPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(relPath);
  } catch {
    return null;
  }
  const full = path.resolve(rootDir, '.' + path.posix.normalize('/' + decoded));
  if (full !== rootDir && !full.startsWith(rootDir + path.sep)) return null;
  return full;
}

export function fileStat(full) {
  try {
    const st = fs.statSync(full);
    return st.isFile() ? st : null;
  } catch {
    return null;
  }
}

export function sendFile(req, res, full, st, { cacheControl = 'no-cache' } = {}) {
  const ext = path.extname(full).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;

  const headers = {
    'Content-Type': type,
    ETag: etag,
    'Cache-Control': cacheControl,
    'Accept-Ranges': 'bytes',
  };

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    return res.end();
  }

  const range = req.headers.range;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    let start = m && m[1] !== '' ? Number(m[1]) : NaN;
    let end = m && m[2] !== '' ? Number(m[2]) : NaN;
    if (Number.isNaN(start) && !Number.isNaN(end)) {
      start = st.size - end;
      end = st.size - 1;
    }
    if (Number.isNaN(end) || end >= st.size) end = st.size - 1;
    if (!m || Number.isNaN(start) || start < 0 || start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${st.size}` });
      return res.end();
    }
    res.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${st.size}`,
      'Content-Length': end - start + 1,
    });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(full, { start, end }).pipe(res);
  }

  const acceptsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  if (COMPRESSIBLE.has(ext) && acceptsGzip) {
    const key = `${full}:${st.mtimeMs}`;
    let gz = gzipCache.get(key);
    if (!gz) {
      gz = zlib.gzipSync(fs.readFileSync(full));
      gzipCache.set(key, gz);
    }
    res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip', 'Content-Length': gz.length, Vary: 'Accept-Encoding' });
    return res.end(req.method === 'HEAD' ? undefined : gz);
  }

  res.writeHead(200, { ...headers, 'Content-Length': st.size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(full).pipe(res);
}
