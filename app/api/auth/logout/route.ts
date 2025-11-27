import { NextResponse } from 'next/server';
import {
  applyCookieDescriptors,
  clearSessionCookie,
  clearTokenCookie,
  clearUserCookie,
} from '@/lib/auth/twitchTokens';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ success: true });

  applyCookieDescriptors(response, [
    clearTokenCookie(),
    clearUserCookie(),
    clearSessionCookie(),
  ]);

  return response;
}
