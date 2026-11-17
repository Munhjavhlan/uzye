import { Component, html, css, signal, resource, api } from '@uzye/framework';
import { formatCount } from '@uzye/ui';
import { requireAuth, toast, notifyLibrary } from '../state.js';
import { gridStyles } from './page-home.js';

export class PageChannel extends Component {
  static props = { params: { default: () => ({}) }, query: { default: () => ({}) } };

  sort = signal('latest');
  data = resource((handle, sort) => api.get(`/api/channels/${encodeURIComponent(handle)}?sort=${sort}`));
  busy = signal(false);

  static styles = [
    gridStyles,
    css`
      :host { display: block; max-width: 1284px; margin: 0 auto; padding: 0 24px 40px; }
      .banner { height: 170px; border-radius: 16px; margin-top: 8px; }
      .head { display: flex; align-items: center; gap: 24px; padding: 24px 0; }
      .head .avatar { width: 160px; height: 160px; font-size: 64px; }
      h1 { margin: 0 0 8px; font-size: 36px; font-weight: 700; }
      .meta { color: var(--text-2); margin-bottom: 8px; }
      .about { color: var(--text-2); margin-bottom: 16px; }
      .tabs { display: flex; gap: 24px; border-bottom: 1px solid var(--border); margin-bottom: 16px; }
      .tabs span { padding: 12px 0; font-size: 16px; font-weight: 500; border-bottom: 2px solid var(--text); }
      .chips { display: flex; gap: 12px; margin-bottom: 24px; }
      .chip { height: 32px; padding: 0 12px; border: 0; border-radius: 8px; background: var(--bg-chip); color: var(--text); font-weight: 500; cursor: pointer; }
      .chip.sel { background: var(--chip-active-bg); color: var(--chip-active-fg); }
      .empty { padding: 48px; text-align: center; color: var(--text-2); }
      @media (max-width: 640px) {
        :host { padding: 0 12px 24px; }
        .banner { height: 90px; }
        .head .avatar { width: 72px; height: 72px; font-size: 32px; }
        h1 { font-size: 24px; }
      }
    `,
  ];

  onMount() {
    this.effect(() => this.data.load(this.params.handle, this.sort.value));
  }

  async toggleSubscribe(c) {
    if (!requireAuth(`${c.displayName} сувгийг захиалах уу?`, 'Сувгийг захиалахын тулд нэвтэрнэ үү.')) return;
    this.busy.value = true;
    try {
      const url = `/api/channels/${c.id}/subscribe`;
      const res = c.subscribed ? await api.del(url) : await api.post(url);
      this.data.mutate((d) => ({ ...d, channel: { ...d.channel, ...res } }));
      notifyLibrary({ type: 'subscription' });
      toast(res.subscribed ? 'Захиалга нэмэгдлээ' : 'Захиалга цуцлагдлаа');
    } catch (err) {
      toast('Алдаа: ' + err.message);
    } finally {
      this.busy.value = false;
    }
  }

  render() {
    if (this.data.error.value) return html`<div class="empty"><h2>Суваг олдсонгүй</h2></div>`;
    const d = this.data.data.value;
    if (!d) return html`<div class="banner skeleton"></div>`;
    const c = d.channel;
    document.title = c.displayName + ' — Үзье';
    return html`
      <div class="banner" style=${`background: linear-gradient(120deg, ${c.avatarColor}, ${c.avatarColor}55 60%, var(--bg-chip))`}></div>
      <div class="head">
        <span class="avatar" style=${'background:' + c.avatarColor}>${c.displayName[0]}</span>
        <div>
          <h1>${c.displayName}</h1>
          <div class="meta">@${c.username} • ${formatCount(c.subscribers)} захиалагч • ${c.videoCount} видео</div>
          ${c.description ? html`<div class="about">${c.description}</div>` : ''}
          ${c.isMe
            ? html`<span class="btn">Энэ бол таны суваг</span>`
            : html`<button class=${'btn ' + (c.subscribed ? '' : 'primary')} ?disabled=${this.busy.value} @click=${() => this.toggleSubscribe(c)}>
                ${c.subscribed ? html`<ui-icon name="check"></ui-icon>Захиалсан` : 'Захиалах'}
              </button>`}
        </div>
      </div>
      <div class="tabs"><span>Видео</span></div>
      <div class="chips">
        <button class=${'chip' + (this.sort.value === 'latest' ? ' sel' : '')} @click=${() => (this.sort.value = 'latest')}>Сүүлийнх</button>
        <button class=${'chip' + (this.sort.value === 'popular' ? ' sel' : '')} @click=${() => (this.sort.value = 'popular')}>Алдартай</button>
      </div>
      ${d.videos.length
        ? html`<div class="grid">${d.videos.map((v) => html`<video-card .video=${v}></video-card>`)}</div>`
        : html`<div class="empty">Энэ суваг одоогоор видео нийтлээгүй байна.</div>`}
    `;
  }
}
