import fs from 'node:fs';
import path from 'node:path';

export class JsonStore {
  constructor(dir) {
    this.dir = dir;
    this.data = {};
    this.timers = new Map();
    fs.mkdirSync(dir, { recursive: true });
  }

  file(name) {
    return path.join(this.dir, `${name}.json`);
  }

  load(name, fallback) {
    try {
      this.data[name] = JSON.parse(fs.readFileSync(this.file(name), 'utf8'));
    } catch {
      this.data[name] = fallback;
    }
    return this.data[name];
  }

  get(name) {
    return this.data[name];
  }

  set(name, value) {
    this.data[name] = value;
    this.save(name);
  }

  save(name) {
    clearTimeout(this.timers.get(name));
    this.timers.set(name, setTimeout(() => this.flush(name), 100));
  }

  flush(name) {
    clearTimeout(this.timers.get(name));
    this.timers.delete(name);
    const target = this.file(name);
    const tmp = `${target}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data[name], null, 2));
    fs.renameSync(tmp, target);
  }

  flushAll() {
    for (const name of [...this.timers.keys()]) this.flush(name);
  }
}
