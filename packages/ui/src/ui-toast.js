import { Component, html, css, signal } from '@uzye/framework';

export class UiToast extends Component {
  current = signal(null);

  static styles = css`
    :host { position: fixed; left: 24px; bottom: 24px; z-index: 1000; }
    .toast {
      display: flex; align-items: center; gap: 16px; min-width: 280px; max-width: 480px;
      padding: 12px 8px 12px 16px; border-radius: 8px;
      background: var(--toast-bg); color: var(--toast-fg); font-size: 14px;
      box-shadow: var(--shadow); animation: up .2s ease-out;
    }
    @keyframes up { from { transform: translateY(20px); opacity: 0; } }
    .text { flex: 1; }
    button { border: 0; background: none; color: var(--link-on-dark); font: inherit; font-weight: 500; cursor: pointer; padding: 8px 12px; border-radius: 18px; }
    button:hover { background: rgba(127,127,127,.2); }
  `;

  show(text, { actionLabel, action } = {}) {
    clearTimeout(this.timer);
    this.current.value = { text, actionLabel, action, id: Math.random() };
    this.timer = setTimeout(() => (this.current.value = null), 4000);
  }

  render() {
    const t = this.current.value;
    if (!t) return '';
    return html`
      <div class="toast" role="status">
        <span class="text">${t.text}</span>
        ${t.actionLabel
          ? html`<button @click=${() => {
              this.current.value = null;
              t.action();
            }}>${t.actionLabel}</button>`
          : ''}
      </div>
    `;
  }
}
