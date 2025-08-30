export function fmtViewers(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export function twitchThumb(url: string, w = 640, h = 360) {
  if (!url || url === '') {
    // Return a placeholder image if no URL provided
    return `https://via.placeholder.com/${w}x${h}/1a1a1a/666666?text=No+Thumbnail`;
  }
  
  // Handle different Twitch thumbnail URL formats
  if (url.includes('{width}') && url.includes('{height}')) {
    return url.replace("{width}", String(w)).replace("{height}", String(h));
  }
  
  // If it's already a direct URL, return as is
  if (url.startsWith('http')) {
    return url;
  }
  
  // Fallback to placeholder
  return `https://via.placeholder.com/${w}x${h}/1a1a1a/666666?text=No+Thumbnail`;
}
