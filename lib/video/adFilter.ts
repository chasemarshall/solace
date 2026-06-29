/**
 * Custom hls.js loader that:
 * 1. Routes all requests through /api/proxy to bypass CORS
 * 2. Rewrites URLs inside M3U8 playlists so sub-requests also go through the proxy
 * 3. Strips ad segments from media playlists
 *
 * Pure M3U8 helpers live in ./hlsPlaylist so they can be used server-side
 * without pulling in hls.js.
 */

import Hls from 'hls.js';
import { hasAdSegments, processHlsPlaylist, proxyUrl, stripAdSegments } from './hlsPlaylist';

export { hasAdSegments, processHlsPlaylist, proxyUrl, stripAdSegments };

const CUSTOM_PROXY_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_TTV_PROXY_URL?.trim()) || '';

function isAlreadyProxied(url: string): boolean {
  if (url.includes('/api/proxy?url=')) {
    return true;
  }

  if (!CUSTOM_PROXY_BASE) {
    return false;
  }

  const normalizedBase = CUSTOM_PROXY_BASE.replace(/\/+$/, '');
  return url.startsWith(`${normalizedBase}?url=`) || url.startsWith(`${normalizedBase}/?url=`);
}

function playlistAlreadyUsesProxyRoutes(playlistText: string): boolean {
  if (playlistText.includes('/api/proxy?url=')) {
    return true;
  }

  if (!CUSTOM_PROXY_BASE) {
    return false;
  }

  const normalizedBase = CUSTOM_PROXY_BASE.replace(/\/+$/, '');
  return playlistText.includes(`${normalizedBase}/?url=`) || playlistText.includes(`${normalizedBase}?url=`);
}

export function createAdFilterLoader(): typeof Hls.DefaultConfig.loader {
  const DefaultLoader = Hls.DefaultConfig.loader;

  class AdFilterProxyLoader extends (DefaultLoader as any) {
    load(context: any, config: any, callbacks: any): void {
      // Capture the original (pre-proxy) URL so we can resolve relative
      // playlist URIs against it when rewriting.
      const originalUrl: string = context.url;

      // Don't re-wrap URLs that already point at our proxy — manifests
      // served by /api/proxy already rewrite nested URLs through the same
      // endpoint, so a second wrap would create `/api/proxy?url=.../api/proxy?url=...`
      // chains and trip the URL allowlist.
      const proxied = isAlreadyProxied(originalUrl) || originalUrl.startsWith('/api/proxy');

      if (originalUrl.startsWith('https://') && !proxied) {
        console.log('[AdFilter] Proxying:', originalUrl.substring(0, 80) + '...');
        context.url = proxyUrl(originalUrl);
      }

      const originalOnSuccess = callbacks.onSuccess;

      callbacks.onSuccess = (response: any, stats: any, ctx: any, networkDetails: any) => {
        if (typeof response.data === 'string') {
          // Playlists served by /api/proxy already have nested URIs rewritten.
          // Rewriting them again here produces `/api/proxy?url=http://localhost/...`
          // double-wraps that fail the proxy allowlist in Chromium/Firefox.
          if (response.data.includes('#EXTM3U')) {
            const alreadyProxiedPlaylist = playlistAlreadyUsesProxyRoutes(response.data);
            const hadAds = hasAdSegments(response.data);

            response.data = alreadyProxiedPlaylist
              ? stripAdSegments(response.data)
              : processHlsPlaylist(response.data, originalUrl);

            if (hadAds) {
              console.log('[AdFilter] Stripped ad segments from playlist');
            }
          }
        }
        originalOnSuccess(response, stats, ctx, networkDetails);
      };

      super.load(context, config, callbacks);
    }
  }

  return AdFilterProxyLoader as unknown as typeof Hls.DefaultConfig.loader;
}
