import { Component, html, css, signal, resource, api } from '@uzye/framework';

const CATEGORIES = [
  ['all', 'Бүгд'],
  ['programming', 'Програмчлал'],
  ['nature', 'Байгаль'],
  ['gaming', 'Тоглоом'],
  ['music', 'Хөгжим'],
];

export const gridStyles = css`
  .grid {
    display: grid; gap: 40px 16px;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
  @media (max-width: 640px) { .grid { grid-template-columns: 1fr; gap: 24px; } }
`;

export class PageHome extends Component {
  static props = { params: { default: () => ({}) }, query: { default: () => ({}) } };
  static styles = [
    gridStyles,
    css`
      :host { display: block; padding: 0 24px 40px; }
      .chips { position: sticky; top: 56px; z-index: 5; display: flex; gap: 12px; padding: 12px 0; margin-bottom: 12px; background: var(--bg); overflow-x: auto; scrollbar-width: none; }
      .chip { height: 32px; padding: 0 12px; border: 0; border-radius: 8px; background: var(--bg-chip); color: var(--text); font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap; }
      .chip:hover { background: var(--bg-chip-hover); }
      .chip.sel { background: var(--chip-active-bg); color: var(--chip-active-fg); }
      @media (max-width: 640px) { :host { padding: 0 12px 24px; } }
    `,
  ];

  category = signal('all');
  videos = resource((cat) => api.get('/api/videos?category=' + cat).then((r) => r.videos));

  onMount() {
    this.effect(() => this.videos.load(this.category.value));
  }

  render() {
    const list = this.videos.data.value;
    return html`
      <div class="chips" role="tablist">
        ${CATEGORIES.map(([key, label]) => html`<button class=${'chip' + (this.category.value === key ? ' sel' : '')} @click=${() => (this.category.value = key)}>${label}</button>`)}
      </div>
      <div class="grid">
        ${list
          ? list.map((v) => html`<video-card .video=${v}></video-card>`)
          : Array.from({ length: 8 }, () => html`<video-card></video-card>`)}
      </div>
    `;
  }
}
