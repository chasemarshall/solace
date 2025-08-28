import { NextRequest, NextResponse } from 'next/server';
import { validateDevEnvironment } from '@/lib/dev/config';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  // Enhanced dev mode protection
  if (url.pathname.startsWith('/dev/')) {
    // Validate dev environment
    const { valid, errors } = validateDevEnvironment();
    if (!valid) {
      console.warn('Dev mode access denied:', errors);
      return new Response('Development mode not available', { status: 403 });
    }
    
    // Rate limiting for dev routes
    const clientId = request.headers.get('x-forwarded-for') || 'localhost';
    if (!checkRateLimit(clientId)) {
      return new Response('Rate limit exceeded', { status: 429 });
    }
    
    // Block ad-related paths and suspicious requests
    const blockedPaths = [
      '/ads/', '/advertising/', '/commercial/', '/sponsorship/',
      '/analytics/', '/tracking/', '/metrics/', '/telemetry/'
    ];
    
    if (blockedPaths.some(path => url.pathname.toLowerCase().includes(path))) {
      console.log('🚫 Middleware blocked suspicious path:', url.pathname);
      return new Response('', { status: 204 });
    }
    
    // Block known ad servers and trackers
    const blockedDomains = [
      'googleads.g.doubleclick.net',
      'googlesyndication.com',
      'amazon-adsystem.com',
      'ads.twitch.tv',
      'twitchads.com'
    ];
    
    const referer = request.headers.get('referer') || '';
    if (blockedDomains.some(domain => referer.includes(domain))) {
      console.log('🚫 Middleware blocked ad referer:', referer);
      return new Response('', { status: 204 });
    }
  }
  
  // Production safeguard - ensure dev routes are blocked
  if (process.env.NODE_ENV === 'production' && url.pathname.startsWith('/dev/')) {
    return new Response('Not found', { status: 404 });
  }
  
  return NextResponse.next();
}

// Simple in-memory rate limiter for dev mode
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const limit = 100; // 100 requests per minute
  
  const current = rateLimitMap.get(clientId);
  if (!current || now > current.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= limit) {
    return false;
  }
  
  current.count++;
  return true;
}

export const config = {
  matcher: ['/dev/:path*', '/api/dev-proxy:path*']
};