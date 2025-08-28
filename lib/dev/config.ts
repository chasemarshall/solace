interface DevConfig {
  adBlockerEnabled: boolean;
  analyticsEnabled: boolean;
  debugLogging: boolean;
  maxRequestsPerMinute: number;
  allowedOrigins: string[];
}

export function getDevConfig(): DevConfig | null {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return {
    adBlockerEnabled: process.env.ENABLE_AD_BLOCKER === 'true',
    analyticsEnabled: process.env.DEV_ANALYTICS_ENABLED === 'true',
    debugLogging: process.env.DEV_DEBUG_LOGGING === 'true',
    maxRequestsPerMinute: parseInt(process.env.DEV_MAX_REQUESTS_PER_MINUTE || '1000'),
    allowedOrigins: (process.env.DEV_CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(',').filter(Boolean)
  };
}

export function validateDevEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (process.env.NODE_ENV === 'production') {
    errors.push('Dev mode is not available in production');
  }
  
  if (!process.env.TWITCH_CLIENT_ID) {
    errors.push('TWITCH_CLIENT_ID is required');
  }
  
  if (!process.env.TWITCH_CLIENT_SECRET) {
    errors.push('TWITCH_CLIENT_SECRET is required for dev mode');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}