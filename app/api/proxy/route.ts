import { NextRequest, NextResponse } from "next/server";
import { isLikelyAdResourceUrl, processHlsPlaylist } from "@/lib/video/hlsPlaylist";

// SECURITY: Only allow same-origin requests or configured origins.
// Returns null when the origin is cross-origin and not on the allowlist —
// callers should omit ACAO entirely (browsers then reject the response).
// Returns '*' only for the opaque 'null' origin (blob: / data: / sandboxed
// iframe contexts such as hls.js blob workers on Firefox). Missing Origin
// header means the request is same-origin or server-to-server — CORS doesn't
// apply, so we also return null there.
function getAllowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (!origin) return null;
  if (origin === 'null') return '*';

  // Same-origin: reflect
  try {
    const originUrl = new URL(origin);
    if (originUrl.host === host) {
      return origin;
    }
  } catch {
    return null;
  }

  const allowedOrigins = process.env.ALLOWED_CORS_ORIGINS?.split(',').map(o => o.trim()) || [];
  if (allowedOrigins.includes(origin)) {
    return origin;
  }

  if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
    return origin;
  }

  return null;
}

function corsHeadersFor(request: NextRequest): Record<string, string> {
  const allowedOrigin = getAllowedOrigin(request);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
  }
  return headers;
}

// SECURITY: Allowlist of permitted domains to prevent SSRF attacks
const ALLOWED_DOMAINS = [
  'twitch.tv',
  'ttvnw.net',
  'jtvnw.net',
  'cloudfront.net',
  'akamaized.net',
  'akamaihd.net',
];

function validateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    
    // Only allow HTTPS
    if (url.protocol !== 'https:') {
      return false;
    }
    
    // Check against allowlist
    const hostname = url.hostname.toLowerCase();
    const isAllowed = ALLOWED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
    
    if (!isAllowed) {
      return false;
    }
    
    // Block private/internal networks
    if (hostname === 'localhost' || 
        hostname.startsWith('127.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname.includes('internal') ||
        hostname.includes('local')) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');
  
  if (!target) {
    return NextResponse.json({ error: 'Missing target URL' }, { status: 400 });
  }

  if (isLikelyAdResourceUrl(target)) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        ...corsHeadersFor(request),
        'Cache-Control': 'no-store',
      },
    });
  }

  // SECURITY: Validate URL before making request
  if (!validateUrl(target)) {
    console.error('[proxy] Blocked URL:', target);
    try {
      const parsed = new URL(target);
      console.error('[proxy] Hostname:', parsed.hostname, 'Protocol:', parsed.protocol);
    } catch {
      console.error('[proxy] Could not parse URL');
    }
    return NextResponse.json({ error: 'Invalid or unauthorized URL', blocked: target }, { status: 403 });
  }

  try {
    const response = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Twitch-Alt-Proxy/1.0)',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';

    const corsHeaders = corsHeadersFor(request);

    // Determine if content is text (playlists) or binary (video segments)
    const isText = contentType.includes('mpegurl') ||
      contentType.includes('text/') ||
      contentType.includes('json') ||
      contentType.includes('xml') ||
      target.includes('.m3u8');

    // Don't cache live HLS playlists — they change every few seconds
    const isHls = target.includes('.m3u8') || contentType.includes('mpegurl');
    const cacheControl = isHls ? 'no-cache, no-store' : 'public, max-age=3600';

    if (isText) {
      let content = await response.text();

      // Strip ads and rewrite sub-URLs so nested fetches stay in the proxy.
      // Only touch HLS manifests (identified by #EXTM3U). We emit origin-
      // absolute proxy URLs so that neither the browser (for Safari native
      // HLS) nor hls.js can mis-resolve them against the upstream URL.
      if (content.includes('#EXTM3U')) {
        const origin = request.nextUrl.origin;
        const wrap = (u: string) => `${origin}/api/proxy?url=${encodeURIComponent(u)}`;
        content = processHlsPlaylist(content, target, wrap);
      }

      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': contentType || 'text/plain',
          ...corsHeaders,
          'Cache-Control': cacheControl,
        },
      });
    } else {
      // Binary content (video segments, etc.) — pass through as-is
      const content = await response.arrayBuffer();
      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': contentType || 'application/octet-stream',
          ...corsHeaders,
          'Cache-Control': cacheControl,
        },
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Proxy error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to fetch resource' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeadersFor(request),
  });
}
