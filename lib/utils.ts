export function fmtViewers(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}
export function twitchThumb(url: string, w = 640, h = 360) {
  return url.replace("{width}", String(w)).replace("{height}", String(h));
}
