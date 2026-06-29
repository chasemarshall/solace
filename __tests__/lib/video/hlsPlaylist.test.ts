import { describe, it, expect } from 'vitest';
import {
  hasAdSegments,
  isLikelyAdResourceUrl,
  processHlsPlaylist,
  processHlsPlaylistForDirectPlayback,
  proxyUrl,
  rewritePlaylistUrls,
  stripAdSegments,
} from '@/lib/video/hlsPlaylist';

describe('hlsPlaylist', () => {
  describe('hasAdSegments', () => {
    it('detects DATERANGE stitched-ad', () => {
      const m3u8 = [
        '#EXTM3U',
        '#EXT-X-VERSION:6',
        '#EXT-X-DATERANGE:ID="stitched-ad-1",CLASS="twitch-stitched-ad",START-DATE="2026-01-01T00:00:00Z",DURATION=30.0',
        '#EXTINF:2.0,live',
        'segment.ts',
      ].join('\n');
      expect(hasAdSegments(m3u8)).toBe(true);
    });

    it('detects SCTE35-OUT', () => {
      expect(hasAdSegments('#EXTM3U\n#EXT-X-SCTE35-OUT\n')).toBe(true);
    });

    it('detects generic SCTE35 splice markers', () => {
      expect(hasAdSegments('#EXTM3U\n#EXT-X-SCTE35:/DAvAAAAAAAA///wBQb+AAAAAA==\n')).toBe(true);
    });

    it('detects CUE-OUT-CONT when joining during an ad break', () => {
      expect(hasAdSegments('#EXTM3U\n#EXT-X-CUE-OUT-CONT:ElapsedTime=15,Duration=30\n')).toBe(true);
    });

    it('detects ad dateranges that only expose Twitch ad tracking metadata', () => {
      const m3u8 = [
        '#EXTM3U',
        '#EXT-X-DATERANGE:ID="ad-1",START-DATE="2026-01-01T00:00:00Z",X-TV-TWITCH-AD-URL="https://ads.example/ad",X-TV-TWITCH-AD-POD-LENGTH="1"',
        '#EXTINF:2.0,live',
        'segment.ts',
      ].join('\n');
      expect(hasAdSegments(m3u8)).toBe(true);
    });

    it('detects ad dateranges that only expose Twitch live sequence metadata', () => {
      const m3u8 = [
        '#EXTM3U',
        '#EXT-X-DATERANGE:ID="ad-2",START-DATE="2026-01-01T00:00:00Z",X-TV-TWITCH-LIVE-SEQUENCE="9012",X-TV-TWITCH-ELAPSED-SECS="4.5"',
        '#EXTINF:2.0,live',
        'segment.ts',
      ].join('\n');
      expect(hasAdSegments(m3u8)).toBe(true);
    });

    it('returns false for clean playlists', () => {
      const m3u8 = '#EXTM3U\n#EXT-X-VERSION:6\n#EXTINF:2.0,live\nseg.ts\n';
      expect(hasAdSegments(m3u8)).toBe(false);
    });

    it('detects explicit ad resource URLs', () => {
      const m3u8 = '#EXTM3U\n#EXTINF:2.0,\nhttps://video-edge.example.net/path/stitched-ad-1.ts\n';
      expect(hasAdSegments(m3u8)).toBe(true);
    });
  });

  describe('stripAdSegments', () => {
    it('removes DATERANGE-bounded ad segments using DURATION', () => {
      const input = [
        '#EXTM3U',
        '#EXT-X-VERSION:6',
        '#EXT-X-TARGETDURATION:3',
        '#EXT-X-DATERANGE:ID="stitched-ad-1",CLASS="twitch-stitched-ad",DURATION=4.0',
        '#EXT-X-DISCONTINUITY',
        '#EXTINF:2.0,ad',
        'ad-1.ts',
        '#EXTINF:2.0,ad',
        'ad-2.ts',
        '#EXT-X-DISCONTINUITY',
        '#EXTINF:2.0,live',
        'live-1.ts',
        '#EXTINF:2.0,live',
        'live-2.ts',
      ].join('\n');

      const out = stripAdSegments(input);
      expect(out).not.toContain('ad-1.ts');
      expect(out).not.toContain('ad-2.ts');
      expect(out).not.toContain('twitch-stitched-ad');
      expect(out).toContain('live-1.ts');
      expect(out).toContain('live-2.ts');
      expect(out).toContain('#EXTM3U');
    });

    it('exits ad mode on second discontinuity when no DURATION is set', () => {
      const input = [
        '#EXTM3U',
        '#EXT-X-DATERANGE:ID="stitched-ad-2",CLASS="twitch-stitched-ad"',
        '#EXT-X-DISCONTINUITY',
        '#EXTINF:2.0,ad',
        'ad.ts',
        '#EXT-X-DISCONTINUITY',
        '#EXTINF:2.0,live',
        'live.ts',
      ].join('\n');

      const out = stripAdSegments(input);
      expect(out).not.toContain('ad.ts');
      expect(out).toContain('live.ts');
      expect(out).toContain('#EXT-X-DISCONTINUITY');
    });

    it('exits ad mode on SCTE35-IN', () => {
      const input = [
        '#EXTM3U',
        '#EXT-X-SCTE35-OUT',
        '#EXTINF:2.0,ad',
        'ad.ts',
        '#EXT-X-SCTE35-IN',
        '#EXTINF:2.0,live',
        'live.ts',
      ].join('\n');

      const out = stripAdSegments(input);
      expect(out).not.toContain('ad.ts');
      expect(out).toContain('live.ts');
    });

    it('strips ad segments when the playlist only contains CUE-OUT-CONT markers', () => {
      const input = [
        '#EXTM3U',
        '#EXT-X-CUE-OUT-CONT:ElapsedTime=15,Duration=30',
        '#EXT-X-DISCONTINUITY',
        '#EXTINF:2.0,ad',
        'ad.ts',
        '#EXT-X-DISCONTINUITY',
        '#EXTINF:2.0,live',
        'live.ts',
      ].join('\n');

      const out = stripAdSegments(input);
      expect(out).not.toContain('ad.ts');
      expect(out).toContain('live.ts');
      expect(out).toContain('#EXT-X-DISCONTINUITY');
    });

    it('preserves unlabeled content segments after an ad range', () => {
      const input = [
        '#EXTM3U',
        '#EXT-X-DATERANGE:ID="stitched-ad-4",CLASS="twitch-stitched-ad"',
        '#EXT-X-DISCONTINUITY',
        '#EXTINF:2.0,ad',
        'ad.ts',
        '#EXT-X-DISCONTINUITY',
        '#EXTINF:2.0,',
        'content.ts',
      ].join('\n');

      const out = stripAdSegments(input);
      expect(out).not.toContain('ad.ts');
      expect(out).toContain('#EXTINF:2.0,\ncontent.ts');
    });

    it('drops explicit ad resource segments even without cue markers', () => {
      const input = [
        '#EXTM3U',
        '#EXTINF:2.0,',
        'https://video-edge.example.net/path/stitched-ad-1.ts',
        '#EXTINF:2.0,',
        'content.ts',
      ].join('\n');

      const out = stripAdSegments(input);
      expect(out).not.toContain('stitched-ad-1.ts');
      expect(out).toContain('#EXTINF:2.0,\ncontent.ts');
    });

    it('drops LL-HLS prefetch lines and non-live ad segments after stitched-ad markers', () => {
      const input = [
        '#EXTM3U',
        '#EXT-X-DATERANGE:ID="stitched-ad-3",CLASS="twitch-stitched-ad",X-TV-TWITCH-AD-URL="https://ads.example/ad"',
        '#EXTINF:2.0,ad',
        'ad-1.ts',
        '#EXT-X-TWITCH-PREFETCH:ad-prefetch.ts',
        '#EXT-X-DISCONTINUITY',
        '#EXTINF:2.0,live',
        'live-1.ts',
        '#EXT-X-TWITCH-PREFETCH:live-prefetch.ts',
      ].join('\n');

      const out = stripAdSegments(input);
      expect(out).not.toContain('ad-1.ts');
      expect(out).not.toContain('ad-prefetch.ts');
      expect(out).not.toContain('live-prefetch.ts');
      expect(out).toContain('live-1.ts');
      expect(out).not.toContain('X-TV-TWITCH-AD-URL');
    });

    it('leaves clean playlists untouched (all segments preserved)', () => {
      const input = [
        '#EXTM3U',
        '#EXT-X-VERSION:6',
        '#EXTINF:2.0,live',
        'a.ts',
        '#EXTINF:2.0,live',
        'b.ts',
      ].join('\n');

      const out = stripAdSegments(input);
      expect(out).toContain('a.ts');
      expect(out).toContain('b.ts');
    });

    it('preserves #EXTM3U header (output remains valid)', () => {
      const input = [
        '#EXTM3U',
        '#EXT-X-DATERANGE:CLASS="twitch-stitched-ad",DURATION=2.0',
        '#EXTINF:2.0,ad',
        'ad.ts',
        '#EXTINF:2.0,live',
        'live.ts',
      ].join('\n');
      const out = stripAdSegments(input);
      expect(out.startsWith('#EXTM3U')).toBe(true);
    });
  });

  describe('rewritePlaylistUrls', () => {
    it('wraps URLs through the app-local proxy route', () => {
      expect(proxyUrl('https://video-edge.twitch.tv/seg.ts')).toBe(
        '/api/proxy?url=https%3A%2F%2Fvideo-edge.twitch.tv%2Fseg.ts',
      );
    });

    it('wraps absolute URLs through the proxy', () => {
      const input = [
        '#EXTM3U',
        '#EXTINF:2.0,',
        'https://video-edge.twitch.tv/seg.ts',
      ].join('\n');
      const out = rewritePlaylistUrls(input);
      expect(out).toContain(proxyUrl('https://video-edge.twitch.tv/seg.ts'));
    });

    it('resolves relative URIs against baseUrl before wrapping', () => {
      const input = '#EXTM3U\n#EXTINF:2.0,\n1.ts\n';
      const out = rewritePlaylistUrls(input, 'https://usher.ttvnw.net/api/channel/hls/foo.m3u8?q=1');
      expect(out).toContain('?url=https%3A%2F%2Fusher.ttvnw.net%2Fapi%2Fchannel%2Fhls%2F1.ts');
    });

    it('leaves relative URLs untouched when no baseUrl is given', () => {
      const input = '#EXTM3U\n#EXTINF:2.0,\nseg.ts\n';
      expect(rewritePlaylistUrls(input)).toBe(input);
    });

    it('preserves tag and blank lines', () => {
      const input = '#EXTM3U\n#EXT-X-VERSION:6\n\n#EXTINF:2.0,\n1.ts\n';
      const out = rewritePlaylistUrls(input, 'https://host.example/a/b.m3u8');
      expect(out).toContain('#EXT-X-VERSION:6');
      expect(out).toContain('#EXTM3U');
      expect(out).toContain('?url=https%3A%2F%2Fhost.example%2Fa%2F1.ts');
    });
  });

  describe('isLikelyAdResourceUrl', () => {
    it('blocks known ad hosts and explicit ad segment paths', () => {
      expect(isLikelyAdResourceUrl('https://ads.twitch.tv/v1/ad')).toBe(true);
      expect(isLikelyAdResourceUrl('https://video-edge.example.net/path/commercial-1.ts')).toBe(true);
    });

    it('does not block normal Twitch media URLs', () => {
      expect(isLikelyAdResourceUrl('https://video-edge.ord01.hls.ttvnw.net/v1/segment/Cx/abc.ts')).toBe(false);
      expect(isLikelyAdResourceUrl('media-0001.ts')).toBe(false);
    });
  });

  describe('processHlsPlaylist', () => {
    it('strips ad segments before rewriting remaining URLs through the proxy', () => {
      const input = [
        '#EXTM3U',
        '#EXT-X-DATERANGE:ID="stitched-ad-5",CLASS="twitch-stitched-ad",DURATION=2.0',
        '#EXTINF:2.0,ad',
        'ad-1.ts',
        '#EXTINF:2.0,',
        'live-1.ts',
      ].join('\n');

      const out = processHlsPlaylist(input, 'https://usher.ttvnw.net/api/channel/hls/foo.m3u8?token=1');
      expect(out).not.toContain('ad-1.ts');
      expect(out).toContain('/api/proxy?url=https%3A%2F%2Fusher.ttvnw.net%2Fapi%2Fchannel%2Fhls%2Flive-1.ts');
    });
  });

  describe('processHlsPlaylistForDirectPlayback', () => {
    it('strips ads and resolves remaining resources without proxying through Vercel', () => {
      const input = [
        '#EXTM3U',
        '#EXT-X-DATERANGE:ID="stitched-ad-6",CLASS="twitch-stitched-ad",DURATION=2.0',
        '#EXTINF:2.0,ad',
        'ad-1.ts',
        '#EXTINF:2.0,',
        'live-1.ts',
      ].join('\n');

      const out = processHlsPlaylistForDirectPlayback(input, 'https://usher.ttvnw.net/api/channel/hls/foo.m3u8?token=1');
      expect(out).not.toContain('ad-1.ts');
      expect(out).not.toContain('/api/proxy');
      expect(out).toContain('https://usher.ttvnw.net/api/channel/hls/live-1.ts');
    });
  });
});
