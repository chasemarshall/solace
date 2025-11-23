import { NextRequest, NextResponse } from 'next/server';
import { prisma, getOrCreateUser } from '@/lib/db';
import { cookies } from 'next/headers';

/**
 * GET /api/follows
 * Fetch all follows for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session_id');
    const userId = await getOrCreateUser(sessionCookie?.value);

    const follows = await prisma.follow.findMany({
      where: { userId },
      orderBy: { followedAt: 'desc' },
    });

    // Convert to the format expected by the frontend
    const formattedFollows = follows.map(f => ({
      channel: f.channelLogin,
      displayName: f.displayName,
      followedAt: f.followedAt,
      lastLive: f.lastLive,
    }));

    return NextResponse.json({ follows: formattedFollows });
  } catch (error) {
    console.error('Error fetching follows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch follows' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/follows
 * Follow a channel
 */
export async function POST(request: NextRequest) {
  try {
    const { channel, displayName } = await request.json();

    if (!channel || typeof channel !== 'string') {
      return NextResponse.json(
        { error: 'Channel is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session_id');
    const userId = await getOrCreateUser(sessionCookie?.value);

    const normalizedChannel = channel.toLowerCase();

    // Use upsert to avoid conflicts
    await prisma.follow.upsert({
      where: {
        userId_channelLogin: {
          userId,
          channelLogin: normalizedChannel,
        },
      },
      update: {
        displayName: displayName || channel,
      },
      create: {
        userId,
        channelLogin: normalizedChannel,
        displayName: displayName || channel,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error following channel:', error);
    return NextResponse.json(
      { error: 'Failed to follow channel' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/follows
 * Unfollow a channel
 */
export async function DELETE(request: NextRequest) {
  try {
    const { channel } = await request.json();

    if (!channel || typeof channel !== 'string') {
      return NextResponse.json(
        { error: 'Channel is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session_id');
    const userId = await getOrCreateUser(sessionCookie?.value);

    const normalizedChannel = channel.toLowerCase();

    await prisma.follow.deleteMany({
      where: {
        userId,
        channelLogin: normalizedChannel,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unfollowing channel:', error);
    return NextResponse.json(
      { error: 'Failed to unfollow channel' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/follows
 * Update last live time for a channel
 */
export async function PATCH(request: NextRequest) {
  try {
    const { channel } = await request.json();

    if (!channel || typeof channel !== 'string') {
      return NextResponse.json(
        { error: 'Channel is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session_id');
    const userId = await getOrCreateUser(sessionCookie?.value);

    const normalizedChannel = channel.toLowerCase();

    await prisma.follow.updateMany({
      where: {
        userId,
        channelLogin: normalizedChannel,
      },
      data: {
        lastLive: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating last live:', error);
    return NextResponse.json(
      { error: 'Failed to update last live' },
      { status: 500 }
    );
  }
}
