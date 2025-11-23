import { NextRequest, NextResponse } from 'next/server';
import { validateDevEnvironment } from '@/lib/dev/config';
import { M3U8AdFilter } from '@/lib/video/m3u8Filter';
import { isAdRequest, GRAPHQL_AD_PATTERNS } from '@/lib/constants/adPatterns';

export async function GET(request: NextRequest) {
  // Validate dev environment
  const { valid } = validateDevEnvironment();
  if (!valid) {
    return new Response('Development mode not available', { status: 403 });
  }

  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');
  const proxyType = url.searchParams.get('type') || 'general';

  if (!targetUrl) {
    return new Response('Missing URL parameter', { status: 400 });
  }

  // Check for blocked domains using shared ad patterns
  if (isAdRequest(targetUrl)) {
    console.log('🚫 Network-level ad block:', targetUrl.substring(0, 100));
    return new Response('', { status: 204 });
  }

  // Handle different proxy types
  switch (proxyType) {
    case 'hls':
      return handleHLSProxy(targetUrl);
    case 'graphql':
      return handleGraphQLProxy(targetUrl, request);
    default:
      return handleGeneralProxy(targetUrl);
  }
}

export async function POST(request: NextRequest) {
  // Validate dev environment
  const { valid } = validateDevEnvironment();
  if (!valid) {
    return new Response('Development mode not available', { status: 403 });
  }

  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');
  const proxyType = url.searchParams.get('type') || 'general';
  
  if (!targetUrl) {
    return new Response('Missing URL parameter', { status: 400 });
  }

  if (proxyType === 'graphql') {
    return handleGraphQLProxy(targetUrl, request);
  }

  return new Response('POST not supported for this proxy type', { status: 405 });
}

async function handleHLSProxy(targetUrl: string): Promise<Response> {
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/vnd.apple.mpegurl',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://www.twitch.tv',
        'Referer': 'https://www.twitch.tv/'
      }
    });

    if (!response.ok) {
      throw new Error(`HLS proxy failed: ${response.status}`);
    }

    let content = await response.text();

    // SCTE-35 ad marker removal
    content = M3U8AdFilter.filterPlaylist(content);

    return new Response(content, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('HLS proxy error:', error);
    return new Response('HLS proxy error', { status: 502 });
  }
}

async function handleGraphQLProxy(targetUrl: string, request: NextRequest): Promise<Response> {
  try {
    const requestBody = await request.text();
    let gqlData;
    
    try {
      gqlData = JSON.parse(requestBody);
    } catch {
      // If not JSON, pass through
      return handleGeneralProxy(targetUrl);
    }

    // Filter out ad-related GraphQL queries using shared patterns
    const filteredOperations = Array.isArray(gqlData)
      ? gqlData.filter((operation: any) => {
          const operationName = operation.operationName || '';
          const query = operation.query || '';

          const isAdQuery = GRAPHQL_AD_PATTERNS.some(pattern =>
            operationName.includes(pattern) || query.includes(pattern)
          );

          if (isAdQuery) {
            console.log('🚫 Blocked GraphQL ad query:', operationName);
            return false;
          }

          return true;
        })
      : [gqlData].filter((operation: any) => {
          const operationName = operation.operationName || '';
          const query = operation.query || '';

          const isAdQuery = GRAPHQL_AD_PATTERNS.some(pattern =>
            operationName.includes(pattern) || query.includes(pattern)
          );

          if (isAdQuery) {
            console.log('🚫 Blocked GraphQL ad query:', operationName);
            return false;
          }

          return true;
        });
    
    if (filteredOperations.length === 0) {
      return new Response('[]', { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Origin': 'https://www.twitch.tv',
        'Referer': 'https://www.twitch.tv/'
      },
      body: JSON.stringify(Array.isArray(gqlData) ? filteredOperations : filteredOperations[0])
    });
    
    return new Response(response.body, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('GraphQL proxy error:', error);
    return new Response('GraphQL proxy error', { status: 502 });
  }
}

async function handleGeneralProxy(targetUrl: string): Promise<Response> {
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Origin': 'https://www.twitch.tv',
        'Referer': 'https://www.twitch.tv/'
      }
    });
    
    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      }
    });
  } catch (error) {
    console.error('General proxy error:', error);
    return new Response('Proxy error', { status: 502 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}