import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  
  if (!clientId) {
    return NextResponse.json({ error: 'Twitch client ID not configured' }, { status: 500 });
  }

  const scopes = [
    'chat:read',
    'chat:edit',
    'user:read:email'
  ];

  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/twitch/callback`;
  
  const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}`;

  return NextResponse.redirect(authUrl);
}