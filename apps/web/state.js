import { signal, api, Router } from '@uzye/framework';

export const session = signal({ loaded: false, user: null });

export async function loadSession() {
  try {
    const { user } = await api.get('/api/auth/me');
    session.value = { loaded: true, user };
  } catch {
    session.value = { loaded: true, user: null };
  }
}

export async function login(username, password) {
  const { user } = await api.post('/api/auth/login', { username, password });
  session.value = { loaded: true, user };
}

export async function register(data) {
  const { user } = await api.post('/api/auth/register', data);
  session.value = { loaded: true, user };
}

export async function logout() {
  await api.post('/api/auth/logout');
  session.value = { loaded: true, user: null };
  toast('Та системээс гарлаа');
  router.refresh();
}

export const router = new Router([
  { path: '/', component: 'page-home' },
  { path: '/watch/:id', component: 'page-watch' },
  { path: '/results', component: 'page-results' },
  { path: '/@:handle', component: 'page-channel' },
  { path: '/feed/subscriptions', component: 'page-subscriptions' },
  { path: '/feed/history', component: 'page-history' },
  { path: '/playlist/watch-later', component: 'page-watch-later' },
  { path: '/playlist/liked', component: 'page-liked' },
  { path: '/login', component: 'page-login' },
]);

export function goToLogin() {
  const next = location.pathname + location.search;
  router.navigate('/login?next=' + encodeURIComponent(next));
}

export const viewport = signal(window.innerWidth);
window.addEventListener('resize', () => (viewport.value = window.innerWidth));

export const sidebarExpanded = signal(true);
export const drawerOpen = signal(false);

export function sidebarMode() {
  const w = viewport.value;
  const onWatch = router.current.value.component === 'page-watch';
  if (onWatch || w < 640) return 'none';
  if (w < 1100) return 'mini';
  return sidebarExpanded.value ? 'full' : 'mini';
}

export function toggleMenu() {
  const w = viewport.peek();
  const onWatch = router.current.peek().component === 'page-watch';
  if (w >= 1100 && !onWatch) sidebarExpanded.update((v) => !v);
  else drawerOpen.update((v) => !v);
}

export const theme = signal(document.documentElement.dataset.theme || 'light');
export function toggleTheme() {
  const next = theme.peek() === 'dark' ? 'light' : 'dark';
  theme.value = next;
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem('uzye.theme', next);
  } catch {
  }
}

export const loginPrompt = signal(null);

let toastHost = null;
export function setToastHost(el) {
  toastHost = el;
}
export function toast(text, options) {
  toastHost?.show(text, options);
}

export function requireAuth(title, text) {
  if (session.peek().user) return true;
  loginPrompt.value = { title, text };
  return false;
}

export function notifyLibrary(detail) {
  window.dispatchEvent(new CustomEvent('library-change', { detail }));
}

export async function toggleWatchLater(video) {
  if (!requireAuth('Дараа үзэх үү?', 'Видеог дараа үзэх жагсаалтдаа хадгалахын тулд нэвтэрнэ үү.')) return video.inWatchLater;
  const next = !video.inWatchLater;
  try {
    if (next) await api.post('/api/watch-later', { videoId: video.id });
    else await api.del(`/api/watch-later/${video.id}`);
    notifyLibrary({ type: 'watch-later', videoId: video.id, value: next });
    toast(next ? '"Дараа үзэх" жагсаалтад хадгаллаа' : '"Дараа үзэх" жагсаалтаас хаслаа', {
      actionLabel: next ? 'Жагсаалт харах' : 'Буцаах',
      action: next ? () => router.navigate('/playlist/watch-later') : () => toggleWatchLater({ ...video, inWatchLater: false }),
    });
    return next;
  } catch (err) {
    toast('Алдаа гарлаа: ' + err.message);
    return video.inWatchLater;
  }
}
