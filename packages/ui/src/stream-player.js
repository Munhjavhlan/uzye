import { Component, html, css, signal } from '@uzye/framework';
import { SegmentStreamer } from './segment-streamer.js';
import { formatDuration, formatBytes } from './format.js';

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const VOLUME_KEY = 'uzye.volume';

export class StreamPlayer extends Component {
  static props = {
    src: { type: String, attribute: true, default: '' },
    startTime: { type: Number, attribute: true, default: 0 },
    poster: { type: String, attribute: true, default: '' },
    autoplay: { type: Boolean, attribute: true, default: false },
  };

  paused = signal(true);
  time = signal(0);
  duration = signal(0);
  volume = signal(1);
  muted = signal(false);
  rate = signal(1);
  waiting = signal(false);
  ended = signal(false);
  started = signal(false);
  fullscreen = signal(false);
  controlsVisible = signal(true);
  showStats = signal(false);
  showSettings = signal(false);
  error = signal('');
  stats = signal(null);
  hover = signal(null);
  flash = signal(null);

  static styles = css`
    :host { display: block; position: relative; background: #000; outline: none; color: #fff; }
    :host(:fullscreen) { width: 100%; height: 100%; }
    .wrap { position: relative; width: 100%; height: 100%; aspect-ratio: 16 / 9; overflow: hidden; user-select: none; }
    :host(:fullscreen) .wrap { aspect-ratio: auto; }
    video { position: absolute; inset: 0; width: 100%; height: 100%; background: #000; }
    .hide-cursor { cursor: none; }

    .center { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; }
    .big {
      width: 68px; height: 68px; border-radius: 50%; background: rgba(0,0,0,.6);
      display: grid; place-items: center; pointer-events: auto; cursor: pointer; border: 0; color: #fff;
    }
    .big ui-icon { width: 40px; height: 40px; }
    .spinner {
      width: 56px; height: 56px; border-radius: 50%;
      border: 4px solid rgba(255,255,255,.25); border-top-color: #fff;
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .flash {
      padding: 10px 16px; border-radius: 24px; background: rgba(0,0,0,.6);
      font-size: 18px; font-weight: 500; animation: fade .6s forwards;
    }
    @keyframes fade { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.3); } }
    .error { padding: 16px 20px; max-width: 80%; border-radius: 8px; background: rgba(0,0,0,.8); text-align: center; }

    .controls {
      position: absolute; left: 0; right: 0; bottom: 0; padding: 0 12px;
      background: linear-gradient(transparent, rgba(0,0,0,.75));
      transition: opacity .25s;
    }
    .controls.hidden { opacity: 0; pointer-events: none; }

    .bar { position: relative; height: 18px; display: flex; align-items: center; cursor: pointer; touch-action: none; }
    .track { position: relative; width: 100%; height: 3px; background: rgba(255,255,255,.25); transition: height .1s; }
    .bar:hover .track, .bar.drag .track { height: 5px; }
    .track > * { position: absolute; top: 0; bottom: 0; }
    .buffered { background: rgba(255,255,255,.45); }
    .played { left: 0; background: var(--brand, #f43f5e); }
    .tick { width: 2px; background: rgba(0,0,0,.6); }
    .knob {
      position: absolute; top: 50%; width: 13px; height: 13px; margin: -6.5px 0 0 -6.5px; border-radius: 50%;
      background: var(--brand, #f43f5e); transform: scale(0); transition: transform .1s;
    }
    .bar:hover .knob, .bar.drag .knob { transform: scale(1); }
    .tooltip {
      position: absolute; bottom: 24px; transform: translateX(-50%); padding: 3px 8px; border-radius: 4px;
      background: rgba(0,0,0,.8); font-size: 12px; white-space: nowrap; pointer-events: none; text-align: center;
    }
    .tooltip small { display: block; color: #fbbf24; }

    .row { display: flex; align-items: center; gap: 4px; height: 48px; }
    .row button {
      width: 44px; height: 44px; padding: 8px; border: 0; background: none; color: #fff; cursor: pointer; opacity: .92;
    }
    .row button:hover { opacity: 1; }
    .row button ui-icon { width: 28px; height: 28px; }
    .row button.on { color: var(--brand, #f43f5e); }
    .vol { display: flex; align-items: center; }
    .vol input { width: 0; opacity: 0; transition: width .2s, opacity .2s; accent-color: #fff; }
    .vol:hover input, .vol input:focus { width: 70px; opacity: 1; }
    .time { font-size: 13px; margin-left: 8px; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .spacer { flex: 1; }
    .rate-label { font-size: 12px; font-weight: 600; }

    .menu {
      position: absolute; right: 12px; bottom: 60px; min-width: 160px; padding: 8px 0;
      background: rgba(28,28,28,.92); border-radius: 12px; font-size: 14px;
    }
    .menu h4 { margin: 0; padding: 6px 16px; font-size: 12px; color: #aaa; font-weight: 500; }
    .menu button { display: flex; width: 100%; padding: 8px 16px; border: 0; background: none; color: #fff; cursor: pointer; text-align: left; }
    .menu button:hover { background: rgba(255,255,255,.1); }
    .menu button.sel::before { content: '✓'; margin-right: 8px; }

    .stats {
      position: absolute; top: 12px; left: 12px; max-width: min(420px, 90%); padding: 12px 14px;
      background: rgba(0,0,0,.78); border-radius: 8px; font: 12px/1.6 ui-monospace, Consolas, monospace;
    }
    .stats .x { position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; border: 0; background: none; color: #fff; cursor: pointer; }
    .stats b { color: #93c5fd; font-weight: 500; }
    .segs { display: flex; flex-wrap: wrap; gap: 3px; margin: 6px 0; }
    .segs i { width: 14px; height: 14px; border-radius: 3px; background: rgba(255,255,255,.18); }
    .segs i.ok { background: #22c55e; }
    .segs i.now { outline: 2px solid #fff; }
    .segs i.dl { background: #3b82f6; animation: pulse .6s infinite alternate; }
    @keyframes pulse { to { opacity: .4; } }
    .legend { color: #aaa; }
  `;

