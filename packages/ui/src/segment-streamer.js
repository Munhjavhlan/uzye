const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class SegmentStreamer {
  constructor(video, { bufferAhead = 24, keepBehind = 30, onStats = () => {} } = {}) {
    this.video = video;
    this.bufferAhead = bufferAhead;
    this.keepBehind = keepBehind;
    this.onStats = onStats;

    this.manifest = null;
    this.ms = null;
    this.sb = null;
    this.loaded = new Set();
    this.fetching = -1;
    this.busy = false;
    this.destroyed = false;
    this.controller = null;
    this.errors = 0;
    this.stats = { bytes: 0, requests: 0, last: null };

    this.handlers = {
      timeupdate: () => this.pump(),
      waiting: () => this.onWaiting(),
      seeking: () => this.onSeeking(),
    };
  }

  async load(manifestUrl, startTime = 0) {
    const res = await fetch(manifestUrl);
    if (!res.ok) throw new Error(`Manifest татаж чадсангүй (${res.status})`);
    this.manifest = await res.json();
    if (this.destroyed) return;

    const MS = window.ManagedMediaSource || window.MediaSource;
    if (!MS) throw new Error('Таны браузер MediaSource (stream) дэмжихгүй байна');
    if (!MS.isTypeSupported(this.manifest.mime)) throw new Error(`Codec дэмжигдэхгүй: ${this.manifest.mime}`);

    this.ms = new MS();
    if (MS === window.ManagedMediaSource) this.video.disableRemotePlayback = true;
    this.objectUrl = URL.createObjectURL(this.ms);
    this.video.src = this.objectUrl;
    await new Promise((resolve) => this.ms.addEventListener('sourceopen', resolve, { once: true }));
    if (this.destroyed) return;

    this.ms.duration = this.manifest.duration;
    this.sb = this.ms.addSourceBuffer(this.manifest.mime);
    this.sb.mode = 'segments';

    await this.append(await this.fetchBytes(this.manifest.init));
    if (this.destroyed) return;

    if (startTime > 0) this.video.currentTime = Math.min(startTime, this.manifest.duration - 1);

    for (const [type, fn] of Object.entries(this.handlers)) this.video.addEventListener(type, fn);
    this.emitStats();
    this.pump();
  }

  async fetchBytes(url, signal) {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Сегмент татаж чадсангүй: ${url} (${res.status})`);
    return res.arrayBuffer();
  }

  append(data) {
    return new Promise((resolve, reject) => {
      const done = () => {
        this.sb.removeEventListener('error', fail);
        resolve();
      };
      const fail = () => {
        this.sb.removeEventListener('updateend', done);
        reject(new Error('appendBuffer алдаа'));
      };
      this.sb.addEventListener('updateend', done, { once: true });
      this.sb.addEventListener('error', fail, { once: true });
      this.sb.appendBuffer(data);
    });
  }

  removeRange(start, end) {
    return new Promise((resolve) => {
      if (end <= start) return resolve();
      this.sb.addEventListener('updateend', resolve, { once: true });
      this.sb.remove(start, end);
    });
  }

  segmentAt(t) {
    const segs = this.manifest.segments;
    for (let i = 0; i < segs.length; i++) {
      if (t < segs[i].start + segs[i].duration) return i;
    }
    return segs.length - 1;
  }

  isBuffered(t) {
    const b = this.sb.buffered;
    for (let i = 0; i < b.length; i++) if (t >= b.start(i) && t <= b.end(i)) return true;
    return false;
  }

  syncLoaded() {
    for (const i of [...this.loaded]) {
      const s = this.manifest.segments[i];
      if (!this.isBuffered(s.start + s.duration / 2)) this.loaded.delete(i);
    }
  }

  nextSegment(t) {
    const segs = this.manifest.segments;
    for (let i = this.segmentAt(t); i < segs.length; i++) {
      if (segs[i].start > t + this.bufferAhead) return -1;
      if (!this.loaded.has(i)) return i;
    }
    return -1;
  }

  async pump() {
    if (this.busy || this.destroyed || !this.sb) return;
    const t = this.video.currentTime;
    const index = this.nextSegment(t);
    if (index === -1) {
      this.maybeEnd(t);
      return;
    }

    this.busy = true;
    this.fetching = index;
    this.controller = new AbortController();
    const seg = this.manifest.segments[index];
    this.emitStats();
    try {
      const t0 = performance.now();
      const data = await this.fetchBytes(seg.url, this.controller.signal);
      const ms = Math.round(performance.now() - t0);
      if (this.destroyed) return;
      await this.evict();
      await this.append(data);
      this.loaded.add(index);
      this.errors = 0;
      this.stats.bytes += data.byteLength;
      this.stats.requests++;
      this.stats.last = { index, url: seg.url, bytes: data.byteLength, ms };
    } catch (err) {
      if (err.name === 'AbortError') {
      } else if (err.name === 'QuotaExceededError') {
        await this.evict(true);
      } else {
        this.errors++;
        console.warn('Stream алдаа:', err.message);
        if (this.errors > 5) {
          this.video.dispatchEvent(new CustomEvent('streamerror', { detail: err }));
          this.busy = false;
          return;
        }
        await sleep(1000 * this.errors);
      }
    } finally {
      this.busy = false;
      this.fetching = -1;
      this.controller = null;
    }
    this.emitStats();
    if (!this.destroyed) this.pump();
  }

  async evict(aggressive = false) {
    const t = this.video.currentTime;
    const behind = aggressive ? 5 : this.keepBehind;
    const b = this.sb.buffered;
    if (!b.length) return;
    if (b.start(0) < t - behind - 1) await this.removeRange(0, t - behind);
    const aheadLimit = t + this.bufferAhead + (aggressive ? 0 : 60);
    const end = this.sb.buffered.length ? this.sb.buffered.end(this.sb.buffered.length - 1) : 0;
    if (end > aheadLimit + 1) await this.removeRange(aheadLimit, end);
    this.syncLoaded();
  }

  maybeEnd(t) {
    const segs = this.manifest.segments;
    for (let i = this.segmentAt(t); i < segs.length; i++) if (!this.loaded.has(i)) return;
    if (this.ms.readyState === 'open' && !this.sb.updating) {
      try {
        this.ms.endOfStream();
      } catch {
      }
    }
  }

  onSeeking() {
    if (!this.manifest) return;
    const idx = this.segmentAt(this.video.currentTime);
    if (this.fetching !== -1 && (this.fetching < idx || this.fetching > idx + 1)) this.controller?.abort();
    this.syncLoaded();
    this.pump();
  }

  onWaiting() {
    const t = this.video.currentTime;
    const b = this.sb?.buffered;
    if (b) {
      for (let i = 0; i < b.length; i++) {
        const gap = b.start(i) - t;
        if (gap > 0 && gap < 0.5) {
          this.video.currentTime = b.start(i) + 0.01;
          break;
        }
      }
    }
    this.pump();
  }

  emitStats() {
    if (!this.manifest || !this.sb) return;
    const t = this.video.currentTime;
    const b = this.sb.buffered;
    let ahead = 0;
    const ranges = [];
    for (let i = 0; i < b.length; i++) {
      ranges.push([b.start(i), b.end(i)]);
      if (t >= b.start(i) && t <= b.end(i)) ahead = b.end(i) - t;
    }
    const total = this.manifest.segments.reduce((s, x) => s + (x.size || 0), 0);
    this.onStats({
      mime: this.manifest.mime,
      resolution: `${this.manifest.width}x${this.manifest.height}`,
      segments: this.manifest.segments.length,
      loaded: [...this.loaded],
      fetching: this.fetching,
      ranges,
      ahead,
      bytes: this.stats.bytes,
      totalBytes: total,
      requests: this.stats.requests,
      last: this.stats.last,
    });
  }

  destroy() {
    this.destroyed = true;
    this.controller?.abort();
    for (const [type, fn] of Object.entries(this.handlers)) this.video.removeEventListener(type, fn);
    this.video.removeAttribute('src');
    this.video.load();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }
}
