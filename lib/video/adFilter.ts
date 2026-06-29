/**
 * Custom hls.js loader that:
 * 1. Keeps hls.js requests browser-side so Vercel is not in the media path
 * 2. Resolves relative M3U8 URLs to absolute upstream URLs
 * 3. Strips ad segments from media playlists
 *
 * Pure M3U8 helpers live in ./hlsPlaylist so they can be used server-side
 * without pulling in hls.js.
 */

import Hls from 'hls.js';
import { hasAdSegments, processHlsPlaylist, processHlsPlaylistForDirectPlayback, proxyUrl, stripAdSegments } from './hlsPlaylist';

export { hasAdSegments, processHlsPlaylist, processHlsPlaylistForDirectPlayback, proxyUrl, stripAdSegments };

function playlistAlreadyUsesProxyRoutes(playlistText: string): boolean {
  return playlistText.includes('/api/proxy?url=');
}

export function createAdFilterLoader(): typeof Hls.DefaultConfig.loader {
  const DefaultLoader = Hls.DefaultConfig.loader;

  class AdFilterProxyLoader extends (DefaultLoader as any) {
    load(context: any, config: any, callbacks: any): void {
      // Capture the original (pre-proxy) URL so we can resolve relative
      // playlist URIs against it when rewriting.
      const originalUrl: string = context.url;

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
              : processHlsPlaylistForDirectPlayback(response.data, originalUrl);

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
