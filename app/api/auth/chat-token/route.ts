import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get tokens from HTTP-only cookie
    const tokensCookie = request.cookies.get('twitch_tokens');
    
    if (!tokensCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tokensData = JSON.parse(tokensCookie.value);
    
    // Verify token is still valid
    if (!tokensData.access_token) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 401 });
    }

    // Return OAuth token formatted for TMI.js
    return NextResponse.json({
      oauth: `oauth:${tokensData.access_token}`,
    });
    
  } catch (error) {
    console.error('Chat token API error:', error);
    return NextResponse.json({ error: 'Failed to get chat token' }, { status: 500 });
  }
}