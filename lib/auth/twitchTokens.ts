import type { NextRequest, NextResponse } from 'next/server';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

// Determine if we should use secure cookies
// Use secure cookies in production OR when HTTPS is available
const isProduction = process.env.NODE_ENV === 'production';
const isSecure = isProduction || process.env.NEXT_PUBLIC_BASE_URL?.startsWith('https://');

export const TOKEN_COOKIE_NAME = 'twitch_tokens';
export const USER_COOKIE_NAME = 'twitch_user';
export const SESSION_COOKIE_NAME = 'session_id';

type CookieDescriptor = {
  name: string;
  value: string;
  options?: Partial<ResponseCookie>;
};

export type TwitchTokenCookie = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  expires_at: number;
  scope?: string[];
  token_type?: string;
  user_id: string;
};

export type AuthCookiePayload = {
  user: {
    id: string;
    login: string;
    display_name: string;
    profile_image_url?: string | null;
  };
  expires_at: number;
};

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function createTokenCookie(tokens: TwitchTokenCookie): CookieDescriptor {
  return {
    name: TOKEN_COOKIE_NAME,
    value: JSON.stringify(tokens),
    options: {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: tokens.expires_in,
      path: '/',
    },
  };
}

export function createUserCookie(payload: AuthCookiePayload, maxAgeSeconds: number): CookieDescriptor {
  return {
    name: USER_COOKIE_NAME,
    value: JSON.stringify(payload),
    options: {
      secure: isSecure,
      sameSite: 'lax',
      maxAge: Math.max(60, maxAgeSeconds),
      path: '/',
    },
  };
}

export function createSessionCookie(userId: string): CookieDescriptor {
  return {
    name: SESSION_COOKIE_NAME,
    value: userId,
    options: {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: ONE_YEAR_SECONDS,
      path: '/',
    },
  };
}

export function clearTokenCookie(): CookieDescriptor {
  return {
    name: TOKEN_COOKIE_NAME,
    value: '',
    options: {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    },
  };
}

export function clearUserCookie(): CookieDescriptor {
  return {
    name: USER_COOKIE_NAME,
    value: '',
    options: {
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    },
  };
}

export function clearSessionCookie(): CookieDescriptor {
  return {
    name: SESSION_COOKIE_NAME,
    value: '',
    options: {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    },
  };
}

export function applyCookieDescriptors(response: NextResponse, cookies?: CookieDescriptor[]) {
  cookies?.forEach(cookie => {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  });
}

function parseCookieJSON<T>(value?: string): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function extractSessionIdentifier(request: NextRequest): string | undefined {
  const tokenCookie = request.cookies.get(TOKEN_COOKIE_NAME);
  if (tokenCookie) {
    const parsed = parseCookieJSON<TwitchTokenCookie>(tokenCookie.value);
    if (parsed?.user_id) {
      return parsed.user_id;
    }
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  return sessionCookie?.value;
}

export async function ensureValidTwitchTokens(
  request: NextRequest
): Promise<{ tokens: TwitchTokenCookie | null; cookies?: CookieDescriptor[] }> {
  const tokenCookie = request.cookies.get(TOKEN_COOKIE_NAME);
  if (!tokenCookie?.value) {
    return { tokens: null };
  }

  let tokens = parseCookieJSON<TwitchTokenCookie>(tokenCookie.value);
  if (!tokens?.access_token) {
    return { tokens: null };
  }

  const hasExpiresAt = typeof tokens.expires_at === 'number';
  const needsRefresh = !hasExpiresAt || (tokens.expires_at - Date.now() < 60 * 1000);
  if (!needsRefresh) {
    return { tokens };
  }

  if (!tokens.refresh_token) {
    return { tokens: null };
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Twitch client credentials missing; cannot refresh token');
    return { tokens: null };
  }

  const refreshResponse = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!refreshResponse.ok) {
    console.error('Failed to refresh Twitch token');
    return { tokens: null };
  }

  const refreshed = await refreshResponse.json();

  tokens = {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token || tokens.refresh_token,
    expires_in: refreshed.expires_in,
    expires_at: Date.now() + refreshed.expires_in * 1000,
    scope: refreshed.scope || tokens.scope,
    token_type: refreshed.token_type || tokens.token_type,
    user_id: tokens.user_id,
  };

  const cookies: CookieDescriptor[] = [createTokenCookie(tokens)];

  const userCookie = request.cookies.get(USER_COOKIE_NAME);
  if (userCookie?.value) {
    const authData = parseCookieJSON<AuthCookiePayload>(userCookie.value);
    if (authData) {
      authData.expires_at = tokens.expires_at;
      cookies.push(createUserCookie(authData, tokens.expires_in));
    }
  }

  return { tokens, cookies };
}
