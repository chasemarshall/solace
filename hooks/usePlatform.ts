import { useState, useEffect } from 'react';
import {
  detectBrowser,
  detectPlatform,
  detectMediaCapabilities,
  type BrowserInfo,
  type PlatformInfo,
  type MediaCapabilities,
} from '@/lib/utils/browserCompat';

interface EnvironmentInfo {
  browser: BrowserInfo;
  platform: PlatformInfo;
  media: MediaCapabilities;
}

/**
 * React hook for detecting browser, platform, and media capabilities
 * Runs only on client-side and caches the result
 */
export function usePlatform() {
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo>({
    browser: {
      isArc: false,
      isChrome: false,
      isSafari: false,
      isFirefox: false,
      isEdge: false,
      version: 0,
      supportsStorageAccess: false,
      supportsBackdropFilter: false,
    },
    platform: {
      isMacOS: false,
      isIOS: false,
      isWindows: false,
      isLinux: false,
      isAndroid: false,
      platformName: 'unknown',
    },
    media: {
      supportsNativeHLS: false,
      supportsWebkitPiP: false,
      supportsStandardPiP: false,
      supportsAirPlay: false,
      preferNativeHLS: false,
    },
  });

  useEffect(() => {
    // Detect environment on mount
    const browser = detectBrowser();
    const platform = detectPlatform();
    const media = detectMediaCapabilities();

    setEnvInfo({ browser, platform, media });

    // Log for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[usePlatform] Environment detected:', {
        browser: `${browser.isSafari ? 'Safari' : browser.isChrome ? 'Chrome' : browser.isArc ? 'Arc' : browser.isFirefox ? 'Firefox' : browser.isEdge ? 'Edge' : 'Unknown'} ${browser.version}`,
        platform: platform.platformName,
        nativeHLS: media.supportsNativeHLS,
        preferNativeHLS: media.preferNativeHLS,
      });
    }
  }, []);

  return envInfo;
}

/**
 * Simple hook to check if running on macOS
 */
export function useIsMacOS() {
  const { platform } = usePlatform();
  return platform.isMacOS;
}

/**
 * Simple hook to check if Safari browser
 */
export function useIsSafari() {
  const { browser } = usePlatform();
  return browser.isSafari;
}

/**
 * Hook to check if native HLS should be preferred
 */
export function usePreferNativeHLS() {
  const { media } = usePlatform();
  return media.preferNativeHLS;
}
