import { signal, effect, untrack } from './signal.js';
import { render } from './html.js';

export function css(strings, ...values) {
  const text = strings.reduce((acc, s, i) => acc + s + (i < values.length ? values[i] : ''), '');
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(text);
  return sheet;
}

function convert(value, type) {
  if (type === Boolean) return value !== null;
  if (value === null) return undefined;
  if (type === Number) return Number(value);
  return value;
}

export class Component extends HTMLElement {
  static sharedStyles = [];
  static styles = [];
  static props = {};
  static shadow = true;

  static define(tag) {
    if (customElements.get(tag)) return;
    for (const name of Object.keys(this.props)) {
      Object.defineProperty(this.prototype, name, {
        get() {
          return this._props[name].value;
        },
        set(v) {
          this._props[name].value = v;
        },
        configurable: true,
      });
    }
    customElements.define(tag, this);
  }

  static get observedAttributes() {
    return Object.entries(this.props)
      .filter(([, def]) => def.attribute)
      .map(([name, def]) => (def.attribute === true ? toKebab(name) : def.attribute));
  }

  constructor() {
    super();
    const ctor = this.constructor;
    this._props = {};
    for (const [name, def] of Object.entries(ctor.props)) {
      const initial = typeof def.default === 'function' ? def.default() : def.default;
      this._props[name] = signal(initial);
    }
    if (ctor.shadow) {
      this.root = this.attachShadow({ mode: 'open' });
      const own = Array.isArray(ctor.styles) ? ctor.styles : [ctor.styles];
      this.root.adoptedStyleSheets = [...Component.sharedStyles, ...own];
    } else {
      this.root = this;
    }
    this._cleanups = [];
    this._mounted = false;
  }

  connectedCallback() {
    for (const name of Object.keys(this.constructor.props)) {
      if (Object.prototype.hasOwnProperty.call(this, name)) {
        const v = this[name];
        delete this[name];
        this[name] = v;
      }
    }
    if (this._mounted) return;
    this._mounted = true;
    this.effect(() => {
      render(this.render(), this.root);
      untrack(() => this.updated());
    });
    this.onMount();
  }

  disconnectedCallback() {
    this._mounted = false;
    for (const fn of this._cleanups.splice(0)) fn();
    this.onUnmount();
  }

  attributeChangedCallback(attr, _old, value) {
    for (const [name, def] of Object.entries(this.constructor.props)) {
      const attrName = def.attribute === true ? toKebab(name) : def.attribute;
      if (attrName === attr) this._props[name].value = convert(value, def.type);
    }
  }

  render() {
    return '';
  }
  onMount() {}
  onUnmount() {}
  updated() {}

  effect(fn) {
    this._cleanups.push(effect(fn));
  }

  listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this._cleanups.push(() => target.removeEventListener(type, handler, options));
  }

  onCleanup(fn) {
    this._cleanups.push(fn);
  }

  $(selector) {
    return this.root.querySelector(selector);
  }

  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

function toKebab(s) {
  return s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
}
