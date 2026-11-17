import { Component, html, css, signal } from '@uzye/framework';

const RECENT_KEY = 'uzye.recentSearches';

function loadRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch {
    return [];
  }
}
function saveRecent(list) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 10)));
  } catch {
  }
}

export class SearchBox extends Component {
  static props = {
    fetcher: { default: null },
    value: { type: String, attribute: true, default: '' },
    placeholder: { type: String, attribute: true, default: 'Хайх' },
  };

  query = signal('');
  suggestions = signal([]);
  open = signal(false);
  active = signal(-1);
  recent = signal(loadRecent());

  cache = new Map();
  timer = null;
  controller = null;
  typed = '';

  static styles = css`
    :host { display: block; position: relative; flex: 1; min-width: 0; max-width: 640px; }
    form { display: flex; height: 40px; }
    .field {
      flex: 1; display: flex; align-items: center; min-width: 0;
      border: 1px solid var(--border-strong); border-right: 0; border-radius: 20px 0 0 20px;
      background: var(--bg); padding: 0 4px 0 16px;
    }
    .field:focus-within { border-color: var(--link); box-shadow: inset 0 1px 2px rgba(0,0,0,.2); margin-left: -28px; padding-left: 44px; position: relative; }
    .field:focus-within .lead { display: block; }
    .lead { display: none; position: absolute; left: 14px; width: 20px; height: 20px; color: var(--text); }
    input {
      flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent;
      color: var(--text); font: inherit; font-size: 16px;
    }
    input::-webkit-search-cancel-button { display: none; }
    .clear { width: 36px; height: 36px; }
    .submit {
      width: 64px; border: 1px solid var(--border-strong); border-radius: 0 20px 20px 0;
      background: var(--bg-chip); color: var(--text); cursor: pointer;
    }
    .submit:hover { background: var(--bg-chip-hover); }
    .submit ui-icon { width: 24px; height: 24px; }

    ul {
      position: absolute; top: 44px; left: 0; right: 64px; z-index: 20;
      margin: 0; padding: 12px 0; list-style: none;
      background: var(--bg-elev); border-radius: 12px; box-shadow: var(--shadow);
    }
    li {
      display: flex; align-items: center; gap: 12px; padding: 0 12px 0 16px; height: 32px;
      cursor: pointer; font-size: 16px; color: var(--text);
    }
    li.active, li:hover { background: var(--bg-hover); }
    li ui-icon { width: 20px; height: 20px; color: var(--text-2); }
    li .text { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    li b { font-weight: 600; }
    li .del { font-size: 13px; color: var(--link); background: none; border: 0; cursor: pointer; padding: 4px; }
    li .del:hover { text-decoration: underline; }
    @media (max-width: 640px) {
      .field:focus-within { margin-left: 0; }
      ul { right: 0; }
    }
  `;

  onMount() {
    this.effect(() => {
      this.query.value = this.value;
      this.typed = this.value;
    });
    this.listen(document, 'pointerdown', (e) => {
      if (!e.composedPath().includes(this)) this.open.value = false;
    });
  }

  get items() {
    const q = this.typed.trim();
    if (!q) return this.recent.value.map((text) => ({ text, recent: true }));
    const fromRecent = this.recent.value.filter((r) => r.toLowerCase().startsWith(q.toLowerCase())).slice(0, 3);
    const rest = this.suggestions.value.filter((s) => !fromRecent.includes(s));
    return [...fromRecent.map((text) => ({ text, recent: true })), ...rest.map((text) => ({ text, recent: false }))].slice(0, 10);
  }

  onInput = (e) => {
    const q = e.target.value;
    this.query.value = q;
    this.typed = q;
    this.active.value = -1;
    this.open.value = true;
    this.requestSuggestions(q);
  };

