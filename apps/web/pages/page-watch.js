import { Component, html, css, signal, resource, api } from '@uzye/framework';
import { formatCount, formatViews, timeAgo } from '@uzye/ui';
import { session, requireAuth, toggleWatchLater, toast, notifyLibrary } from '../state.js';

export class PageWatch extends Component {
  static props = { params: { default: () => ({}) }, query: { default: () => ({}) } };

  video = resource((id) => api.get('/api/videos/' + id).then((r) => r.video));
  related = resource((id) => api.get(`/api/videos/${id}/related`).then((r) => r.videos));
  descOpen = signal(false);
  busy = signal(false);

  static styles = css`
    :host { display: flex; gap: 24px; max-width: 1754px; margin: 0 auto; padding: 24px; }
    .primary { flex: 1; min-width: 0; }
    .secondary { width: 402px; flex: none; display: flex; flex-direction: column; gap: 8px; }
    stream-player { border-radius: 12px; overflow: hidden; }
    h1 { margin: 12px 0 8px; font-size: 20px; line-height: 28px; font-weight: 700; word-break: break-word; }
    .bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
    .owner { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .owner .avatar { width: 40px; height: 40px; }
    .owner .name { font-size: 16px; font-weight: 500; }
    .owner .subs { font-size: 12px; color: var(--text-2); }
    .owner .btn { margin-left: 12px; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .seg { display: flex; border-radius: 18px; background: var(--bg-chip); overflow: hidden; }
    .seg .btn { border-radius: 0; background: none; }
    .seg .btn:hover { background: var(--bg-chip-hover); }
    .seg .btn + .btn { border-left: 1px solid var(--border); }
    .btn.on ui-icon { color: var(--text); }
    .btn.on { font-weight: 700; }

    .desc {
      margin-top: 12px; padding: 12px; border-radius: 12px; background: var(--bg-chip);
      font-size: 14px; line-height: 20px; cursor: pointer;
    }
    .desc:hover { background: var(--bg-chip-hover); }
    .desc.open { cursor: default; }
    .desc .stats { font-weight: 500; }
    .desc .tags { color: var(--link); margin-left: 6px; }
    .desc .text { white-space: pre-wrap; margin-top: 4px; }
    .desc:not(.open) .text { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .desc .more { font-weight: 500; margin-top: 4px; background: none; border: 0; padding: 0; cursor: pointer; font-size: 14px; }

    .skel-player { aspect-ratio: 16/9; border-radius: 12px; }
    .err { padding: 48px; text-align: center; }

    @media (max-width: 1000px) {
      :host { flex-direction: column; padding: 0 0 24px; }
      .primary > *:not(stream-player) { margin-left: 12px; margin-right: 12px; }
      stream-player { border-radius: 0; }
      .secondary { width: auto; padding: 0 12px; }
    }
  `;

  onMount() {
    const id = this.params.id;
    this.video.load(id).then((v) => v && (document.title = v.title + ' — Үзье'));
    this.related.load(id);
    this.listen(window, 'library-change', (e) => {
      if (e.detail.type === 'watch-later' && e.detail.videoId === id) this.video.mutate((v) => ({ ...v, inWatchLater: e.detail.value }));
    });
  }

  onPlayerStart = (e) => {
    const v = this.video.data.peek();
    api.post(`/api/videos/${v.id}/view`).then((r) => this.video.mutate((x) => ({ ...x, views: r.views })));
    if (session.peek().user) api.post('/api/history', { videoId: v.id, position: e.detail.time }).catch(() => {});
  };
  onPlayerProgress = (e) => {
    const v = this.video.data.peek();
    if (!v || !session.peek().user) return;
    api.post('/api/history', { videoId: v.id, position: e.detail.time }).catch(() => {});
  };

  async react(value) {
    if (!requireAuth(value === 1 ? 'Видео таалагдсан уу?' : 'Видео таалагдаагүй юу?', 'Санал өгөхийн тулд нэвтэрнэ үү.')) return;
    const v = this.video.data.peek();
    const next = v.myReaction === value ? 0 : value;
    try {
      const res = await api.post(`/api/videos/${v.id}/reaction`, { value: next });
      this.video.mutate((x) => ({ ...x, ...res }));
      if (next === 1) toast('"Таалагдсан видео" жагсаалтад нэмэгдлээ');
    } catch (err) {
      toast('Алдаа: ' + err.message);
    }
  }