  onMount() {
    this.video = this.$('video');
    try {
      const saved = JSON.parse(localStorage.getItem(VOLUME_KEY));
      if (saved) {
        this.video.volume = saved.volume;
        this.video.muted = saved.muted;
      }
    } catch {
    }

    this.effect(() => {
      const src = this.src;
      if (src) this.startStream(src);
    });

    this.listen(document, 'keydown', this.onKey);
    this.listen(document, 'fullscreenchange', () => {
      this.fullscreen.value = document.fullscreenElement === this;
    });
    this.listen(window, 'pagehide', () => this.reportProgress());
    const statsTimer = setInterval(() => this.showStats.peek() && this.streamer?.emitStats(), 1000);
    this.onCleanup(() => clearInterval(statsTimer));
  }

  onUnmount() {
    this.reportProgress();
    this.streamer?.destroy();
    clearTimeout(this.hideTimer);
  }

  async startStream(src) {
    this.streamer?.destroy();
    this.error.value = '';
    this.started.value = false;
    this.ended.value = false;
    this.waiting.value = true;
    const streamer = new SegmentStreamer(this.video, {
      onStats: (s) => (this.stats.value = s),
    });
    this.streamer = streamer;
    try {
      await streamer.load(src, this.startTime);
      if (streamer !== this.streamer) return;
      this.waiting.value = false;
      if (this.autoplay) this.play();
    } catch (err) {
      if (streamer !== this.streamer) return;
      this.waiting.value = false;
      this.error.value = err.message;
    }
  }

