import { NextRequest, NextResponse } from 'next/server';
import { applyCookieDescriptors, ensureValidTwitchTokens } from '@/lib/auth/twitchTokens';

// Force dynamic rendering since we're reading cookies
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { tokens, cookies } = await ensureValidTwitchTokens(request);
    if (!tokens) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Return OAuth token formatted for TMI.js
    const response = NextResponse.json({
      oauth: `oauth:${tokens.access_token}`,
    });

    applyCookieDescriptors(response, cookies);

    return response;
    
  } catch (error) {
    console.error('Chat token API error:', error);
    return NextResponse.json({ error: 'Failed to get chat token' }, { status: 500 });
  }
}
