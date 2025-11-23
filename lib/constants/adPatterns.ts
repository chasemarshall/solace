/**
 * Shared ad blocking patterns and domain lists
 * Used across client and server-side ad blocking implementations
 */

/**
 * Ad domain patterns to block
 * Includes traditional ad servers, SSAI endpoints, and analytics
 */
export const AD_DOMAINS = [
  // Traditional ad servers
  'ads.twitch.tv',
  'twitchads.com',
  'doubleclick.net',
  'googleads.g.doubleclick.net',
  'googlesyndication.com',
  'amazon-adsystem.com',
  'pubads.g.doubleclick.net',

  // SSAI patterns (Server-Side Ad Insertion)
  'video-weaver.',
  'video-edge-',
  'cloudfront.net',

  // Twitch-specific ad infrastructure
  'video-weaver.fra02.hls.ttvnw.net',

  // Analytics & tracking
  'analytics.twitch.tv',
  'spade.twitch.tv',
  'countess.twitch.tv',
] as const;

/**
 * Ad path patterns to block
 * Matches URL paths that typically contain ads
 */
export const AD_PATH_PATTERNS = [
  '/ads/',
  '/advertising/',
  '/commercial/',
  'stitched-ad',
  'ad-',
  'preroll',
  'midroll',
] as const;

/**
 * GraphQL operation patterns for ad-related queries
 * Used to filter out ad requests in GraphQL proxy
 */
export const GRAPHQL_AD_PATTERNS = [
  'VideoAdUI',
  'PlaybackAdAccessToken',
  'AdSchedule',
  'VideoPreviewCard',
  'AdManager',
  'CommercialBreak',
  'VideoPlayerStreamInfoOverlayChannel',
  'AdBreakActivity',
  'VideoAdBlock',
] as const;

/**
 * Check if a URL matches any ad pattern
 */
export function isAdRequest(url: string): boolean {
  const lowerUrl = url.toLowerCase();

  // Check domain patterns
  const matchesDomain = AD_DOMAINS.some(pattern =>
    lowerUrl.includes(pattern.toLowerCase())
  );

  // Check path patterns
  const matchesPath = AD_PATH_PATTERNS.some(pattern =>
    lowerUrl.includes(pattern.toLowerCase())
  );

  return matchesDomain || matchesPath;
}

/**
 * Check if a URL is a Twitch request
 */
export function isTwitchRequest(url: string): boolean {
  return url.includes('twitch.tv') ||
         url.includes('ttvnw.net') ||
         url.includes('jtvnw.net');
}
