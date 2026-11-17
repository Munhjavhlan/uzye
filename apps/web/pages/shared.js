import { html, css } from '@uzye/framework';
import { goToLogin } from '../state.js';

export function signedOut(icon, title, text) {
  return html`
    <div class="signed-out">
      <ui-icon name=${icon}></ui-icon>
      <h2>${title}</h2>
      <p>${text}</p>
      <button class="btn outline" @click=${goToLogin}><ui-icon name="user"></ui-icon>Нэвтрэх</button>
    </div>
  `;
}

export const signedOutStyles = css`
  .signed-out { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 96px 16px; }
  .signed-out ui-icon { width: 120px; height: 120px; color: var(--text-2); opacity: .6; }
  .signed-out h2 { margin: 24px 0 8px; font-size: 24px; font-weight: 400; }
  .signed-out p { margin: 0 0 24px; color: var(--text-2); }
`;
