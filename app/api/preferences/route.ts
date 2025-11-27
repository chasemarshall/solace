import { NextRequest, NextResponse } from 'next/server';
import { prisma, getOrCreateUser } from '@/lib/db';
import { extractSessionIdentifier } from '@/lib/auth/twitchTokens';

/**
 * GET /api/preferences
 * Fetch user preferences
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = extractSessionIdentifier(request);
    const userId = await getOrCreateUser(sessionId);

    let preferences = await prisma.userPreference.findUnique({
      where: { userId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await prisma.userPreference.create({
        data: {
          userId,
          proxySelection: 'iframe',
          chatFontSize: 14,
          showTimestamps: false,
        },
      });
    }

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/preferences
 * Update user preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const updates = await request.json();

    const sessionId = extractSessionIdentifier(request);
    const userId = await getOrCreateUser(sessionId);

    // Use upsert to create or update preferences
    const preferences = await prisma.userPreference.upsert({
      where: { userId },
      update: updates,
      create: {
        userId,
        ...updates,
      },
    });

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
