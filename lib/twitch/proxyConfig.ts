/**
 * Twitch Ad-Free Proxy Configuration
 *
 * Defines a fallback chain of proxy services that provide ad-free Twitch streams.
 * Each proxy is tried in order until one successfully provides a stream.
 */

export interface ProxyEndpoint {
  name: string;
  baseUrl: string;
  region: string;
  getPlaylistUrl: (channel: string) => string;
  priority: number;
}

/**
 * Available proxy endpoints for ad-free Twitch streams
 * Listed in priority order (lower number = higher priority)
 */
export const PROXY_ENDPOINTS: ProxyEndpoint[] = [
  // Luminous.dev proxies - most reliable
  {
    name: 'Luminous EU',
    baseUrl: 'https://eu.luminous.dev',
    region: 'Europe',
    getPlaylistUrl: (channel: string) =>
      `https://eu.luminous.dev/live/${encodeURIComponent(channel)}?allow_source=true&allow_audio_only=true&fast_bread=true`,
    priority: 1,
  },
  {
    name: 'Luminous Asia',
    baseUrl: 'https://as.luminous.dev',
    region: 'Asia',
    getPlaylistUrl: (channel: string) =>
      `https://as.luminous.dev/live/${encodeURIComponent(channel)}?allow_source=true&allow_audio_only=true&fast_bread=true`,
    priority: 2,
  },

  // CDN PerfProd proxies - community maintained
  {
    name: 'PerfProd EU',
    baseUrl: 'https://lb-eu.cdn-perfprod.com',
    region: 'Europe',
    getPlaylistUrl: (channel: string) =>
      `https://lb-eu.cdn-perfprod.com/playlist/${encodeURIComponent(channel)}.m3u8`,
    priority: 3,
  },
  {
    name: 'PerfProd NA',
    baseUrl: 'https://lb-na.cdn-perfprod.com',
    region: 'North America',
    getPlaylistUrl: (channel: string) =>
      `https://lb-na.cdn-perfprod.com/playlist/${encodeURIComponent(channel)}.m3u8`,
    priority: 4,
  },
  {
    name: 'PerfProd Asia',
    baseUrl: 'https://lb-as.cdn-perfprod.com',
    region: 'Asia',
    getPlaylistUrl: (channel: string) =>
      `https://lb-as.cdn-perfprod.com/playlist/${encodeURIComponent(channel)}.m3u8`,
    priority: 5,
  },
  {
    name: 'PerfProd EU2',
    baseUrl: 'https://lb-eu2.cdn-perfprod.com',
    region: 'Europe',
    getPlaylistUrl: (channel: string) =>
      `https://lb-eu2.cdn-perfprod.com/playlist/${encodeURIComponent(channel)}.m3u8`,
    priority: 6,
  },
];

/**
 * Proxy host allowlist for HLS proxy security validation
 */
export const PROXY_ALLOWED_HOSTS = [
  'eu.luminous.dev',
  'as.luminous.dev',
  'bg.luminous.dev',
  'lb-eu.cdn-perfprod.com',
  'lb-eu2.cdn-perfprod.com',
  'lb-eu3.cdn-perfprod.com',
  'lb-eu4.cdn-perfprod.com',
  'lb-eu5.cdn-perfprod.com',
  'lb-na.cdn-perfprod.com',
  'lb-as.cdn-perfprod.com',
  'lb-sa.cdn-perfprod.com',
  'twitch.nadeko.net',
];

/**
 * Proxy domains for CSP configuration
 */
export const PROXY_CSP_DOMAINS = [
  'https://*.luminous.dev',
  'https://*.cdn-perfprod.com',
  'https://twitch.nadeko.net',
];

/**
 * Configuration for proxy failover behavior
 */
export const FAILOVER_CONFIG = {
  /** Maximum number of proxies to try before giving up */
  maxRetries: 3,

  /** Timeout in milliseconds for each proxy attempt */
  timeout: 8000,

  /** Delay between retry attempts in milliseconds */
  retryDelay: 1000,

  /** Maximum time to wait for initial playlist response (ms) */
  initialLoadTimeout: 10000,
};
