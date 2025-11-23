import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const adapter = new PrismaPg(pool);

export const prisma = global.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

/**
 * Get or create a user by their session cookie
 * For now, we'll use a simple anonymous user approach until full auth is implemented
 */
export async function getOrCreateUser(sessionId?: string): Promise<string> {
  // If no session ID provided, use a default anonymous user
  if (!sessionId) {
    const anonymousUser = await prisma.user.findFirst({
      where: { twitchId: null },
    });

    if (anonymousUser) {
      return anonymousUser.id;
    }

    const newUser = await prisma.user.create({
      data: {},
    });

    return newUser.id;
  }

  // Try to find user by twitchId (session ID)
  let user = await prisma.user.findUnique({
    where: { twitchId: sessionId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        twitchId: sessionId,
      },
    });
  }

  return user.id;
}
