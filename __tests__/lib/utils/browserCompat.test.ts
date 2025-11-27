import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectBrowser,
  detectPlatform,
  detectMediaCapabilities,
  getBrowserClasses,
  getEnvironmentInfo,
  initBrowserPolyfills,
} from '@/lib/utils/browserCompat';

describe('browserCompat utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectBrowser', () => {
    it('should return browser info object with expected properties', () => {
      const browser = detectBrowser();

      expect(browser).toHaveProperty('isArc');
      expect(browser).toHaveProperty('isChrome');
      expect(browser).toHaveProperty('isSafari');
      expect(browser).toHaveProperty('isFirefox');
      expect(browser).toHaveProperty('isEdge');
      expect(browser).toHaveProperty('version');
      expect(browser).toHaveProperty('supportsStorageAccess');
      expect(browser).toHaveProperty('supportsBackdropFilter');

      // All should be boolean or number
      expect(typeof browser.isArc).toBe('boolean');
      expect(typeof browser.version).toBe('number');
    });

    it('should detect at most one browser as primary', () => {
      const browser = detectBrowser();
      const browserFlags = [
        browser.isChrome,
        browser.isSafari,
        browser.isFirefox,
        browser.isEdge,
        browser.isArc,
      ];

      const trueCount = browserFlags.filter(Boolean).length;
      expect(trueCount).toBeLessThanOrEqual(1);
    });
  });

  describe('detectPlatform', () => {
    it('should return platform info object with expected properties', () => {
      const platform = detectPlatform();

      expect(platform).toHaveProperty('isMacOS');
      expect(platform).toHaveProperty('isIOS');
      expect(platform).toHaveProperty('isWindows');
      expect(platform).toHaveProperty('isLinux');
      expect(platform).toHaveProperty('isAndroid');
      expect(platform).toHaveProperty('platformName');

      expect(typeof platform.platformName).toBe('string');
    });

    it('should detect at most one platform as primary', () => {
      const platform = detectPlatform();
      const platformFlags = [
        platform.isMacOS,
        platform.isIOS,
        platform.isWindows,
        platform.isLinux,
        platform.isAndroid,
      ];

      const trueCount = platformFlags.filter(Boolean).length;
      expect(trueCount).toBeLessThanOrEqual(1);
    });

    it('should have valid platform name', () => {
      const platform = detectPlatform();
      const validNames = ['macOS', 'iOS', 'Windows', 'Linux', 'Android', 'unknown'];

      expect(validNames).toContain(platform.platformName);
    });
  });

  describe('detectMediaCapabilities', () => {
    it('should return media capabilities object with expected properties', () => {
      const media = detectMediaCapabilities();

      expect(media).toHaveProperty('supportsNativeHLS');
      expect(media).toHaveProperty('supportsWebkitPiP');
      expect(media).toHaveProperty('supportsStandardPiP');
      expect(media).toHaveProperty('supportsAirPlay');
      expect(media).toHaveProperty('preferNativeHLS');

      expect(typeof media.supportsNativeHLS).toBe('boolean');
      expect(typeof media.preferNativeHLS).toBe('boolean');
    });

    it('should not prefer native HLS if it is not supported', () => {
      const media = detectMediaCapabilities();

      if (!media.supportsNativeHLS) {
        expect(media.preferNativeHLS).toBe(false);
      }
    });
  });

  describe('getBrowserClasses', () => {
    it('should return a string', () => {
      const classes = getBrowserClasses();
      expect(typeof classes).toBe('string');
    });

    it('should return valid CSS class names', () => {
      const classes = getBrowserClasses();
      const classList = classes.split(' ').filter(Boolean);

      // All classes should be valid CSS class names (no spaces, special chars)
      classList.forEach(className => {
        expect(className).toMatch(/^[a-z][a-z0-9-]*$/);
      });
    });

    it('should include browser-specific class if browser detected', () => {
      const classes = getBrowserClasses();
      const browser = detectBrowser();

      if (browser.isChrome) {
        expect(classes).toContain('browser-chrome');
      }
      if (browser.isSafari) {
        expect(classes).toContain('browser-safari');
      }
      if (browser.isFirefox) {
        expect(classes).toContain('browser-firefox');
      }
      if (browser.isEdge) {
        expect(classes).toContain('browser-edge');
      }
      if (browser.isArc) {
        expect(classes).toContain('browser-arc');
      }
    });
  });

  describe('getEnvironmentInfo', () => {
    it('should return complete environment information', () => {
      const env = getEnvironmentInfo();

      expect(env).toHaveProperty('browser');
      expect(env).toHaveProperty('platform');
      expect(env).toHaveProperty('media');

      expect(env.browser).toHaveProperty('isChrome');
      expect(env.platform).toHaveProperty('platformName');
      expect(env.media).toHaveProperty('supportsNativeHLS');
    });

    it('should return consistent data with individual functions', () => {
      const env = getEnvironmentInfo();
      const browser = detectBrowser();
      const platform = detectPlatform();
      const media = detectMediaCapabilities();

      expect(env.browser.isChrome).toBe(browser.isChrome);
      expect(env.platform.platformName).toBe(platform.platformName);
      expect(env.media.supportsNativeHLS).toBe(media.supportsNativeHLS);
    });
  });

  describe('initBrowserPolyfills', () => {
    it('should not throw when called', () => {
      expect(() => {
        initBrowserPolyfills();
      }).not.toThrow();
    });

    it('should ensure requestStorageAccess is available', () => {
      initBrowserPolyfills();

      // After polyfill, these should exist (either native or polyfilled)
      expect(document.requestStorageAccess).toBeDefined();
      expect(document.hasStorageAccess).toBeDefined();
    });
  });
});
