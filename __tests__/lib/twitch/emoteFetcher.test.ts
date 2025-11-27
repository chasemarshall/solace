import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fetchEmotes, fetchAllEmotes } from '@/lib/twitch/emoteFetcher';

// Helper to create more complete Response mocks
function createMockResponse(data: any, options: Partial<Response> = {}): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    statusText: options.statusText ?? 'OK',
    headers: new Headers(options.headers),
    redirected: false,
    type: 'basic',
    url: '',
    body: null,
    bodyUsed: false,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    clone: function() { return this; },
  } as Response;
}

describe('emoteFetcher utilities', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  describe('fetchEmotes - BTTV', () => {
    it('should fetch and parse global BTTV emotes', async () => {
      const mockGlobalEmotes = [
        { id: 'emote1', code: 'Kappa' },
        { id: 'emote2', code: 'PogChamp' },
      ];

      global.fetch = vi.fn((url: string) => {
        if (url.includes('global')) {
          return Promise.resolve(createMockResponse(mockGlobalEmotes));
        }
        return Promise.resolve(createMockResponse(null, { ok: false, status: 404 }));
      });

      const emotes = await fetchEmotes('bttv', 'testchannel', '123456');

      expect(emotes).toHaveProperty('Kappa');
      expect(emotes).toHaveProperty('PogChamp');
      expect(emotes.Kappa.urls['1']).toContain('emote1/1x');
      expect(emotes.Kappa.urls['2']).toContain('emote1/2x');
    });

    it('should fetch and parse channel BTTV emotes', async () => {
      const mockGlobalEmotes = [];
      const mockChannelEmotes = {
        channelEmotes: [{ id: 'channel1', code: 'ChannelEmote' }],
        sharedEmotes: [{ id: 'shared1', code: 'SharedEmote' }],
      };

      global.fetch = vi.fn((url: string) => {
        if (url.includes('global')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockGlobalEmotes),
          } as Response);
        } else if (url.includes('twitch/123456')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockChannelEmotes),
          } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      });

      const emotes = await fetchEmotes('bttv', 'testchannel', '123456');

      expect(emotes).toHaveProperty('ChannelEmote');
      expect(emotes).toHaveProperty('SharedEmote');
    });

    it('should handle BTTV channel emotes failure gracefully', async () => {
      global.fetch = vi.fn((url: string) => {
        if (url.includes('global')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 'emote1', code: 'GlobalEmote' }]),
          } as Response);
        }
        // Channel fetch fails
        return Promise.resolve({ ok: false, status: 404 } as Response);
      });

      const emotes = await fetchEmotes('bttv', 'testchannel', '123456');

      // Should still have global emotes
      expect(emotes).toHaveProperty('GlobalEmote');
    });
  });

  describe('fetchEmotes - FFZ', () => {
    it('should fetch and parse global FFZ emotes', async () => {
      const mockFFZData = {
        sets: {
          '3': {
            emoticons: [
              { id: 1, name: 'FFZEmote1' },
              { id: 2, name: 'FFZEmote2' },
            ],
          },
        },
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFFZData),
        } as Response)
      );

      const emotes = await fetchEmotes('ffz', 'testchannel');

      expect(emotes).toHaveProperty('FFZEmote1');
      expect(emotes).toHaveProperty('FFZEmote2');
      expect(emotes.FFZEmote1.urls['1']).toContain('emoticon/1/1');
    });

    it('should fetch and parse channel FFZ emotes', async () => {
      const mockGlobalData = { sets: {} };
      const mockChannelData = {
        sets: {
          '12345': {
            emoticons: [{ id: 100, name: 'ChannelFFZ' }],
          },
        },
      };

      global.fetch = vi.fn((url: string) => {
        if (url.includes('global')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockGlobalData),
          } as Response);
        } else if (url.includes('room/testchannel')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockChannelData),
          } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      });

      const emotes = await fetchEmotes('ffz', 'testchannel');

      expect(emotes).toHaveProperty('ChannelFFZ');
    });
  });

  describe('fetchEmotes - 7TV', () => {
    it('should fetch and parse global 7TV emotes', async () => {
      const mock7TVData = {
        emotes: [
          { id: '7tv1', name: '7TVEmote1' },
          { id: '7tv2', name: '7TVEmote2' },
        ],
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mock7TVData),
        } as Response)
      );

      const emotes = await fetchEmotes('7tv', 'testchannel', '123456');

      expect(emotes).toHaveProperty('7TVEmote1');
      expect(emotes).toHaveProperty('7TVEmote2');
      expect(emotes['7TVEmote1'].urls['1']).toContain('7tv1/1x.webp');
    });

    it('should fetch and parse channel 7TV emotes', async () => {
      const mockGlobalData = { emotes: [] };
      const mockChannelData = {
        emote_set: {
          emotes: [{ id: 'channel7tv', name: 'Channel7TV' }],
        },
      };

      global.fetch = vi.fn((url: string) => {
        if (url.includes('global')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockGlobalData),
          } as Response);
        } else if (url.includes('twitch/123456')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockChannelData),
          } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      });

      const emotes = await fetchEmotes('7tv', 'testchannel', '123456');

      expect(emotes).toHaveProperty('Channel7TV');
    });
  });

  describe('timeout behavior', () => {
    it('should handle AbortController signal correctly', async () => {
      let abortSignalReceived = false;

      global.fetch = vi.fn((url: string, options?: any) => {
        // Check if signal was provided
        if (options?.signal) {
          abortSignalReceived = true;
        }

        // Return immediately
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response);
      });

      // Start fetch
      await fetchEmotes('bttv', 'testchannel');

      // Verify AbortController signal was passed to fetch
      expect(abortSignalReceived).toBe(true);
    });

    it('should return empty object on network timeout/abort', async () => {
      global.fetch = vi.fn(() => {
        return Promise.reject(new Error('Network timeout'));
      });

      const emotes = await fetchEmotes('bttv', 'testchannel');

      // Should gracefully handle timeout and return empty object
      expect(emotes).toEqual({});
    });
  });

  describe('error handling', () => {
    it('should return empty object when global fetch fails', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        } as Response)
      );

      const emotes = await fetchEmotes('bttv', 'testchannel');

      expect(emotes).toEqual({});
    });

    it('should return empty object when fetch throws error', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      const emotes = await fetchEmotes('bttv', 'testchannel');

      expect(emotes).toEqual({});
    });

    it('should return empty object when JSON parsing fails', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.reject(new Error('Invalid JSON')),
        } as Response)
      );

      const emotes = await fetchEmotes('bttv', 'testchannel');

      expect(emotes).toEqual({});
    });

    it('should continue with global emotes when channel emotes fail', async () => {
      global.fetch = vi.fn((url: string) => {
        if (url.includes('global')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: '1', code: 'Global' }]),
          } as Response);
        }
        // Channel fetch throws
        return Promise.reject(new Error('Channel not found'));
      });

      const emotes = await fetchEmotes('bttv', 'testchannel', '123456');

      expect(emotes).toHaveProperty('Global');
    });
  });

  describe('fetchAllEmotes', () => {
    it('should fetch emotes from all providers in parallel', async () => {
      const fetchTimes: number[] = [];
      const startTime = Date.now();

      global.fetch = vi.fn((url: string) => {
        // Record fetch start time relative to test start
        fetchTimes.push(Date.now() - startTime);

        const mockData = url.includes('betterttv')
          ? []
          : url.includes('frankerfacez')
          ? { sets: {} }
          : { emotes: [] };

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockData),
        } as Response);
      });

      const result = await fetchAllEmotes('testchannel', '123456');

      expect(result).toHaveProperty('bttv');
      expect(result).toHaveProperty('ffz');
      expect(result).toHaveProperty('7tv');

      // All 3 providers should be called (6 total: global + channel for each)
      expect(global.fetch).toHaveBeenCalledTimes(6);

      // Verify parallel execution: all fetches should start at roughly the same time
      // Calculate spread between first and last fetch start times
      const timeSpread = Math.max(...fetchTimes) - Math.min(...fetchTimes);

      // If truly parallel, all should start within a few milliseconds
      // Allow up to 50ms for test execution overhead
      expect(timeSpread).toBeLessThan(50);

      // Verify it was called for all providers
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('betterttv'),
        expect.anything()
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('frankerfacez'),
        expect.anything()
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('7tv.io'),
        expect.anything()
      );
    });

    it('should respect enabled providers settings', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response)
      );

      const result = await fetchAllEmotes('testchannel', '123456', {
        bttv: true,
        ffz: false,
        '7tv': false,
      });

      expect(result.bttv).toBeDefined();
      expect(result.ffz).toEqual({});
      expect(result['7tv']).toEqual({});

      // Only BTTV should be fetched
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('betterttv'),
        expect.anything()
      );
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('frankerfacez'),
        expect.anything()
      );
    });

    it('should handle partial failures gracefully', async () => {
      global.fetch = vi.fn((url: string) => {
        if (url.includes('betterttv')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: '1', code: 'BTTVEmote' }]),
          } as Response);
        } else if (url.includes('frankerfacez')) {
          // FFZ fails
          return Promise.reject(new Error('FFZ error'));
        } else {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ emotes: [{ id: '2', name: '7TVEmote' }] }),
          } as Response);
        }
      });

      const result = await fetchAllEmotes('testchannel', '123456');

      // BTTV and 7TV should succeed, FFZ should be empty
      expect(result.bttv).toHaveProperty('BTTVEmote');
      expect(result.ffz).toEqual({});
      expect(result['7tv']).toHaveProperty('7TVEmote');
    });

    it('should handle all providers failing', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      const result = await fetchAllEmotes('testchannel', '123456');

      expect(result.bttv).toEqual({});
      expect(result.ffz).toEqual({});
      expect(result['7tv']).toEqual({});
    });
  });

  describe('emote parsing edge cases', () => {
    it('should handle missing emotes array in 7TV response', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}), // No emotes field
        } as Response)
      );

      const emotes = await fetchEmotes('7tv', 'testchannel');

      expect(emotes).toEqual({});
    });

    it('should handle missing sets in FFZ response', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}), // No sets field
        } as Response)
      );

      const emotes = await fetchEmotes('ffz', 'testchannel');

      expect(emotes).toEqual({});
    });

    it('should skip channel emotes when roomId is not provided', async () => {
      global.fetch = vi.fn((url: string) => {
        if (url.includes('global')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: '1', code: 'GlobalEmote' }]),
          } as Response);
        }
        // Should not be called
        throw new Error('Should not fetch channel emotes without roomId');
      });

      // No roomId provided for BTTV
      const emotes = await fetchEmotes('bttv', 'testchannel');

      expect(emotes).toHaveProperty('GlobalEmote');
      // Verify channel fetch wasn't attempted
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
