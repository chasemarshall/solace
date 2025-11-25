import { UI_CONSTANTS } from '@/lib/constants/ui';

export type Emote = {
  id: string;
  name: string;
  urls: {
    "1": string;
    "2": string;
    "4": string;
  };
};

export type EmoteProvider = 'bttv' | 'ffz' | '7tv';

type EmoteConfig = {
  globalUrl: string;
  channelUrl?: (id: string) => string;
  parseGlobalEmotes: (data: any) => Emote[];
  parseChannelEmotes?: (data: any) => Emote[];
};

const EMOTE_CONFIGS: Record<EmoteProvider, EmoteConfig> = {
  bttv: {
    globalUrl: 'https://api.betterttv.net/3/cached/emotes/global',
    channelUrl: (roomId: string) => `https://api.betterttv.net/3/cached/users/twitch/${roomId}`,
    parseGlobalEmotes: (data: any[]) => {
      return data.map((emote: any) => ({
        id: emote.id,
        name: emote.code,
        urls: {
          "1": `https://cdn.betterttv.net/emote/${emote.id}/1x`,
          "2": `https://cdn.betterttv.net/emote/${emote.id}/2x`,
          "4": `https://cdn.betterttv.net/emote/${emote.id}/3x`,
        }
      }));
    },
    parseChannelEmotes: (data: any) => {
      const channelEmotes = [...(data.channelEmotes || []), ...(data.sharedEmotes || [])];
      return channelEmotes.map((emote: any) => ({
        id: emote.id,
        name: emote.code,
        urls: {
          "1": `https://cdn.betterttv.net/emote/${emote.id}/1x`,
          "2": `https://cdn.betterttv.net/emote/${emote.id}/2x`,
          "4": `https://cdn.betterttv.net/emote/${emote.id}/3x`,
        }
      }));
    }
  },
  ffz: {
    globalUrl: 'https://api.frankerfacez.com/v1/set/global',
    channelUrl: (channelName: string) => `https://api.frankerfacez.com/v1/room/${channelName}`,
    parseGlobalEmotes: (data: any) => {
      const emotes: Emote[] = [];
      Object.values(data.sets || {}).forEach((set: any) => {
        Object.values(set.emoticons || {}).forEach((emote: any) => {
          emotes.push({
            id: emote.id.toString(),
            name: emote.name,
            urls: {
              "1": `https://cdn.frankerfacez.com/emoticon/${emote.id}/1`,
              "2": `https://cdn.frankerfacez.com/emoticon/${emote.id}/2`,
              "4": `https://cdn.frankerfacez.com/emoticon/${emote.id}/4`,
            }
          });
        });
      });
      return emotes;
    },
    parseChannelEmotes: (data: any) => {
      const emotes: Emote[] = [];
      if (data?.sets) {
        Object.values(data.sets).forEach((set: any) => {
          Object.values(set.emoticons || {}).forEach((emote: any) => {
            emotes.push({
              id: emote.id.toString(),
              name: emote.name,
              urls: {
                "1": `https://cdn.frankerfacez.com/emoticon/${emote.id}/1`,
                "2": `https://cdn.frankerfacez.com/emoticon/${emote.id}/2`,
                "4": `https://cdn.frankerfacez.com/emoticon/${emote.id}/4`,
              }
            });
          });
        });
      }
      return emotes;
    }
  },
  '7tv': {
    globalUrl: 'https://7tv.io/v3/emote-sets/global',
    channelUrl: (roomId: string) => `https://7tv.io/v3/users/twitch/${roomId}`,
    parseGlobalEmotes: (data: any) => {
      return (data.emotes || []).map((emote: any) => ({
        id: emote.id,
        name: emote.name,
        urls: {
          "1": `https://cdn.7tv.app/emote/${emote.id}/1x.webp`,
          "2": `https://cdn.7tv.app/emote/${emote.id}/2x.webp`,
          "4": `https://cdn.7tv.app/emote/${emote.id}/3x.webp`,
        }
      }));
    },
    parseChannelEmotes: (data: any) => {
      return (data?.emote_set?.emotes || []).map((emote: any) => ({
        id: emote.id,
        name: emote.name,
        urls: {
          "1": `https://cdn.7tv.app/emote/${emote.id}/1x.webp`,
          "2": `https://cdn.7tv.app/emote/${emote.id}/2x.webp`,
          "4": `https://cdn.7tv.app/emote/${emote.id}/3x.webp`,
        }
      }));
    }
  }
};

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(url: string, timeout: number = UI_CONSTANTS.EMOTE_FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generic emote fetcher for all providers
 *
 * @param provider - The emote provider (bttv, ffz, 7tv)
 * @param channelName - The channel name (for FFZ)
 * @param roomId - The Twitch room ID (for BTTV and 7TV)
 * @returns Object mapping emote names to Emote objects
 */
export async function fetchEmotes(
  provider: EmoteProvider,
  channelName: string,
  roomId?: string
): Promise<{ [key: string]: Emote }> {
  const config = EMOTE_CONFIGS[provider];
  const allEmotes: { [key: string]: Emote } = {};

  try {
    // Fetch global emotes
    const globalRes = await fetchWithTimeout(config.globalUrl);

    if (!globalRes.ok) {
      throw new Error(`${provider.toUpperCase()} global API returned ${globalRes.status}`);
    }

    const globalData = await globalRes.json();

    // Parse and add global emotes
    const globalEmotes = config.parseGlobalEmotes(globalData);
    globalEmotes.forEach(emote => {
      allEmotes[emote.name] = emote;
    });

    // Fetch channel-specific emotes if available
    if (config.channelUrl && config.parseChannelEmotes) {
      try {
        // For FFZ, use channelName; for BTTV and 7TV, use roomId
        const channelUrl = provider === 'ffz'
          ? config.channelUrl(channelName)
          : (roomId ? config.channelUrl(roomId) : null);

        if (channelUrl) {
          const channelRes = await fetchWithTimeout(channelUrl);
          if (channelRes.ok) {
            const channelData = await channelRes.json();
            const channelEmotes = config.parseChannelEmotes(channelData);
            channelEmotes.forEach(emote => {
              allEmotes[emote.name] = emote;
            });
          }
        }
      } catch (e) {
        // Channel emotes fetch failed, continue with global emotes only
        if (process.env.NODE_ENV === 'development') {
          console.warn(`${provider.toUpperCase()} channel emotes fetch failed:`, e);
        }
      }
    }

    return allEmotes;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Failed to fetch ${provider.toUpperCase()} emotes:`, error);
    }
    return {};
  }
}

/**
 * Fetch all emotes from all providers
 */
export async function fetchAllEmotes(
  channelName: string,
  roomId?: string,
  enabledProviders: { bttv: boolean; ffz: boolean; '7tv': boolean } = { bttv: true, ffz: true, '7tv': true }
): Promise<{
  bttv: { [key: string]: Emote };
  ffz: { [key: string]: Emote };
  '7tv': { [key: string]: Emote };
}> {
  const [bttv, ffz, seventv] = await Promise.all([
    enabledProviders.bttv ? fetchEmotes('bttv', channelName, roomId) : Promise.resolve({}),
    enabledProviders.ffz ? fetchEmotes('ffz', channelName, roomId) : Promise.resolve({}),
    enabledProviders['7tv'] ? fetchEmotes('7tv', channelName, roomId) : Promise.resolve({}),
  ]);

  return { bttv, ffz, '7tv': seventv };
}
