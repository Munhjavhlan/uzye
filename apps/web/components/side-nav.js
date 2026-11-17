import { Component, html, css, resource, api } from '@uzye/framework';
import { session, router, sidebarMode, drawerOpen, toggleMenu } from '../state.js';

const MAIN = [
  { href: '/', icon: 'home', label: 'Нүүр' },
  { href: '/feed/subscriptions', icon: 'subscriptions', label: 'Захиалга' },
];
const YOU = [
  { href: '/feed/history', icon: 'history', label: 'Үзсэн түүх' },
  { href: '/playlist/watch-later', icon: 'clock', label: 'Дараа үзэх' },
  { href: '/playlist/liked', icon: 'like', label: 'Таалагдсан' },
];

export class SideNav extends Component {
  subs = resource(() => api.get('/api/subscriptions').then((r) => r.channels));

  static styles = css`
    :host { display: block; flex: none; }
    nav { position: sticky; top: 56px; height: calc(100vh - 56px); overflow-y: auto; padding: 0 12px 16px; scrollbar-width: thin; }
    .full { width: 240px; }
    .mini { width: 72px; padding: 4px; }
    a.item {
      display: flex; align-items: center; gap: 24px; height: 40px; padding: 0 12px; border-radius: 10px;
      font-size: 14px; color: var(--text);
    }
    a.item:hover { background: var(--bg-hover); }
    a.item.active { background: var(--bg-chip); font-weight: 500; }
    a.item .avatar { width: 24px; height: 24px; font-size: 12px; }
    .mini a.item { flex-direction: column; justify-content: center; gap: 6px; height: 74px; padding: 0; font-size: 10px; }
    .mini a.item.active { background: none; }
    hr { border: 0; border-top: 1px solid var(--border); margin: 12px 0; }
    h3 { margin: 0; padding: 6px 12px; font-size: 16px; font-weight: 500; }
    .signin { padding: 8px 12px 0; font-size: 14px; line-height: 20px; }
    .signin .btn { margin-top: 12px; }
    footer { padding: 16px 12px; font-size: 12px; color: var(--text-2); line-height: 18px; }

    .scrim { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 200; animation: fade .2s; }
    .drawer { position: fixed; top: 0; left: 0; bottom: 0; width: 240px; z-index: 201; background: var(--bg); animation: slide .2s ease-out; }
    .drawer nav { position: static; height: calc(100vh - 56px); }
    .drawer .head { display: flex; align-items: center; gap: 16px; height: 56px; padding: 0 16px; }
    .drawer .head b { font-size: 20px; }
    @keyframes slide { from { transform: translateX(-100%); } }
    @keyframes fade { from { opacity: 0; } }
  `;

  onMount() {
    this.effect(() => {
      if (session.value.user) this.subs.load();
      else this.subs.data.value = null;
    });
    this.listen(window, 'library-change', (e) => e.detail.type === 'subscription' && this.subs.load());
  }

  link(item, path) {
    return html`<a class=${'item' + (path === item.href ? ' active' : '')} href=${item.href}><ui-icon name=${item.icon}></ui-icon><span>${item.label}</span></a>`;
  }

  renderFull(path) {
    const user = session.value.user;
    const channels = this.subs.data.value || [];
    return html`
      ${MAIN.map((i) => this.link(i, path))}
      <hr>
      <h3>Та</h3>
      ${YOU.map((i) => this.link(i, path))}
      ${user
        ? html`<a class="item" href=${'/@' + user.username}><ui-icon name="channel"></ui-icon><span>Таны суваг</span></a>`
        : html`<hr><div class="signin">Видеонд like дарах, сэтгэгдэл бичих, захиалахын тулд нэвтэрнэ үү.<br>
            <a class="btn outline" href=${'/login?next=' + encodeURIComponent(path)}><ui-icon name="user"></ui-icon>Нэвтрэх</a></div>`}
      ${channels.length
        ? html`<hr><h3>Захиалсан сувгууд</h3>
            ${channels.map((c) => html`<a class=${'item' + (path === '/@' + c.username ? ' active' : '')} href=${'/@' + c.username}><span class="avatar" style=${'background:' + c.avatarColor}>${c.displayName[0]}</span><span class="clamp-1">${c.displayName}</span></a>`)}`
        : ''}
      <hr>
      <footer>Үзье © 2026<br></footer>
    `;
  }

  render() {
    const path = router.current.value.path;
    const mode = sidebarMode();
    return html`
      ${mode === 'full' ? html`<nav class="full">${this.renderFull(path)}</nav>` : ''}
      ${mode === 'mini' ? html`<nav class="mini">${[...MAIN, ...YOU.slice(0, 2)].map((i) => this.link(i, path))}</nav>` : ''}
      ${drawerOpen.value
        ? html`
            <div class="scrim" @click=${() => (drawerOpen.value = false)}></div>
            <div class="drawer">
              <div class="head"><button class="icon-btn" @click=${toggleMenu} aria-label="Хаах"><ui-icon name="menu"></ui-icon></button><b>Үзье</b></div>
              <nav class="full">${this.renderFull(path)}</nav>
            </div>`
        : ''}
    `;
  }
}
