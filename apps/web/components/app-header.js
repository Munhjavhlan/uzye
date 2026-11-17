import { Component, html, css, signal, api } from '@uzye/framework';
import { session, router, toggleMenu, toggleTheme, theme, logout, goToLogin, viewport } from '../state.js';

const suggestFetcher = async (q, { signal: abortSignal }) => {
  const { suggestions } = await api.get('/api/suggest?q=' + encodeURIComponent(q), { signal: abortSignal });
  return suggestions;
};

export class AppHeader extends Component {
  menuOpen = signal(false);
  mobileSearch = signal(false);

  static styles = css`
    :host { display: block; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 16px; height: 56px; padding: 0 16px; }
    .start { display: flex; align-items: center; gap: 16px; flex: none; }
    .logo { display: flex; align-items: center; gap: 4px; height: 40px; padding-right: 8px; }
    .logo svg { width: 30px; height: 30px; }
    .logo .word { font-size: 21px; font-weight: 700; letter-spacing: -.8px; color: var(--text); }
    .logo sup { font-size: 10px; color: var(--text-2); font-weight: 400; margin-left: 2px; }
    .center { flex: 1; display: flex; justify-content: center; min-width: 0; }
    .end { display: flex; align-items: center; gap: 8px; flex: none; }
    .user-btn { width: 32px; height: 32px; font-size: 14px; border: 0; cursor: pointer; }
    .menu-wrap { position: relative; }
    .menu {
      position: absolute; right: 0; top: 44px; width: 300px; padding: 8px 0; z-index: 50;
      background: var(--bg-elev); border-radius: 12px; box-shadow: var(--shadow);
    }
    .menu .me { display: flex; gap: 16px; padding: 8px 16px 16px; border-bottom: 1px solid var(--border); margin-bottom: 8px; }
    .menu .me .avatar { width: 40px; height: 40px; }
    .menu .name { font-size: 16px; }
    .menu .me a { color: var(--link); display: block; margin-top: 8px; }
    .menu button, .menu a.item {
      display: flex; align-items: center; gap: 16px; width: 100%; height: 40px; padding: 0 16px;
      border: 0; background: none; color: var(--text); font: inherit; font-size: 14px; cursor: pointer; text-align: left;
    }
    .menu button:hover, .menu a.item:hover { background: var(--bg-hover); }
    .search-icon { display: none; }
    @media (max-width: 640px) {
      .center { display: none; }
      .search-icon { display: inline-grid; }
      :host([searching]) .start, :host([searching]) .end { display: none; }
      :host([searching]) .center { display: flex; justify-content: flex-start; }
      header { gap: 8px; padding: 0 8px; }
    }
    @media (max-width: 480px) {
      .theme-btn, .logo sup { display: none; }
      .signin span { display: none; }
      .signin { padding: 0 8px; }
      .start { gap: 4px; }
    }
  `;

  onMount() {
    this.listen(document, 'pointerdown', (e) => {
      if (!e.composedPath().includes(this.$('.menu-wrap'))) this.menuOpen.value = false;
    });
    this.effect(() => this.toggleAttribute('searching', this.mobileSearch.value && viewport.value <= 640));
  }

  onSearch = (e) => {
    this.mobileSearch.value = false;
    router.navigate('/results?search_query=' + encodeURIComponent(e.detail.query));
  };

  render() {
    const user = session.value.user;
    const route = router.current.value;
    const currentQuery = route.component === 'page-results' ? route.query.search_query || '' : '';

    return html`
      <header>
        <div class="start">
          ${this.mobileSearch.value ? '' : html`<button class="icon-btn" @click=${toggleMenu} aria-label="Цэс"><ui-icon name="menu"></ui-icon></button>`}
          <a class="logo" href="/" title="Үзье нүүр">
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fb7185"></stop><stop offset="1" stop-color="#e11d48"></stop></linearGradient></defs>
              <circle cx="16" cy="16" r="15" fill="url(#lg)"></circle><path d="M13 10.5v11l9-5.5z" fill="#fff"></path>
            </svg>
            <span class="word">Үзье</span><sup>MN</sup>
          </a>
        </div>

        <div class="center">
          ${this.mobileSearch.value ? html`<button class="icon-btn" @click=${() => (this.mobileSearch.value = false)} aria-label="Буцах"><ui-icon name="back"></ui-icon></button>` : ''}
          <search-box .fetcher=${suggestFetcher} .value=${currentQuery} @search=${this.onSearch}></search-box>
        </div>

        <div class="end">
          <button class="icon-btn search-icon" @click=${() => (this.mobileSearch.value = true)} aria-label="Хайх"><ui-icon name="search"></ui-icon></button>
          <button class="icon-btn theme-btn" @click=${toggleTheme} title=${theme.value === 'dark' ? 'Цайвар горим' : 'Бараан горим'} aria-label="Горим солих"><ui-icon name="moon"></ui-icon></button>
          ${!session.value.loaded
            ? ''
            : user
              ? html`
                  <div class="menu-wrap">
                    <button class="avatar user-btn" style=${'background:' + user.avatarColor} @click=${() => this.menuOpen.update((v) => !v)} aria-label="Хэрэглэгчийн цэс">${user.displayName[0]}</button>
                    ${this.menuOpen.value
                      ? html`<div class="menu" @click=${() => (this.menuOpen.value = false)}>
                          <div class="me">
                            <span class="avatar" style=${'background:' + user.avatarColor}>${user.displayName[0]}</span>
                            <div><div class="name">${user.displayName}</div><div class="muted">@${user.username}</div><a href=${'/@' + user.username}>Сувгаа үзэх</a></div>
                          </div>
                          <a class="item" href="/feed/history"><ui-icon name="history"></ui-icon>Үзсэн түүх</a>
                          <a class="item" href="/playlist/watch-later"><ui-icon name="clock"></ui-icon>Дараа үзэх</a>
                          <button @click=${toggleTheme}><ui-icon name="moon"></ui-icon>Горим: ${theme.value === 'dark' ? 'Бараан' : 'Цайвар'}</button>
                          <button @click=${logout}><ui-icon name="logout"></ui-icon>Гарах</button>
                        </div>`
                      : ''}
                  </div>`
              : html`<button class="btn outline signin" @click=${goToLogin} aria-label="Нэвтрэх"><ui-icon name="user"></ui-icon><span>Нэвтрэх</span></button>`}
        </div>
      </header>
    `;
  }
}