  requestSuggestions(q) {
    clearTimeout(this.timer);
    const key = q.trim().toLowerCase();
    if (!key) {
      this.suggestions.value = [];
      return;
    }
    if (this.cache.has(key)) {
      this.suggestions.value = this.cache.get(key);
      return;
    }
    this.timer = setTimeout(() => this.fetchSuggestions(key), 150);
  }

  async fetchSuggestions(key) {
    if (!this.fetcher) return;
    this.controller?.abort();
    this.controller = new AbortController();
    try {
      const list = await this.fetcher(key, { signal: this.controller.signal });
      this.cache.set(key, list);
      if (this.typed.trim().toLowerCase() === key) this.suggestions.value = list;
    } catch (err) {
      if (err.name !== 'AbortError') console.warn('Autocomplete алдаа:', err);
    }
  }

  onKeyDown = (e) => {
    const items = this.items;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this.open.value = true;
      if (!items.length) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      let next = this.active.value + step;
      if (next >= items.length) next = -1;
      if (next < -1) next = items.length - 1;
      this.active.value = next;
      this.query.value = next === -1 ? this.typed : items[next].text;
    } else if (e.key === 'Escape') {
      this.open.value = false;
      this.active.value = -1;
      this.query.value = this.typed;
    }
  };

  submit = (e) => {
    e?.preventDefault();
    const q = this.query.value.trim();
    if (!q) return;
    const recent = [q, ...this.recent.value.filter((r) => r !== q)];
    this.recent.value = recent;
    saveRecent(recent);
    this.open.value = false;
    this.active.value = -1;
    this.typed = q;
    this.$('input').blur();
    this.emit('search', { query: q });
  };

  pick(text) {
    this.query.value = text;
    this.submit();
  }

  removeRecent(e, text) {
    e.stopPropagation();
    const recent = this.recent.value.filter((r) => r !== text);
    this.recent.value = recent;
    saveRecent(recent);
  }

  clear = () => {
    this.query.value = '';
    this.typed = '';
    this.suggestions.value = [];
    this.$('input').focus();
  };

  highlight(text) {
    const q = this.typed.trim().toLowerCase();
    const i = text.toLowerCase().indexOf(q);
    if (!q || i < 0) return html`<b>${text}</b>`;
    return html`<b>${text.slice(0, i)}</b>${text.slice(i, i + q.length)}<b>${text.slice(i + q.length)}</b>`;
  }

  render() {
    const items = this.items;
    const showList = this.open.value && items.length > 0;
    return html`
      <form role="search" @submit=${this.submit}>
        <div class="field">
          <ui-icon class="lead" name="search"></ui-icon>
          <input
            type="search"
            name="q"
            autocomplete="off"
            spellcheck="false"
            placeholder=${this.placeholder}
            aria-label="Хайх"
            aria-autocomplete="list"
            aria-expanded=${String(showList)}
            .value=${this.query.value}
            @input=${this.onInput}
            @keydown=${this.onKeyDown}
            @focus=${() => (this.open.value = true)}
          >
          ${this.query.value
            ? html`<button type="button" class="icon-btn clear" @click=${this.clear} aria-label="Цэвэрлэх"><ui-icon name="close"></ui-icon></button>`
            : ''}
        </div>
        <button class="submit" type="submit" aria-label="Хайх"><ui-icon name="search"></ui-icon></button>
      </form>
      ${showList
        ? html`<ul role="listbox">
            ${items.map(
              (item, i) => html`
                <li role="option" class=${i === this.active.value ? 'active' : ''} @pointerdown=${(e) => e.preventDefault()} @click=${() => this.pick(item.text)}>
                  <ui-icon name=${item.recent ? 'history' : 'search'}></ui-icon>
                  <span class="text">${this.highlight(item.text)}</span>
                  ${item.recent ? html`<button class="del" type="button" @click=${(e) => this.removeRecent(e, item.text)}>Устгах</button>` : ''}
                </li>`
            )}
          </ul>`
        : ''}
    `;
  }
}
