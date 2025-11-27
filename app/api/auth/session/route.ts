import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  applyCookieDescriptors,
  createUserCookie,
  ensureValidTwitchTokens,
} from '@/lib/auth/twitchTokens';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { tokens, cookies } = await ensureValidTwitchTokens(request);
    if (!tokens) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { twitchId: tokens.user_id },
    });

    if (!user) {
      const response = NextResponse.json({ error: 'User not found' }, { status: 401 });
      applyCookieDescriptors(response, cookies);
      return response;
    }

    const sessionPayload = {
      user: {
        id: user.twitchId ?? user.id,
        login: user.username ?? user.displayName ?? tokens.user_id,
        display_name: user.displayName ?? user.username ?? user.twitchId ?? tokens.user_id,
        profile_image_url: user.avatarUrl,
      },
      expires_at: tokens.expires_at,
    };

    const response = NextResponse.json(sessionPayload);

    const secondsRemaining = Math.max(60, Math.floor((tokens.expires_at - Date.now()) / 1000));
    applyCookieDescriptors(response, [
      ...(cookies ?? []),
      createUserCookie(sessionPayload, secondsRemaining),
    ]);

    return response;
  } catch (error) {
    console.error('Session lookup failed', error);
    return NextResponse.json({ error: 'Failed to load session' }, { status: 500 });
  }
}
