import { Component, html, css } from '@uzye/framework';
import { loginPrompt, goToLogin } from '../state.js';

export class LoginDialog extends Component {
  static styles = css`
    dialog {
      width: min(400px, calc(100vw - 32px)); padding: 24px; border: 0; border-radius: 12px;
      background: var(--bg-elev); color: var(--text); box-shadow: var(--shadow);
    }
    dialog::backdrop { background: rgba(0,0,0,.5); }
    h2 { margin: 0 0 8px; font-size: 18px; font-weight: 500; }
    p { margin: 0 0 20px; color: var(--text-2); font-size: 14px; line-height: 20px; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; }
  `;

  onMount() {
    this.effect(() => {
      const prompt = loginPrompt.value;
      const dialog = this.$('dialog');
      if (prompt && !dialog.open) dialog.showModal();
      if (!prompt && dialog.open) dialog.close();
    });
  }

  close = () => {
    loginPrompt.value = null;
  };

  signIn = () => {
    loginPrompt.value = null;
    goToLogin();
  };

  render() {
    const p = loginPrompt.value || {};
    return html`
      <dialog @close=${this.close} @click=${(e) => e.target.tagName === 'DIALOG' && this.close()}>
        <h2>${p.title || 'Нэвтэрнэ үү'}</h2>
        <p>${p.text || 'Энэ үйлдлийг хийхийн тулд нэвтэрнэ үү.'}</p>
        <div class="actions">
          <button class="btn ghost" @click=${this.close}>Болих</button>
          <button class="btn blue" @click=${this.signIn}>Нэвтрэх</button>
        </div>
      </dialog>
    `;
  }
}
