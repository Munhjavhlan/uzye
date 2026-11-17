import { Component, html, css } from '@uzye/framework';

export class PageNotFound extends Component {
  static props = { params: { default: () => ({}) }, query: { default: () => ({}) } };
  static styles = css`
    :host { display: flex; flex-direction: column; align-items: center; padding: 96px 16px; text-align: center; }
    .big { font-size: 96px; font-weight: 700; color: var(--brand); line-height: 1; }
    p { color: var(--text-2); margin-bottom: 24px; }
  `;
  render() {
    return html`<div class="big">404</div><h2>Энэ хуудас олдсонгүй</h2><p>Хаяг буруу эсвэл хуудас устсан байж магадгүй.</p><a class="btn" href="/">Нүүр хуудас руу</a>`;
  }
}
