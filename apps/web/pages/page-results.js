import { Component, html, css, resource, api } from '@uzye/framework';
import { formatCount } from '@uzye/ui';

export class PageResults extends Component {
  static props = { params: { default: () => ({}) }, query: { default: () => ({}) } };

  results = resource((q) => api.get('/api/search?q=' + encodeURIComponent(q)));

  static styles = css`
    :host { display: block; max-width: 1096px; margin: 0 auto; padding: 16px 24px 40px; }
    .list { display: flex; flex-direction: column; gap: 16px; }
    .channel { display: flex; align-items: center; gap: 16px; padding: 8px 0 24px; border-bottom: 1px solid var(--border); margin-bottom: 8px; }
    .channel .pic { flex: 0 0 min(360px, 45%); display: grid; place-items: center; }
    .channel .avatar { width: 136px; height: 136px; font-size: 56px; }
    .channel h3 { margin: 0 0 4px; font-size: 18px; font-weight: 400; }
    .empty { text-align: center; padding: 80px 16px; color: var(--text-2); }
    .empty ui-icon { width: 96px; height: 96px; opacity: .3; }
    .count { color: var(--text-2); margin: 0 0 16px; }
    @media (max-width: 640px) { :host { padding: 12px; } .channel .avatar { width: 80px; height: 80px; font-size: 32px; } .channel .pic { flex-basis: auto; } }
  `;

  onMount() {
    const q = this.query.search_query || '';
    document.title = q + ' — Үзье';
    this.results.load(q);
  }

  render() {
    const data = this.results.data.value;
    if (!data) return html`<div class="list">${Array.from({ length: 4 }, () => html`<video-card layout="list"></video-card>`)}</div>`;
    if (!data.videos.length && !data.channels.length) {
      return html`<div class="empty"><ui-icon name="search"></ui-icon><h2>Үр дүн олдсонгүй</h2><p>Өөр түлхүүр үг оролдоод үзээрэй.</p></div>`;
    }
    return html`
      <p class="count">"${data.query}" — ${data.videos.length} видео</p>
      ${data.channels.map(
        (c) => html`
          <a class="channel" href=${'/@' + c.username}>
            <div class="pic"><span class="avatar" style=${'background:' + c.avatarColor}>${c.displayName[0]}</span></div>
            <div>
              <h3>${c.displayName}</h3>
              <div class="muted">@${c.username} • ${formatCount(c.subscribers)} захиалагч • ${c.videoCount} видео</div>
              <div class="muted">${c.description}</div>
            </div>
          </a>`
      )}
      <div class="list">${data.videos.map((v) => html`<video-card layout="list" .video=${v}></video-card>`)}</div>
    `;
  }
}
