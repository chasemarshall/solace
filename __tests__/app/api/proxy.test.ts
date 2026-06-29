import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/proxy/route';

const originalFetch = global.fetch;

function proxyRequest(target: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/proxy?url=${encodeURIComponent(target)}`, {
    headers: { host: 'localhost:3000' },
  });
}

describe('proxy route ad filtering', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('blocks known ad resources before making an upstream request', async () => {
    const fetchMock = vi.fn() as unknown as typeof fetch;
    global.fetch = fetchMock;

    const response = await GET(proxyRequest('https://ads.twitch.tv/v1/ad-request'));

    expect(response.status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('strips ad segments and rewrites remaining HLS resources through the proxy', async () => {
    const manifest = [
      '#EXTM3U',
      '#EXT-X-VERSION:6',
      '#EXT-X-DATERANGE:ID="stitched-ad-1",CLASS="twitch-stitched-ad",DURATION=2.0',
      '#EXTINF:2.0,ad',
      'ad-1.ts',
      '#EXTINF:2.0,',
      'live-1.ts',
    ].join('\n');
    const fetchMock = vi.fn(async () => new Response(manifest, {
      status: 200,
      headers: { 'content-type': 'application/vnd.apple.mpegurl' },
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await GET(proxyRequest('https://usher.ttvnw.net/api/channel/hls/foo.m3u8?token=1'));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).not.toContain('stitched-ad');
    expect(text).not.toContain('ad-1.ts');
    expect(text).toContain('http://localhost:3000/api/proxy?url=https%3A%2F%2Fusher.ttvnw.net%2Fapi%2Fchannel%2Fhls%2Flive-1.ts');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
