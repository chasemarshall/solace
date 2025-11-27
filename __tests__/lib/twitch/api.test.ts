import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { helix, __resetTokenCache } from '@/lib/twitch/api';

describe('twitch api utilities', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    __resetTokenCache(); // Reset cache before each test
    // Set up environment variables
    process.env = {
      ...originalEnv,
      TWITCH_CLIENT_ID: 'test_client_id',
      TWITCH_CLIENT_SECRET: 'test_client_secret',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('helix', () => {
    it('should construct proper Helix API URLs with query params', async () => {
      let helixUrl = '';

      global.fetch = vi.fn((url: string) => {
        if (url.includes('oauth2/token')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                access_token: 'test_token',
                expires_in: 3600,
              }),
          } as Response);
        } else if (url.includes('helix/streams')) {
          helixUrl = url;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          } as Response);
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      await helix('streams', { user_login: 'testuser', first: 10 });

      expect(helixUrl).toContain('api.twitch.tv/helix/streams');
      expect(helixUrl).toContain('user_login=testuser');
      expect(helixUrl).toContain('first=10');
    });

    it('should skip undefined params in query string', async () => {
      let helixUrl = '';

      global.fetch = vi.fn((url: string) => {
        if (url.includes('oauth2/token')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                access_token: 'token',
                expires_in: 3600,
              }),
          } as Response);
        } else if (url.includes('helix/users')) {
          helixUrl = url;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          } as Response);
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      await helix('users', { login: 'testuser', undefined_param: undefined });

      expect(helixUrl).not.toContain('undefined');
      expect(helixUrl).toContain('login=testuser');
    });

    it('should include proper authorization headers', async () => {
      let headers: any = null;

      global.fetch = vi.fn((url: string, options?: any) => {
        if (url.includes('oauth2/token')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                access_token: 'test_token_123',
                expires_in: 3600,
              }),
          } as Response);
        } else if (url.includes('helix')) {
          headers = options?.headers;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          } as Response);
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      await helix('users', { login: 'testuser' });

      expect(headers).toBeDefined();
      expect(headers['Client-ID']).toBe('test_client_id');
      expect(headers['Authorization']).toContain('Bearer');
    });

    it('should throw error when Helix API returns non-ok status', async () => {
      global.fetch = vi.fn((url: string) => {
        if (url.includes('oauth2/token')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                access_token: 'token',
                expires_in: 3600,
              }),
          } as Response);
        } else if (url.includes('helix')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: () => Promise.resolve('Internal Server Error'),
          } as Response);
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      await expect(helix('users', { login: 'testuser' })).rejects.toThrow('Helix users failed');
    });

    it('should throw error when missing TWITCH_CLIENT_ID', async () => {
      delete process.env.TWITCH_CLIENT_ID;

      await expect(helix('users', { login: 'testuser' })).rejects.toThrow(
        'Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET'
      );
    });

    it('should throw error when missing TWITCH_CLIENT_SECRET', async () => {
      delete process.env.TWITCH_CLIENT_SECRET;

      await expect(helix('users', { login: 'testuser' })).rejects.toThrow(
        'Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET'
      );
    });

    it('should handle different query parameter types', async () => {
      let helixUrl = '';

      global.fetch = vi.fn((url: string) => {
        if (url.includes('oauth2/token')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                access_token: 'token',
                expires_in: 3600,
              }),
          } as Response);
        } else if (url.includes('helix')) {
          helixUrl = url;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          } as Response);
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      await helix('streams', {
        user_login: 'testuser', // string
        first: 20,              // number
        is_live: true,          // boolean
      });

      expect(helixUrl).toContain('user_login=testuser');
      expect(helixUrl).toContain('first=20');
      expect(helixUrl).toContain('is_live=true');
    });

    it('should return JSON response from Helix API', async () => {
      const mockData = {
        data: [
          { id: '123', login: 'testuser', display_name: 'TestUser' }
        ]
      };

      global.fetch = vi.fn((url: string) => {
        if (url.includes('oauth2/token')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                access_token: 'token',
                expires_in: 3600,
              }),
          } as Response);
        } else if (url.includes('helix')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockData),
          } as Response);
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const result = await helix('users', { login: 'testuser' });

      expect(result).toEqual(mockData);
    });
  });

  describe('token fetching', () => {
    it('should fetch token when making API call', async () => {
      let tokenRequested = false;

      global.fetch = vi.fn((url: string) => {
        if (url.includes('oauth2/token')) {
          tokenRequested = true;
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                access_token: 'fresh_token',
                expires_in: 3600,
              }),
          } as Response);
        } else if (url.includes('helix')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          } as Response);
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      await helix('users', { login: 'testuser' });

      expect(tokenRequested).toBe(true);
    });

    it('should throw error when token fetch fails', async () => {
      global.fetch = vi.fn((url: string) => {
        if (url.includes('oauth2/token')) {
          return Promise.resolve({
            ok: false,
            status: 401,
            text: () => Promise.resolve('Unauthorized'),
          } as Response);
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      await expect(helix('users', { login: 'testuser' })).rejects.toThrow('Token fetch failed');
    });

    it('should cache token and reuse for subsequent calls', async () => {
      let tokenFetchCount = 0;

      global.fetch = vi.fn((url: string) => {
        if (url.includes('oauth2/token')) {
          tokenFetchCount++;
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                access_token: 'cached_token',
                expires_in: 3600,
              }),
          } as Response);
        } else if (url.includes('helix')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          } as Response);
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      // First call
      await helix('users', { login: 'user1' });
      expect(tokenFetchCount).toBe(1);

      // Second call should use cached token
      await helix('users', { login: 'user2' });
      expect(tokenFetchCount).toBe(1); // Should not increase
    });
  });
});
