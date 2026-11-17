import { css } from '@uzye/framework';

export const baseStyles = css`
  :host { box-sizing: border-box; }
  *, *::before, *::after { box-sizing: inherit; }
  [hidden] { display: none !important; }
  a { color: inherit; text-decoration: none; }
  button { font: inherit; color: inherit; }
  img { display: block; max-width: 100%; }

  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    height: 36px; padding: 0 16px; border: 0; border-radius: 18px;
    background: var(--bg-chip); color: var(--text);
    font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap;
    transition: background .15s;
  }
  .btn:hover { background: var(--bg-chip-hover); }
  .btn:disabled { opacity: .5; cursor: default; }
  .btn.primary { background: var(--text); color: var(--bg); }
  .btn.primary:hover { opacity: .85; }
  .btn.blue { background: var(--link); color: #fff; }
  .btn.outline { background: transparent; border: 1px solid var(--border); color: var(--link); }
  .btn.outline:hover { background: var(--link-bg); border-color: transparent; }
  .btn.ghost { background: transparent; }
  .btn.ghost:hover { background: var(--bg-hover); }
  .btn ui-icon { width: 22px; height: 22px; }

  .icon-btn {
    display: inline-grid; place-items: center;
    width: 40px; height: 40px; padding: 0; border: 0; border-radius: 50%;
    background: transparent; color: var(--text); cursor: pointer;
  }
  .icon-btn:hover { background: var(--bg-hover); }
  .icon-btn:active { background: var(--bg-active); }
  .icon-btn ui-icon { width: 24px; height: 24px; }

  .avatar {
    display: inline-grid; place-items: center; flex: none;
    width: 36px; height: 36px; border-radius: 50%;
    color: #fff; font-weight: 500; font-size: 16px; text-transform: uppercase;
    user-select: none;
  }

  .skeleton {
    background: linear-gradient(90deg, var(--bg-chip) 25%, var(--bg-hover) 50%, var(--bg-chip) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.2s infinite;
    border-radius: 8px;
  }
  @keyframes shimmer { to { background-position: -200% 0; } }

  .muted { color: var(--text-2); }
  .clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .clamp-1 { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;
