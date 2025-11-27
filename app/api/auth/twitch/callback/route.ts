import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  applyCookieDescriptors,
  createSessionCookie,
  createTokenCookie,
  createUserCookie,
  type AuthCookiePayload,
  type TwitchTokenCookie,
} from '@/lib/auth/twitchTokens';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Dynamically determine the site URL from the request
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

  if (error) {
    return NextResponse.redirect(new URL('/?auth_error=' + encodeURIComponent(error), siteUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?auth_error=no_code', siteUrl));
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const redirectUri = `${siteUrl}/api/auth/twitch/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/?auth_error=config_error', siteUrl));
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Token exchange failed');
    }

    const tokenData = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Client-Id': clientId,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info');
    }

    const userData = await userResponse.json();
    const user = userData.data[0];

    // Persist Twitch profile in database
    const dbUser = await prisma.user.upsert({
      where: { twitchId: user.id },
      update: {
        username: user.login,
        displayName: user.display_name,
        email: user.email,
        avatarUrl: user.profile_image_url,
      },
      create: {
        twitchId: user.id,
        username: user.login,
        displayName: user.display_name,
        email: user.email,
        avatarUrl: user.profile_image_url,
      },
    });

    // Merge any anonymous data that might exist for the current session
    const previousSessionId = request.cookies.get('session_id')?.value;
    if (previousSessionId && previousSessionId !== user.id) {
      const anonymousUser = await prisma.user.findUnique({
        where: { twitchId: previousSessionId },
      });

      if (anonymousUser && anonymousUser.id !== dbUser.id) {
        await prisma.$transaction(async (tx) => {
          await tx.favorite.updateMany({
            where: { userId: anonymousUser.id },
            data: { userId: dbUser.id },
          });

          await tx.follow.updateMany({
            where: { userId: anonymousUser.id },
            data: { userId: dbUser.id },
          });

          const anonPreferences = await tx.userPreference.findUnique({
            where: { userId: anonymousUser.id },
          });

          if (anonPreferences) {
            const existingPreferences = await tx.userPreference.findUnique({
              where: { userId: dbUser.id },
            });

            if (existingPreferences) {
              await tx.userPreference.delete({
                where: { id: anonPreferences.id },
              });
            } else {
              await tx.userPreference.update({
                where: { id: anonPreferences.id },
                data: { userId: dbUser.id },
              });
            }
          }

          await tx.user.delete({
            where: { id: anonymousUser.id },
          });
        });
      }
    }

    // SECURITY: Store auth data in HTTP-only cookie instead of URL hash
    const expiresAt = Date.now() + tokenData.expires_in * 1000;
    const authData: AuthCookiePayload = {
      user: {
        id: user.id,
        login: user.login,
        display_name: user.display_name,
        profile_image_url: user.profile_image_url,
        // SECURITY: Don't expose email in client-side data
      },
      expires_at: expiresAt,
    };

    // SECURITY: Store sensitive tokens in HTTP-only cookie
    const tokenCookieData: TwitchTokenCookie = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      expires_at: expiresAt,
      scope: tokenData.scope,
      token_type: tokenData.token_type,
      user_id: user.id,
    };

    const redirectUrl = new URL('/', siteUrl);
    redirectUrl.searchParams.set('auth', 'success');
    
    const response = NextResponse.redirect(redirectUrl);
    
    applyCookieDescriptors(response, [
      createTokenCookie(tokenCookieData),
      createUserCookie(authData, tokenData.expires_in),
      createSessionCookie(user.id),
    ]);
    
    return response;
    
  } catch (error) {
    // SECURITY: Log error without exposing sensitive details
    console.error('OAuth callback error occurred');
    return NextResponse.redirect(new URL('/?auth_error=callback_error', siteUrl));
  }
}
