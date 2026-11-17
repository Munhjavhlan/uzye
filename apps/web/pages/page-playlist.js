import { Component, html, css, resource, api } from '@uzye/framework';
import { session, toast, notifyLibrary } from '../state.js';
import { signedOut, signedOutStyles } from './shared.js';

class PlaylistPage extends Component {
  static props = { params: { default: () => ({}) }, query: { default: () => ({}) } };

  config = {};
  videos = resource(() => api.get(this.config.url).then((r) => r.videos));

  static styles = [
    signedOutStyles,
    css`
      :host { display: flex; gap: 24px; max-width: 1400px; margin: 0 auto; padding: 24px; }
      .hero {
        position: sticky; top: 80px; align-self: flex-start; width: 360px; flex: none; padding: 24px;
        border-radius: 16px; overflow: hidden; color: #fff; isolation: isolate;
      }
      .hero .bg { position: absolute; inset: 0; z-index: -1; background-size: cover; background-position: center; filter: blur(40px) saturate(1.4); transform: scale(1.4); }
      .hero .bg::after { content: ''; position: absolute; inset: 0; background: linear-gradient(rgba(0,0,0,.25), rgba(0,0,0,.7)); }
      .hero img { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 12px; }
      .hero .ph { width: 100%; aspect-ratio: 16/9; border-radius: 12px; background: rgba(255,255,255,.15); display: grid; place-items: center; }
      .hero .ph ui-icon { width: 64px; height: 64px; }
      .hero h1 { margin: 20px 0 12px; font-size: 28px; font-weight: 700; }
      .hero .who { font-weight: 500; }
      .hero .meta { font-size: 12px; opacity: .8; margin: 6px 0 20px; }
      .hero .btn { background: #fff; color: #0f0f0f; width: 100%; }
      .list { flex: 1; min-width: 0; }
      .empty { padding: 32px 8px; color: var(--text-2); }
      @media (max-width: 1000px) { :host { flex-direction: column; padding: 12px; } .hero { position: relative; top: 0; width: auto; } }
    `,
  ];

  onMount() {
    document.title = this.config.title + ' — Үзье';
    this.effect(() => {
      if (session.value.user) this.videos.load();
    });
    this.listen(window, 'library-change', (e) => e.detail.type === this.config.libraryType && this.videos.load());
  }

  async remove(video) {
    await this.config.remove(video);
    this.videos.mutate((list) => list.filter((v) => v.id !== video.id));
  }

  render() {
    const user = session.value.user;
    if (!session.value.loaded) return '';
    if (!user) return signedOut(this.config.icon, this.config.signedOutTitle, this.config.signedOutText);
    const list = this.videos.data.value;
    const first = list && list[0];
    return html`
      <section class="hero">
        <div class="bg" style=${first ? `background-image:url(${first.thumbnail})` : 'background:#555'}></div>
        ${first ? html`<img src=${first.thumbnail} alt="">` : html`<div class="ph"><ui-icon name=${this.config.icon}></ui-icon></div>`}
        <h1>${this.config.title}</h1>
        <div class="who">${user.displayName}</div>
        <div class="meta">${list ? list.length : 0} видео • Хувийн</div>
        ${first ? html`<a class="btn" href=${'/watch/' + first.id}><ui-icon name="play"></ui-icon>Бүгдийг тоглуулах</a>` : ''}
      </section>
      <div class="list">
        ${!list
          ? Array.from({ length: 4 }, () => html`<video-card layout="playlist"></video-card>`)
          : list.length
            ? list.map((v, i) => html`<video-card layout="playlist" removable index=${i + 1} .video=${v} @remove=${() => this.remove(v)}></video-card>`)
            : html`<div class="empty">${this.config.emptyText}</div>`}
      </div>
    `;
  }
}

export class PageWatchLater extends PlaylistPage {
  config = {
    url: '/api/watch-later',
    title: 'Дараа үзэх',
    icon: 'clock',
    libraryType: 'watch-later',
    signedOutTitle: 'Дараа үзэх видеогоо хадгалаарай',
    signedOutText: 'Видеоны 🕒 товч дээр дарж энэ жагсаалтад нэмнэ. Ингэхийн тулд нэвтэрнэ үү.',
    emptyText: 'Энэ жагсаалтад видео алга. Видеоны карт дээрх 🕒 товч эсвэл үзэх хуудсан дээрх "Дараа үзэх" товчийг дарж нэмээрэй.',
    remove: async (v) => {
      await api.del('/api/watch-later/' + v.id);
      toast('"Дараа үзэх"-ээс хаслаа');
    },
  };
}

export class PageLiked extends PlaylistPage {
  config = {
    url: '/api/liked',
    title: 'Таалагдсан видео',
    icon: 'like',
    libraryType: 'liked',
    signedOutTitle: 'Таалагдсан видеогоо энд хараарай',
    signedOutText: 'Like дарсан видеонууд энд хадгалагдана. Нэвтэрнэ үү.',
    emptyText: 'Like дарсан видео алга байна.',
    remove: async (v) => {
      await api.post(`/api/videos/${v.id}/reaction`, { value: 0 });
      notifyLibrary({ type: 'liked' });
      toast('Таалагдсан жагсаалтаас хаслаа');
    },
  };
}
