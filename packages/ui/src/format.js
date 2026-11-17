export function formatCount(n) {
  n = Number(n) || 0;
  if (n < 1000) return String(n);
  if (n < 1_000_000) return trim(n / 1000) + ' мян';
  if (n < 1_000_000_000) return trim(n / 1_000_000) + ' сая';
  return trim(n / 1_000_000_000) + ' тэрбум';
}
function trim(x) {
  return x < 10 ? String(Math.floor(x * 10) / 10) : String(Math.floor(x));
}

export const formatViews = (n) => `${formatCount(n)} үзэлт`;

export function formatDuration(sec) {
  sec = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export function timeAgo(date) {
  const sec = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  const units = [
    [31536000, 'жилийн'],
    [2592000, 'сарын'],
    [604800, 'долоо хоногийн'],
    [86400, 'өдрийн'],
    [3600, 'цагийн'],
    [60, 'минутын'],
  ];
  for (const [size, label] of units) {
    const n = Math.floor(sec / size);
    if (n >= 1) return `${n} ${label} өмнө`;
  }
  return 'Дөнгөж сая';
}

export function dayLabel(date) {
  const d = new Date(date);
  const today = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(d)) / 86400000);
  if (diff === 0) return 'Өнөөдөр';
  if (diff === 1) return 'Өчигдөр';
  return `${d.getMonth() + 1}-р сарын ${d.getDate()}`;
}

export function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
