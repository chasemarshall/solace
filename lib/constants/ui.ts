/**
 * UI-related constants
 * Centralized to avoid magic numbers and make changes easier
 */

export const UI_CONSTANTS = {
  // Infinite scroll
  INFINITE_SCROLL_MARGIN: '800px', // Distance before end to trigger load

  // Chat settings
  CHAT_SCROLL_TOLERANCE: 50, // Pixels from bottom to auto-scroll
  MESSAGE_GROUP_THRESHOLD: 60000, // 1 minute in milliseconds for grouping messages

  // API timeouts
  EMOTE_FETCH_TIMEOUT: 10000, // 10 seconds for emote API requests
  PROXY_TEST_TIMEOUT: 5000, // 5 seconds for proxy health checks

  // Animation durations
  TOAST_DURATION: 3000, // 3 seconds
  TRANSITION_DURATION: 300, // 300ms for standard transitions
} as const;
