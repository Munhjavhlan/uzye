import { Component, html, css, resource, api } from '@uzye/framework';
import { session } from '../state.js';
import { gridStyles } from './page-home.js';
import { signedOut, signedOutStyles } from './shared.js';

export class PageSubscriptions extends Component {
  static props = { params: { default: () => ({}) }, query: { default: () => ({}) } };

  feed = resource(() => api.get('/api/subscriptions'));

  static styles = [
    gridStyles,
    signedOutStyles,
    css`
      :host { display: block; max-width: 1284px; margin: 0 auto; padding: 24px 24px 40px; }
      .channels { display: flex; gap: 24px; overflow-x: auto; padding-bottom: 16px; margin-bottom: 16px; border-bottom: 1px solid var(--border); }
      .channels a { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 88px; font-size: 12px; text-align: center; }
      .channels .avatar { width: 64px; height: 64px; font-size: 26px; }
      h2 { margin: 0 0 16px; font-size: 20px; }
      .empty { padding: 48px; text-align: center; color: var(--text-2); }
      @media (max-width: 640px) { :host { padding: 12px; } }
    `,
  ];

  onMount() {
    document.title = 'Захиалга — Үзье';
    this.effect(() => session.value.user && this.feed.load());
  }

  render() {
    if (!session.value.loaded) return '';
    if (!session.value.user) return signedOut('subscriptions', 'Шинэ видеог алгасахгүй', 'Дуртай сувгуудынхаа шинэ видеог харахын тулд нэвтэрнэ үү.');
    const d = this.feed.data.value;
    if (!d) return html`<div class="grid">${Array.from({ length: 6 }, () => html`<video-card></video-card>`)}</div>`;
    if (!d.channels.length) {
      return html`<div class="empty"><h2>Та одоогоор суваг захиалаагүй байна</h2><p>Видео үзэх хуудас эсвэл сувгийн хуудсан дээрх "Захиалах" товчийг дарна уу.</p><a class="btn" href="/">Видео үзэх</a></div>`;
    }
    return html`
      <div class="channels">
        ${d.channels.map((c) => html`<a href=${'/@' + c.username}><span class="avatar" style=${'background:' + c.avatarColor}>${c.displayName[0]}</span><span class="clamp-2">${c.displayName}</span></a>`)}
      </div>
      <h2>Сүүлийн видеонууд</h2>
      <div class="grid">${d.videos.map((v) => html`<video-card .video=${v}></video-card>`)}</div>
    `;
  }
}