  play() {
    this.video.play().catch(() => (this.paused.value = true));
  }
  toggle = () => {
    if (this.video.paused || this.video.ended) this.play();
    else this.video.pause();
  };
  seek(t) {
    const d = this.video.duration || this.duration.peek();
    this.video.currentTime = Math.max(0, Math.min(t, d - 0.05));
    this.time.value = this.video.currentTime;
  }
  seekBy(delta) {
    this.seek(this.video.currentTime + delta);
    this.showFlash(`${delta > 0 ? '+' : ''}${delta}с`);
  }
  toggleMute = () => {
    this.video.muted = !this.video.muted;
    if (!this.video.muted && this.video.volume === 0) this.video.volume = 0.5;
  };
  toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else this.requestFullscreen?.().catch(() => {});
  };
  setRate(r) {
    this.video.playbackRate = r;
    this.showSettings.value = false;
  }
  showFlash(text) {
    this.flash.value = { text, id: Math.random() };
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => (this.flash.value = null), 600);
  }

  reportProgress() {
    if (!this.started.peek() || !this.video) return;
    this.emit('player-progress', { time: this.video.currentTime, duration: this.video.duration });
    this.lastReport = Date.now();
  }

  onPlay = () => {
    this.paused.value = false;
    this.ended.value = false;
    this.bumpControls();
  };
  onPause = () => {
    this.paused.value = true;
    this.controlsVisible.value = true;
    this.reportProgress();
  };
  onPlaying = () => {
    this.waiting.value = false;
    if (!this.started.peek()) {
      this.started.value = true;
      this.emit('player-start', { time: this.video.currentTime });
    }
  };
  onTimeUpdate = () => {
    this.time.value = this.video.currentTime;
    if (!this.video.paused && Date.now() - (this.lastReport || 0) > 5000) this.reportProgress();
  };
  onEnded = () => {
    this.ended.value = true;
    this.paused.value = true;
    this.controlsVisible.value = true;
    this.reportProgress();
    this.emit('player-ended', {});
  };

  bumpControls = () => {
    this.controlsVisible.value = true;
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      if (!this.video.paused && !this.showSettings.peek()) this.controlsVisible.value = false;
    }, 2500);
  };

  timeFromEvent(e) {
    const rect = this.$('.bar').getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    return { t: ratio * (this.duration.peek() || 0), x: ratio * rect.width };
  }
  onBarDown = (e) => {
    const bar = e.currentTarget;
    bar.setPointerCapture(e.pointerId);
    bar.classList.add('drag');
    this.seek(this.timeFromEvent(e).t);
    const move = (ev) => {
      const { t, x } = this.timeFromEvent(ev);
      this.hover.value = { t, x };
      this.seek(t);
    };
    const up = () => {
      bar.classList.remove('drag');
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', up);
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
  };
  onBarHover = (e) => {
    this.hover.value = this.timeFromEvent(e);
  };

  onKey = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const path = e.composedPath();
    if (path.some((n) => n instanceof HTMLElement && (n.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(n.tagName)))) return;
    const focusedHere = path.includes(this);
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'k') {
      e.preventDefault();
      this.toggle();
      this.showFlash(this.video.paused ? '❚❚' : '▶');
    } else if (k === 'j') this.seekBy(-10);
    else if (k === 'l') this.seekBy(10);
    else if (k === 'arrowleft') {
      e.preventDefault();
      this.seekBy(-5);
    } else if (k === 'arrowright') {
      e.preventDefault();
      this.seekBy(5);
    } else if (k === 'm') this.toggleMute();
    else if (k === 'f') this.toggleFullscreen();
    else if ((k === 'arrowup' || k === 'arrowdown') && focusedHere) {
      e.preventDefault();
      const v = Math.min(1, Math.max(0, this.video.volume + (k === 'arrowup' ? 0.05 : -0.05)));
      this.video.volume = v;
      this.video.muted = false;
      this.showFlash(`${Math.round(v * 100)}%`);
    } else if (/^[0-9]$/.test(k)) this.seek((Number(k) / 10) * this.duration.peek());
    else return;
    this.bumpControls();
  };

  onVolumeChange = () => {
    this.volume.value = this.video.volume;
    this.muted.value = this.video.muted;
    try {
      localStorage.setItem(VOLUME_KEY, JSON.stringify({ volume: this.video.volume, muted: this.video.muted }));
    } catch {
    }
  };

  renderStats() {
    const s = this.stats.value;
    if (!s) return html`<div class="stats">Ачаалж байна...</div>`;
    const loaded = new Set(s.loaded);
    const current = this.streamer ? this.streamer.segmentAt(this.time.value) : -1;
    const pct = s.totalBytes ? Math.round((s.bytes / s.totalBytes) * 100) : 0;
    return html`
      <div class="stats" @click=${(e) => e.stopPropagation()}>
        <button class="x" @click=${() => (this.showStats.value = false)} aria-label="Хаах">✕</button>
        <div><b>Горим:</b> MediaSource сегмент stream</div>
        <div><b>Codec:</b> ${s.mime.replace('video/mp4; codecs=', '')}</div>
        <div><b>Хэмжээ:</b> ${s.resolution}</div>
        <div><b>Buffer:</b> ${s.ahead.toFixed(1)}с урагш</div>
        <div><b>Сегмент:</b> ${s.loaded.length} / ${s.segments} санах ойд</div>
        <div class="segs">
          ${Array.from({ length: s.segments }, (_, i) => html`<i class=${[loaded.has(i) ? 'ok' : '', s.fetching === i ? 'dl' : '', i === current ? 'now' : ''].join(' ')} title=${'seg_' + i}></i>`)}
        </div>
        <div class="legend">🟩 санах ойд  🟦 татаж байна  ⬜ татаагүй</div>
        <div><b>Татсан:</b> ${formatBytes(s.bytes)} / ${formatBytes(s.totalBytes)} (${pct}%) · ${s.requests} хүсэлт</div>
        ${s.last ? html`<div><b>Сүүлийн:</b> ${s.last.url.split('/').pop()} — ${formatBytes(s.last.bytes)}, ${s.last.ms}мс</div>` : ''}
      </div>
    `;
  }

  render() {
    const d = this.duration.value;
    const t = this.time.value;
    const pct = (x) => (d ? (x / d) * 100 : 0);
    const s = this.stats.value;
    const segs = this.streamer?.manifest?.segments || [];
    const hover = this.hover.value;
    const showControls = this.controlsVisible.value || this.paused.value;

    return html`
      <div class=${'wrap' + (showControls ? '' : ' hide-cursor')} @pointermove=${this.bumpControls} @pointerleave=${() => !this.paused.peek() && (this.controlsVisible.value = false)}>
        <video
          playsinline
          poster=${this.poster || null}
          controlslist="nodownload"
          disablepictureinpicture
          @contextmenu=${(e) => e.preventDefault()}
          @click=${this.toggle}
          @dblclick=${this.toggleFullscreen}
          @play=${this.onPlay}
          @pause=${this.onPause}
          @playing=${this.onPlaying}
          @waiting=${() => (this.waiting.value = true)}
          @canplay=${() => (this.waiting.value = false)}
          @timeupdate=${this.onTimeUpdate}
          @durationchange=${() => (this.duration.value = this.video.duration || 0)}
          @volumechange=${this.onVolumeChange}
          @ratechange=${() => (this.rate.value = this.video.playbackRate)}
          @ended=${this.onEnded}
          @streamerror=${(e) => (this.error.value = 'Сүлжээний алдаа: ' + e.detail.message)}
        ></video>

        <div class="center">
          ${this.error.value
            ? html`<div class="error">⚠️ ${this.error.value}</div>`
            : this.waiting.value && !this.paused.value
              ? html`<div class="spinner"></div>`
              : this.paused.value
                ? html`<button class="big" @click=${this.toggle} aria-label="Тоглуулах"><ui-icon name=${this.ended.value ? 'replay' : 'play'}></ui-icon></button>`
                : ''}
          ${this.flash.value ? html`<div class="flash">${this.flash.value.text}</div>` : ''}
        </div>

        ${this.showStats.value ? this.renderStats() : ''}

        <div class=${'controls' + (showControls ? '' : ' hidden')}>
          <div class="bar" @pointerdown=${this.onBarDown} @pointermove=${this.onBarHover} @pointerleave=${() => (this.hover.value = null)}>
            <div class="track">
              ${(s?.ranges || []).map(([a, b]) => html`<div class="buffered" style=${`left:${pct(a)}%;width:${pct(b - a)}%`}></div>`)}
              <div class="played" style=${`width:${pct(t)}%`}></div>
              ${segs.slice(1).map((seg) => html`<div class="tick" style=${`left:${pct(seg.start)}%`}></div>`)}
            </div>
            <div class="knob" style=${`left:${pct(t)}%`}></div>
            ${hover
              ? html`<div class="tooltip" style=${`left:${hover.x}px`}>${formatDuration(hover.t)}<small>сегмент #${this.streamer ? this.streamer.segmentAt(hover.t) : 0}</small></div>`
              : ''}
          </div>
          <div class="row">
            <button @click=${this.toggle} aria-label=${this.paused.value ? 'Тоглуулах (k)' : 'Зогсоох (k)'} title=${this.paused.value ? 'Тоглуулах (k)' : 'Зогсоох (k)'}>
              <ui-icon name=${this.ended.value ? 'replay' : this.paused.value ? 'play' : 'pause'}></ui-icon>
            </button>
            <div class="vol">
              <button @click=${this.toggleMute} aria-label="Дуу (m)" title="Дуу (m)">
                <ui-icon name=${this.muted.value || this.volume.value === 0 ? 'muted' : 'volume'}></ui-icon>
              </button>
              <input type="range" min="0" max="1" step="0.01" aria-label="Дууны түвшин"
                .value=${String(this.muted.value ? 0 : this.volume.value)}
                @input=${(e) => {
                  this.video.volume = Number(e.target.value);
                  this.video.muted = this.video.volume === 0;
                }}>
            </div>
            <span class="time">${formatDuration(t)} / ${formatDuration(d)}</span>
            <span class="spacer"></span>
            <button class=${this.showStats.value ? 'on' : ''} @click=${() => this.showStats.update((v) => !v)} aria-label="Stream статистик" title="Stream статистик">
              <ui-icon name="info"></ui-icon>
            </button>
            <button @click=${() => this.showSettings.update((v) => !v)} aria-label="Хурд" title="Тоглуулах хурд">
              ${this.rate.value !== 1 ? html`<span class="rate-label">${this.rate.value}x</span>` : html`<ui-icon name="settings"></ui-icon>`}
            </button>
            <button @click=${this.toggleFullscreen} aria-label="Бүтэн дэлгэц (f)" title="Бүтэн дэлгэц (f)">
              <ui-icon name=${this.fullscreen.value ? 'fullscreen-exit' : 'fullscreen'}></ui-icon>
            </button>
          </div>
        </div>

        ${this.showSettings.value
          ? html`<div class="menu">
              <h4>Тоглуулах хурд</h4>
              ${RATES.map((r) => html`<button class=${r === this.rate.value ? 'sel' : ''} @click=${() => this.setRate(r)}>${r === 1 ? 'Хэвийн' : r + 'x'}</button>`)}
            </div>`
          : ''}
      </div>
    `;
  }
}
