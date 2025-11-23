export function fmtViewers(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export function twitchThumb(url: string, w = 640, h = 360) {
  if (!url || url === '') {
    // Return a data URI placeholder instead of external service
    return createPlaceholderDataUri(w, h, 'No Thumbnail');
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
  return createPlaceholderDataUri(w, h, 'No Thumbnail');
}

/**
 * Creates a placeholder SVG as a data URI
 * No external dependencies, works offline
 */
function createPlaceholderDataUri(width: number, height: number, text: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#1a1a1a"/>
    <text x="50%" y="50%" font-family="system-ui, sans-serif" font-size="16" fill="#666" text-anchor="middle" dominant-baseline="middle">${text}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