  async subscribe() {
    const v = this.video.data.peek();
    if (!requireAuth(`${v.channel.displayName} сувгийг захиалах уу?`, 'Сувгийг захиалахын тулд нэвтэрнэ үү.')) return;
    if (this.busy.peek()) return;
    this.busy.value = true;
    try {
      const url = `/api/channels/${v.channel.id}/subscribe`;
      const res = v.channel.subscribed ? await api.del(url) : await api.post(url);
      this.video.mutate((x) => ({ ...x, channel: { ...x.channel, ...res } }));
      notifyLibrary({ type: 'subscription' });
      toast(res.subscribed ? 'Захиалга нэмэгдлээ' : 'Захиалга цуцлагдлаа');
    } catch (err) {
      toast('Алдаа: ' + err.message);
    } finally {
      this.busy.value = false;
    }
  }

  async save() {
    const v = this.video.data.peek();
    const next = await toggleWatchLater(v);
    this.video.mutate((x) => ({ ...x, inWatchLater: next }));
  }

  async share() {
    const url = location.origin + '/watch/' + this.params.id;
    try {
      await navigator.clipboard.writeText(url);
      toast('Холбоосыг хууллаа');
    } catch {
      prompt('Холбоосыг хуулна уу:', url);
    }
  }

  renderInfo(v) {
    const user = session.value.user;
    const isOwner = user && user.id === v.channel.id;
    return html`
      <h1>${v.title}</h1>
      <div class="bar">
        <div class="owner">
          <a class="avatar" href=${'/@' + v.channel.username} style=${'background:' + v.channel.avatarColor}>${v.channel.displayName[0]}</a>
          <div>
            <a class="name" href=${'/@' + v.channel.username}>${v.channel.displayName}</a>
            <div class="subs">${formatCount(v.channel.subscribers)} захиалагч</div>
          </div>
          ${isOwner
            ? html`<a class="btn" href=${'/@' + v.channel.username}>Таны суваг</a>`
            : html`<button class=${'btn ' + (v.channel.subscribed ? '' : 'primary')} ?disabled=${this.busy.value} @click=${() => this.subscribe()}>
                ${v.channel.subscribed ? html`<ui-icon name="check"></ui-icon>Захиалсан` : 'Захиалах'}
              </button>`}
        </div>
        <div class="actions">
          <div class="seg">
            <button class=${'btn' + (v.myReaction === 1 ? ' on' : '')} @click=${() => this.react(1)} title="Таалагдлаа" aria-pressed=${String(v.myReaction === 1)}>
              <ui-icon name="like"></ui-icon>${formatCount(v.likes)}
            </button>
            <button class=${'btn' + (v.myReaction === -1 ? ' on' : '')} @click=${() => this.react(-1)} title="Таалагдсангүй" aria-pressed=${String(v.myReaction === -1)}>
              <ui-icon name="dislike"></ui-icon>
            </button>
          </div>
          <button class="btn" @click=${() => this.share()}><ui-icon name="share"></ui-icon>Хуваалцах</button>
          <button class=${'btn' + (v.inWatchLater ? ' on' : '')} @click=${() => this.save()}>
            <ui-icon name=${v.inWatchLater ? 'check' : 'clock'}></ui-icon>${v.inWatchLater ? 'Хадгалсан' : 'Дараа үзэх'}
          </button>
        </div>
      </div>
      <div class=${'desc' + (this.descOpen.value ? ' open' : '')} @click=${() => (this.descOpen.value = true)}>
        <span class="stats">${formatViews(v.views)} • ${timeAgo(v.createdAt)}</span>
        <span class="tags">${(v.tags || []).map((t) => '#' + t.replace(/\s+/g, '')).join(' ')}</span>
        <div class="text">${v.description}</div>
        <button class="more" @click=${(e) => {
          e.stopPropagation();
          this.descOpen.update((o) => !o);
        }}>${this.descOpen.value ? 'Хураах' : '...цааш'}</button>
      </div>
    `;
  }

  render() {
    const v = this.video.data.value;
    const err = this.video.error.value;
    if (err) return html`<div class="err"><h2>Видео олдсонгүй</h2><p class="muted">${err.message}</p><a class="btn" href="/">Нүүр хуудас руу</a></div>`;
    const related = this.related.data.value;
    const start = Number(this.query.t) || v?.resumeAt || 0;

    return html`
      <div class="primary">
        ${v
          ? html`<stream-player
              src=${'/api/videos/' + v.id + '/manifest'}
              start-time=${start}
              poster=${v.thumbnail}
              autoplay
              tabindex="0"
              @player-start=${this.onPlayerStart}
              @player-progress=${this.onPlayerProgress}
            ></stream-player>
            ${this.renderInfo(v)}
            <comment-section video-id=${v.id}></comment-section>`
          : html`<div class="skeleton skel-player"></div>`}
      </div>
      <aside class="secondary">
        ${related
          ? related.map((r) => html`<video-card layout="compact" .video=${r}></video-card>`)
          : Array.from({ length: 6 }, () => html`<video-card layout="compact"></video-card>`)}
      </aside>
    `;
  }
}
