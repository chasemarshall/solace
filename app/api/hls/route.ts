import { NextRequest, NextResponse } from 'next/server';
import { rewriteM3U8 } from '@/lib/video/m3u8';
import { PROXY_ALLOWED_HOSTS } from '@/lib/twitch/proxyConfig';

// Security: Host Allowlist - includes proxy endpoints and Twitch domains
const ALLOWED_HOSTS = [
  ...PROXY_ALLOWED_HOSTS,  // Ad-free proxy services
  'video-weaver',          // Twitch video weaver subdomains
  'ttvnw.net',            // Twitch CDN
  'twitch.tv',
  'usher.ttvnw.net'
];

function validateRequest(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get('src');

  if (!src) {
    return { error: new NextResponse('Missing src parameter', { status: 400 }) };
  }

  let urlObj: URL;
  try {
    urlObj = new URL(src);
  } catch (e) {
    return { error: new NextResponse('Invalid URL', { status: 400 }) };
  }

  // Check if hostname ends with any of the allowed hosts
  const isAllowed = ALLOWED_HOSTS.some(host =>
    urlObj.hostname === host || urlObj.hostname.endsWith('.' + host)
  );

  if (!isAllowed) {
    console.error(`Blocked proxy request to unauthorized host: ${urlObj.hostname}`);
    return { error: new NextResponse('Host not allowed', { status: 403 }) };
  }

  // Only allow HTTPS URLs
  if (urlObj.protocol !== 'https:') {
    return { error: new NextResponse('Only HTTPS URLs allowed', { status: 400 }) };
  }

  return { src, urlObj };
}

export async function HEAD(request: NextRequest) {
  const validation = validateRequest(request);

  if ('error' in validation) {
    return validation.error;
  }

  const { src } = validation;

  try {
    // Test if the proxy endpoint is reachable
    const headers = {
      'Accept': 'application/x-mpegURL, application/vnd.apple.mpegurl, application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.twitch.tv/',
      'Origin': 'https://www.twitch.tv'
    } as const;

    const response = await fetch(src, {
      method: 'HEAD',
      headers,
    });

    // Some proxy endpoints block HEAD; retry with GET so failover still works
    const validationResponse =
      response.status === 405 || response.status === 501
        ? await fetch(src, { method: 'GET', headers })
        : response;

    if (!validationResponse.ok) {
      return new NextResponse(null, { status: 502 });
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('HLS HEAD request error:', error);
    return new NextResponse(null, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  const validation = validateRequest(request);

  if ('error' in validation) {
    return validation.error;
  }

  const { src } = validation;

  try {
    // Fetch upstream HLS manifest with browser-like headers
    const response = await fetch(src, {
      headers: {
        'Accept': 'application/x-mpegURL, application/vnd.apple.mpegurl, application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.twitch.tv/',
        'Origin': 'https://www.twitch.tv'
      },
    });

    if (!response.ok) {
      console.error('HLS fetch failed:', response.status, response.statusText, await response.text().catch(() => 'No body'));
      return new NextResponse(`Upstream error: ${response.status}`, { status: 502 });
    }

    const contentType = response.headers.get('content-type');
    const originalText = await response.text();

    // Strict validation: Must be a valid M3U8 manifest
    if (!originalText.trim().startsWith('#EXTM3U')) {
      console.error('Invalid upstream manifest (not M3U8):', contentType, originalText.substring(0, 200));
      return new NextResponse('Upstream returned invalid manifest', { status: 502 });
    }

    // Process through our annotator
    const annotatedText = rewriteM3U8(originalText, src);

    return new NextResponse(annotatedText, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('HLS processing error:', error);
    return new NextResponse('Processing error', { status: 502 });
  }
}