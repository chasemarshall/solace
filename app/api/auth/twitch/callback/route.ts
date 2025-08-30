import { NextRequest, NextResponse } from 'next/server';

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

    // SECURITY: Store auth data in HTTP-only cookie instead of URL hash
    const authData = {
      user: {
        id: user.id,
        login: user.login,
        display_name: user.display_name,
        profile_image_url: user.profile_image_url,
        // SECURITY: Don't expose email in client-side data
      },
      expires_at: Date.now() + (tokenData.expires_in * 1000),
    };

    // SECURITY: Store sensitive tokens in HTTP-only cookie
    const tokenCookieData = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
    };

    const redirectUrl = new URL('/', siteUrl);
    redirectUrl.searchParams.set('auth', 'success');
    
    const response = NextResponse.redirect(redirectUrl);
    
    // SECURITY: Set HTTP-only cookies for tokens
    response.cookies.set('twitch_tokens', JSON.stringify(tokenCookieData), {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: tokenData.expires_in,
      path: '/',
    });
    
    // Store user data in non-HTTP-only cookie for client access
    response.cookies.set('twitch_user', JSON.stringify(authData), {
      secure: true,
      sameSite: 'strict', 
      maxAge: tokenData.expires_in,
      path: '/',
    });
    
    return response;
    
  } catch (error) {
    // SECURITY: Log error without exposing sensitive details
    console.error('OAuth callback error occurred');
    return NextResponse.redirect(new URL('/?auth_error=callback_error', siteUrl));
  }
}