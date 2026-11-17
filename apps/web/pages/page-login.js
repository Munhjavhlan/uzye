import { Component, html, css, signal } from '@uzye/framework';
import { login, register, router, toast } from '../state.js';

export class PageLogin extends Component {
  static props = { params: { default: () => ({}) }, query: { default: () => ({}) } };

  mode = signal('login');
  error = signal('');
  busy = signal(false);

  static styles = css`
    :host { display: grid; place-items: center; min-height: calc(100vh - 56px); padding: 24px; }
    .card { width: min(448px, 100%); padding: 40px 36px; border: 1px solid var(--border); border-radius: 16px; background: var(--bg); }
    .logo { display: flex; justify-content: center; margin-bottom: 8px; }
    .logo svg { width: 48px; height: 48px; }
    h1 { margin: 0 0 8px; text-align: center; font-size: 24px; font-weight: 400; }
    .lead { text-align: center; color: var(--text-2); margin: 0 0 24px; font-size: 16px; }
    label { display: block; margin-bottom: 16px; }
    label span { display: block; font-size: 12px; color: var(--text-2); margin-bottom: 6px; }
    input {
      width: 100%; height: 48px; padding: 0 14px; border: 1px solid var(--border-strong); border-radius: 8px;
      background: transparent; color: var(--text); font: inherit; font-size: 16px; outline: none;
    }
    input:focus { border: 2px solid var(--link); padding: 0 13px; }
    .err { padding: 10px 12px; margin-bottom: 16px; border-radius: 8px; background: #fde8e8; color: #b91c1c; font-size: 14px; }
    .row { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; }
    .link { border: 0; background: none; color: var(--link); font: inherit; font-weight: 500; cursor: pointer; padding: 8px; }
    .hint { margin-top: 24px; padding: 12px; border-radius: 8px; background: var(--bg-chip); font-size: 13px; color: var(--text-2); }
    .hint code { color: var(--text); }
  `;

  onMount() {
    document.title = 'Нэвтрэх — Үзье';
    this.$('input')?.focus();
  }

  submit = async (e) => {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.target));
    this.error.value = '';
    this.busy.value = true;
    try {
      if (this.mode.value === 'login') await login(form.username, form.password);
      else await register(form);
      toast(this.mode.value === 'login' ? 'Тавтай морил!' : 'Бүртгэл амжилттай үүслээ');
      const next = this.query.next && this.query.next.startsWith('/') && !this.query.next.startsWith('//') ? this.query.next : '/';
      router.navigate(next, { replace: true });
    } catch (err) {
      this.error.value = err.message;
    } finally {
      this.busy.value = false;
    }
  };

  switchMode = () => {
    this.mode.update((m) => (m === 'login' ? 'register' : 'login'));
    this.error.value = '';
  };

  render() {
    const isLogin = this.mode.value === 'login';
    return html`
      <form class="card" @submit=${this.submit}>
        <div class="logo">
          <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#f43f5e"></circle><path d="M13 10.5v11l9-5.5z" fill="#fff"></path></svg>
        </div>
        <h1>${isLogin ? 'Нэвтрэх' : 'Бүртгүүлэх'}</h1>
        <p class="lead">${isLogin ? 'Үзье-д үргэлжлүүлэх' : 'Шинэ бүртгэл үүсгэх'}</p>
        ${this.error.value ? html`<div class="err" role="alert">${this.error.value}</div>` : ''}
        ${isLogin ? '' : html`<label><span>Харагдах нэр</span><input name="displayName" maxlength="40" placeholder="Жишээ: Болд"></label>`}
        <label><span>Хэрэглэгчийн нэр</span><input name="username" required autocomplete="username" placeholder="латин үсэг, тоо"></label>
        <label><span>Нууц үг</span><input name="password" type="password" required minlength="6" autocomplete=${isLogin ? 'current-password' : 'new-password'}></label>
        <div class="row">
          <button type="button" class="link" @click=${this.switchMode}>${isLogin ? 'Бүртгэл үүсгэх' : 'Нэвтрэх рүү буцах'}</button>
          <button class="btn blue" type="submit" ?disabled=${this.busy.value}>${isLogin ? 'Нэвтрэх' : 'Бүртгүүлэх'}</button>
        </div>
        <div class="hint">Туршилтын бүртгэл: <code>demo</code> / <code>demo1234</code></div>
      </form>
    `;
  }
}
