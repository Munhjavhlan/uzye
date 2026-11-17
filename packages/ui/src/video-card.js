import { Component, html, css } from '@uzye/framework';
import { formatViews, formatDuration, timeAgo } from './format.js';

export class VideoCard extends Component {
  static props = {
    video: { default: null },
    layout: { type: String, attribute: true, default: 'grid' },
    index: { type: Number, attribute: true, default: 0 },
    removable: { type: Boolean, attribute: true, default: false },
    note: { type: String, attribute: true, default: '' },
  };

  static styles = css`
    :host { display: block; min-width: 0; }
    .card { display: flex; flex-direction: column; gap: 12px; position: relative; }
    .thumb {
      position: relative; display: block; aspect-ratio: 16 / 9; overflow: hidden;
      border-radius: 12px; background: var(--bg-chip);
    }
    .thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform .25s; }
    .card:hover .thumb img { transform: scale(1.03); }
    .duration {
      position: absolute; right: 6px; bottom: 6px; padding: 1px 5px; border-radius: 4px;
      background: rgba(0,0,0,.8); color: #fff; font-size: 12px; font-weight: 500;
    }
    .progress { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: rgba(255,255,255,.4); }
    .progress > i { display: block; height: 100%; background: var(--brand); }
    .progress ~ .duration { bottom: 10px; }

    .wl {
      position: absolute; top: 6px; right: 6px; width: 32px; height: 32px; padding: 4px;
      border: 0; border-radius: 6px; background: rgba(0,0,0,.75); color: #fff; cursor: pointer;
      opacity: 0; transition: opacity .15s;
    }
    .card:hover .wl, .wl:focus-visible, .wl.on { opacity: 1; }
    .wl ui-icon { width: 24px; height: 24px; }
    .wl .tip {
      position: absolute; right: 36px; top: 4px; padding: 4px 8px; border-radius: 4px; white-space: nowrap;
      background: rgba(0,0,0,.85); font-size: 12px; opacity: 0; pointer-events: none; transition: opacity .15s;
    }
    .wl:hover .tip { opacity: 1; }

    .meta { display: flex; gap: 12px; min-width: 0; }
    .info { min-width: 0; flex: 1; }
    .title { margin: 0 0 4px; font-size: 16px; line-height: 22px; font-weight: 500; color: var(--text); }
    .sub { font-size: 14px; line-height: 20px; color: var(--text-2); }
    .sub a:hover { color: var(--text); }
    .desc { margin-top: 8px; font-size: 12px; color: var(--text-2); }
    .channel-row { display: flex; align-items: center; gap: 8px; margin: 10px 0 4px; }
    .channel-row .avatar { width: 24px; height: 24px; font-size: 11px; }
    .remove { align-self: flex-start; }

    :host([layout="list"]) .card { flex-direction: row; gap: 16px; }
    :host([layout="list"]) .thumb { flex: 0 0 min(360px, 45%); }
    :host([layout="list"]) .title { font-size: 18px; line-height: 26px; font-weight: 400; }
    :host([layout="list"]) .meta .avatar.main { display: none; }

    :host([layout="compact"]) .card { flex-direction: row; gap: 8px; }
    :host([layout="compact"]) .thumb { flex: 0 0 168px; border-radius: 8px; }
    :host([layout="compact"]) .title { font-size: 14px; line-height: 20px; }
    :host([layout="compact"]) .sub { font-size: 12px; line-height: 18px; }
    :host([layout="compact"]) .meta .avatar.main { display: none; }

    :host([layout="playlist"]) .card { flex-direction: row; align-items: center; gap: 12px; padding: 8px; border-radius: 12px; }
    :host([layout="playlist"]) .card:hover { background: var(--bg-hover); }
    :host([layout="playlist"]) .thumb { flex: 0 0 min(246px, 40%); border-radius: 8px; }
    :host([layout="playlist"]) .meta .avatar.main { display: none; }
    :host([layout="playlist"]) .title { font-size: 16px; }
    .num { width: 24px; text-align: center; color: var(--text-2); font-size: 14px; flex: none; }

    @media (max-width: 600px) {
      :host([layout="list"]) .card, :host([layout="playlist"]) .card { flex-direction: column; align-items: stretch; }
      :host([layout="list"]) .thumb, :host([layout="playlist"]) .thumb { flex-basis: auto; }
      .num { display: none; }
    }
  `;

  onWatchLater = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.emit('watch-later-toggle', { video: this.video, card: this });
  };

  onRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.emit('remove', { video: this.video });
  };

  render() {
    const v = this.video;
    if (!v) {
      return html`<div class="card"><div class="thumb skeleton"></div><div class="skeleton" style="height:18px;width:80%"></div><div class="skeleton" style="height:14px;width:50%"></div></div>`;
    }
    const layout = this.layout;
    const watchUrl = `/watch/${v.id}`;
    const channelUrl = `/@${v.channel.username}`;
    const avatar = (cls) => html`<a class=${'avatar ' + cls} href=${channelUrl} style=${'background:' + v.channel.avatarColor} title=${v.channel.displayName}>${v.channel.displayName[0]}</a>`;

    return html`
      <div class="card">
        ${layout === 'playlist' && this.index ? html`<span class="num">${this.index}</span>` : ''}
        <a class="thumb" href=${watchUrl} aria-label=${v.title}>
          <img src=${v.thumbnail} alt="" loading="lazy" decoding="async">
          ${v.progress > 0 ? html`<div class="progress"><i style=${`width:${Math.max(4, v.progress * 100)}%`}></i></div>` : ''}
          <span class="duration">${formatDuration(v.duration)}</span>
          <button class=${'wl' + (v.inWatchLater ? ' on' : '')} @click=${this.onWatchLater} aria-label="Дараа үзэх">
            <ui-icon name=${v.inWatchLater ? 'check' : 'clock'}></ui-icon>
            <span class="tip">${v.inWatchLater ? 'Дараа үзэх-д нэмэгдсэн' : 'Дараа үзэх'}</span>
          </button>
        </a>
        <div class="meta">
          ${avatar('main')}
          <div class="info">
            <a href=${watchUrl}><h3 class="title clamp-2">${v.title}</h3></a>
            ${layout === 'list'
              ? html`
                  <div class="sub">${formatViews(v.views)} • ${timeAgo(v.createdAt)}</div>
                  <div class="channel-row sub">${avatar('')}<a href=${channelUrl}>${v.channel.displayName}</a></div>
                  ${v.description ? html`<div class="desc clamp-1">${v.description}</div>` : ''}`
              : html`
                  <div class="sub"><a href=${channelUrl}>${v.channel.displayName}</a></div>
                  <div class="sub">${formatViews(v.views)} • ${timeAgo(v.createdAt)}</div>`}
            ${this.note ? html`<div class="sub">${this.note}</div>` : ''}
          </div>
        </div>
        ${this.removable ? html`<button class="icon-btn remove" @click=${this.onRemove} title="Жагсаалтаас хасах"><ui-icon name="close"></ui-icon></button>` : ''}
      </div>
    `;
  }
}
