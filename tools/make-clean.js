import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, '..', 'uzye-clean'));
const SKIP = new Set(['.git', 'node_modules']);

function stripJsCss(text) {
  const out = [];
  let inBlock = false;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (inBlock) {
      if (t.includes('*/')) inBlock = false;
      continue;
    }
    if (t.startsWith('//')) continue;
    if (t.startsWith('/*')) {
      if (t.includes('*/')) {
        if (t.endsWith('*/')) continue;
      } else {
        inBlock = true;
        continue;
      }
    }
    out.push(line);
  }
  return tidy(out);
}

function stripHtml(text) {
  const out = [];
  let inBlock = false;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (inBlock) {
      if (t.includes('-->')) inBlock = false;
      continue;
    }
    if (t.startsWith('<!--')) {
      if (!t.includes('-->')) inBlock = true;
      continue;
    }
    out.push(line);
  }
  return tidy(out);
}

function tidy(lines) {
  const out = [];
  for (const l of lines) {
    if (l.trim() === '' && (out.length === 0 || out[out.length - 1].trim() === '')) continue;
    out.push(l);
  }
  return out.join('\n').replace(/\n*$/, '\n');
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
      continue;
    }
    const ext = path.extname(entry.name);
    if (ext === '.js' || ext === '.css') fs.writeFileSync(d, stripJsCss(fs.readFileSync(s, 'utf8')));
    else if (ext === '.html') fs.writeFileSync(d, stripHtml(fs.readFileSync(s, 'utf8')));
    else fs.copyFileSync(s, d);
  }
}

if (path.resolve(OUT) === ROOT) throw new Error('Гаралтын хавтас эх хавтастай ижил байж болохгүй');
fs.rmSync(OUT, { recursive: true, force: true });
copyDir(ROOT, OUT);
console.log('✅ Тайлбаргүй хувилбар:', OUT);
