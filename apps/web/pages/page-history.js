import { Component, html, css, signal, resource, api } from '@uzye/framework';
import { dayLabel, formatDuration } from '@uzye/ui';
import { session, toast } from '../state.js';
import { signedOut, signedOutStyles } from './shared.js';

export class PageHistory extends Component {
  static props = { params: { default: () => ({}) }, query: { default: () => ({}) } };

  filter = signal('');
  history = resource((q) => api.get('/api/history?q=' + encodeURIComponent(q)).then((r) => r.items));

  static styles = [
    signedOutStyles,
    css`
      :host { display: flex; gap: 48px; max-width: 1200px; margin: 0 auto; padding: 24px; }
      .main { flex: 1; min-width: 0; }
      h1 { margin: 0 0 24px; font-size: 36px; font-weight: 700; }
      h2.day { margin: 24px 0 8px; font-size: 20px; font-weight: 700; }
      .side { width: 280px; flex: none; position: sticky; top: 80px; align-self: flex-start; display: flex; flex-direction: column; gap: 16px; }
      .search { display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border); padding: 4px 0; }
      .search:focus-within { border-bottom: 2px solid var(--text); }
      .search input { flex: 1; border: 0; outline: 0; background: none; color: var(--text); font: inherit; font-size: 14px; height: 32px; }
      .side .btn { justify-content: flex-start; }
      .empty { color: var(--text-2); padding: 32px 0; }
      @media (max-width: 900px) { :host { flex-direction: column-reverse; gap: 16px; padding: 12px; } .side { position: static; width: auto; } h1 { font-size: 24px; } }
    `,
  ];

  onMount() {
    document.title = 'Үзсэн түүх — Үзье';
    let timer;
    this.effect(() => {
      const q = this.filter.value;
      if (!session.value.user) return;
      clearTimeout(timer);
      timer = setTimeout(() => this.history.load(q), q ? 250 : 0);
    });
  }

  async remove(video) {
    await api.del('/api/history/' + video.id);
    this.history.mutate((items) => items.filter((i) => i.video.id !== video.id));
    toast('Үзсэн түүхээс хаслаа');
  }

  async clearAll() {
    if (!confirm('Бүх үзсэн түүхийг устгах уу? Энэ үйлдлийг буцаах боломжгүй.')) return;
    await api.del('/api/history');
    this.history.mutate(() => []);
    toast('Үзсэн түүх цэвэрлэгдлээ');
  }

  render() {
    if (!session.value.loaded) return '';
    if (!session.value.user) return signedOut('history', 'Үзсэн видеогоо хянаарай', 'Нэвтэрсэн үед таны үзсэн видеонууд энд хадгалагдана.');

    const items = this.history.data.value;
    const groups = [];
    for (const item of items || []) {
      const label = dayLabel(item.watchedAt);
      const last = groups[groups.length - 1];
      if (last && last[0] === label) last[1].push(item);
      else groups.push([label, [item]]);
    }

    return html`
      <div class="main">
        <h1>Үзсэн түүх</h1>
        ${!items
          ? Array.from({ length: 4 }, () => html`<video-card layout="playlist"></video-card>`)
          : items.length
            ? groups.map(
                ([label, list]) => html`
                  <h2 class="day">${label}</h2>
                  ${list.map(
                    (item) => html`<video-card layout="playlist" removable .video=${item.video}
                      note=${item.position > 1 ? formatDuration(item.position) + ' хүртэл үзсэн' : ''}
                      @remove=${() => this.remove(item.video)}></video-card>`
                  )}`
              )
            : html`<div class="empty">${this.filter.value ? 'Тохирох видео олдсонгүй.' : 'Энэ жагсаалт хоосон байна. Видео үзэхэд энд гарч ирнэ.'}</div>`}
      </div>
      <div class="side">
        <label class="search">
          <ui-icon name="search"></ui-icon>
          <input placeholder="Үзсэн түүхээс хайх" .value=${this.filter.value} @input=${(e) => (this.filter.value = e.target.value)}>
        </label>
        <button class="btn ghost" @click=${() => this.clearAll()}><ui-icon name="trash"></ui-icon>Бүх үзсэн түүхийг устгах</button>
      </div>
    `;
  }
}
