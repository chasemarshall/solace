/**
 * LocalStorage key constants
 * Centralized to prevent typos and make key changes easier
 */

export const STORAGE_KEYS = {
  // Proxy and player settings
  PROXY_SELECTION: 'proxy_selection',
  USE_NATIVE_PLAYER: 'use_native_player',
  // Legacy key for backward compatibility (will be migrated)
  DISABLE_NATIVE_PLAYER: 'disable_native_player',

  // Chat settings
  CHAT_SHOW_BADGES: 'chat_show_badges',

  // Emote provider settings
  EMOTES_BTTV: 'emotes_bttv',
  EMOTES_FFZ: 'emotes_ffz',
  EMOTES_7TV: 'emotes_7tv',

  // Theme settings
  THEME: 'theme',

  // Auth
  TWITCH_AUTH: 'twitch_auth',
  TWITCH_USERNAME: 'twitch_username',
  TWITCH_OAUTH: 'twitch_oauth',
} as const;
