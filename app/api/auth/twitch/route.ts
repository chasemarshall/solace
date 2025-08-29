import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.TWITCH_CLIENT_ID;
  
  if (!clientId) {
    return NextResponse.json({ error: 'Twitch client ID not configured' }, { status: 500 });
  }

  const scopes = [
    'chat:read',
    'chat:edit',
    'user:read:email'
  ];

  // Dynamically determine the site URL from the request
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
  
  const redirectUri = `${siteUrl}/api/auth/twitch/callback`;
  
  const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}`;

  return NextResponse.redirect(authUrl);
}