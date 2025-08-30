import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// SECURITY: Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimit(ip: string, limit: number = 100, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Clean up old entries
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < windowStart) {
      rateLimitMap.delete(key);
    }
  }

  const current = rateLimitMap.get(ip);
  
  if (!current) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.resetTime < now) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= limit) {
    return false;
  }
  
  current.count++;
  return true;
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // SECURITY: Add comprehensive security headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // SECURITY: HSTS for HTTPS
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // SECURITY: Content Security Policy (enhanced)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://embed.twitch.tv https://player.twitch.tv https://www.twitch.tv https://static.twitchcdn.net https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.twitch.tv https://gql.twitch.tv https://id.twitch.tv https://static-cdn.jtvnw.net https://vitals.vercel-insights.com wss://irc-ws.chat.twitch.tv",
    "frame-src https://embed.twitch.tv https://player.twitch.tv",
    "media-src 'self' https: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ];
  response.headers.set('Content-Security-Policy', csp.join('; '));
  
  // SECURITY: Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    
    // Higher limits for auth endpoints, lower for others
    const isAuthEndpoint = request.nextUrl.pathname.startsWith('/api/auth/');
    const limit = isAuthEndpoint ? 20 : 100;
    
    if (!rateLimit(ip, limit)) {
      return new NextResponse('Rate limit exceeded', { status: 429 });
    }
  }
  
  // SECURITY: Block dev routes in production
  if (process.env.NODE_ENV === 'production' && request.nextUrl.pathname.startsWith('/dev/')) {
    return new NextResponse('Not Found', { status: 404 });
  }
  
  // SECURITY: Prevent access to sensitive files
  const sensitiveFiles = ['.env', '.git', 'package.json', 'next.config.js'];
  const pathname = request.nextUrl.pathname.toLowerCase();
  if (sensitiveFiles.some(file => pathname.includes(file))) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}