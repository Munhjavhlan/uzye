import { signal } from './signal.js';
import { Component } from './component.js';
import { html } from './html.js';

function compile(path) {
  const keys = [];
  const pattern = path
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:(\w+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    })
    .replace(/\*/g, '.*');
  return { re: new RegExp(`^${pattern}/?$`), keys };
}

export class Router {
  constructor(routes, { notFound = 'page-not-found' } = {}) {
    this.routes = routes.map((r) => ({ ...r, ...compile(r.path) }));
    this.notFound = notFound;
    this.current = signal(this.match(location.href));

    window.addEventListener('popstate', () => {
      this.current.value = this.match(location.href);
    });

    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.composedPath().find((n) => n instanceof HTMLAnchorElement);
      if (!a || !a.href || a.target === '_blank' || a.hasAttribute('download')) return;
      if (a.origin !== location.origin) return;
      e.preventDefault();
      this.navigate(a.pathname + a.search);
    });
  }

  match(href) {
    const url = new URL(href, location.origin);
    for (const route of this.routes) {
      const m = route.re.exec(url.pathname);
      if (!m) continue;
      const params = {};
      route.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { component: route.component, params, query: Object.fromEntries(url.searchParams), path: url.pathname, url: url.pathname + url.search };
    }
    return { component: this.notFound, params: {}, query: {}, path: url.pathname, url: url.pathname + url.search };
  }

  navigate(url, { replace = false } = {}) {
    if (url === location.pathname + location.search) return;
    if (replace) history.replaceState({}, '', url);
    else history.pushState({}, '', url);
    this.current.value = this.match(location.href);
    window.scrollTo(0, 0);
  }

  refresh() {
    this.current.value = this.match(location.href);
  }
}

export class RouterView extends Component {
  static shadow = false;
  static props = { router: { default: null } };

  render() {
    const router = this.router;
    if (!router) return '';
    const route = router.current.value;
    if (this._route !== route) {
      this._route = route;
      const page = document.createElement(route.component);
      page.params = route.params;
      page.query = route.query;
      this._page = page;
    }
    return html`${this._page}`;
  }
}
