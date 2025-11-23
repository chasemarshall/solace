import { NextRequest, NextResponse } from 'next/server';
import { prisma, getOrCreateUser } from '@/lib/db';
import { cookies } from 'next/headers';

/**
 * GET /api/favorites
 * Fetch all favorites for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Get user session (for now, use a cookie-based approach)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session_id');
    const userId = await getOrCreateUser(sessionCookie?.value);

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const channelLogins = favorites.map(f => f.channelLogin);

    return NextResponse.json({ favorites: channelLogins });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/favorites
 * Add a favorite channel
 */
export async function POST(request: NextRequest) {
  try {
    const { channelLogin } = await request.json();

    if (!channelLogin || typeof channelLogin !== 'string') {
      return NextResponse.json(
        { error: 'Channel login is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session_id');
    const userId = await getOrCreateUser(sessionCookie?.value);

    const normalizedLogin = channelLogin.toLowerCase();

    // Use upsert to avoid conflicts
    await prisma.favorite.upsert({
      where: {
        userId_channelLogin: {
          userId,
          channelLogin: normalizedLogin,
        },
      },
      update: {},
      create: {
        userId,
        channelLogin: normalizedLogin,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json(
      { error: 'Failed to add favorite' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/favorites
 * Remove a favorite channel
 */
export async function DELETE(request: NextRequest) {
  try {
    const { channelLogin } = await request.json();

    if (!channelLogin || typeof channelLogin !== 'string') {
      return NextResponse.json(
        { error: 'Channel login is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session_id');
    const userId = await getOrCreateUser(sessionCookie?.value);

    const normalizedLogin = channelLogin.toLowerCase();

    await prisma.favorite.deleteMany({
      where: {
        userId,
        channelLogin: normalizedLogin,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json(
      { error: 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}
