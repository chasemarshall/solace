import { NextRequest, NextResponse } from "next/server";

// SECURITY: Allowlist of permitted domains to prevent SSRF attacks
const ALLOWED_DOMAINS = [
  'api.twitch.tv',
  'gql.twitch.tv', 
  'static-cdn.jtvnw.net',
  'player.twitch.tv',
  'embed.twitch.tv',
  'id.twitch.tv'
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

  // SECURITY: Validate URL before making request
  if (!validateUrl(target)) {
    return NextResponse.json({ error: 'Invalid or unauthorized URL' }, { status: 403 });
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

    const contentType = response.headers.get('content-type');
    const content = await response.text();

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resource' }, 
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
