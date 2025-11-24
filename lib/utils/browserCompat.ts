/**
 * Browser compatibility utilities for Arc and cross-browser support
 */

export interface BrowserInfo {
  isArc: boolean;
  isChrome: boolean;
  isSafari: boolean;
  isFirefox: boolean;
  isEdge: boolean;
  version: number;
  supportsStorageAccess: boolean;
  supportsBackdropFilter: boolean;
}

export interface PlatformInfo {
  isMacOS: boolean;
  isIOS: boolean;
  isWindows: boolean;
  isLinux: boolean;
  isAndroid: boolean;
  platformName: string;
}

export interface MediaCapabilities {
  supportsNativeHLS: boolean;
  supportsWebkitPiP: boolean;
  supportsStandardPiP: boolean;
  supportsAirPlay: boolean;
  preferNativeHLS: boolean; // Recommended to use native HLS
}

/**
 * Detect current browser and capabilities
 */
export function detectBrowser(): BrowserInfo {
  if (typeof window === 'undefined') {
    return {
      isArc: false,
      isChrome: false,
      isSafari: false,
      isFirefox: false,
      isEdge: false,
      version: 0,
      supportsStorageAccess: false,
      supportsBackdropFilter: false,
    };
  }

  const ua = window.navigator.userAgent;
  const isArc = ua.includes('Arc/');
  const isChrome = ua.includes('Chrome/') && !ua.includes('Edg') && !isArc;
  const isSafari = ua.includes('Safari/') && !ua.includes('Chrome') && !isArc;
  const isFirefox = ua.includes('Firefox/');
  const isEdge = ua.includes('Edg/');

  // Extract version numbers
  let version = 0;
  if (isChrome || isArc) {
    const match = ua.match(/Chrome\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  } else if (isSafari) {
    const match = ua.match(/Version\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  } else if (isFirefox) {
    const match = ua.match(/Firefox\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  } else if (isEdge) {
    const match = ua.match(/Edg\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  }

  // Feature detection
  const supportsStorageAccess = 'requestStorageAccess' in document;
  const supportsBackdropFilter = CSS.supports('backdrop-filter', 'blur(1px)') || 
                                  CSS.supports('-webkit-backdrop-filter', 'blur(1px)');

  return {
    isArc,
    isChrome,
    isSafari,
    isFirefox,
    isEdge,
    version,
    supportsStorageAccess,
    supportsBackdropFilter,
  };
}

/**
 * Get browser-specific CSS classes
 */
export function getBrowserClasses(): string {
  const browser = detectBrowser();
  const classes: string[] = [];

  if (browser.isArc) classes.push('browser-arc');
  if (browser.isChrome) classes.push('browser-chrome');
  if (browser.isSafari) classes.push('browser-safari');
  if (browser.isFirefox) classes.push('browser-firefox');
  if (browser.isEdge) classes.push('browser-edge');
  
  if (!browser.supportsBackdropFilter) classes.push('no-backdrop-filter');
  if (!browser.supportsStorageAccess) classes.push('no-storage-access');

  return classes.join(' ');
}

/**
 * Detect current platform (OS)
 */
export function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined') {
    return {
      isMacOS: false,
      isIOS: false,
      isWindows: false,
      isLinux: false,
      isAndroid: false,
      platformName: 'unknown',
    };
  }

  const ua = window.navigator.userAgent;
  const platform = (window.navigator as any).userAgentData?.platform || window.navigator.platform;

  // macOS detection
  const macosPlatforms = ['macOS', 'Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
  const isMacOS = macosPlatforms.some(p => platform.includes(p)) || /Mac|Macintosh/.test(ua);

  // iOS detection (iPhone, iPad, iPod)
  const iosPlatforms = ['iPhone', 'iPad', 'iPod'];
  const isIOS = iosPlatforms.some(p => platform.includes(p)) ||
                (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

  // Windows detection
  const isWindows = platform.includes('Win') || /Windows/.test(ua);

  // Android detection
  const isAndroid = /Android/.test(ua);

  // Linux detection (but not Android)
  const isLinux = (platform.includes('Linux') || /Linux/.test(ua)) && !isAndroid;

  // Determine platform name
  let platformName = 'unknown';
  if (isMacOS) platformName = 'macOS';
  else if (isIOS) platformName = 'iOS';
  else if (isWindows) platformName = 'Windows';
  else if (isAndroid) platformName = 'Android';
  else if (isLinux) platformName = 'Linux';

  return {
    isMacOS,
    isIOS,
    isWindows,
    isLinux,
    isAndroid,
    platformName,
  };
}

/**
 * Detect media capabilities for video playback
 */
export function detectMediaCapabilities(): MediaCapabilities {
  if (typeof window === 'undefined') {
    return {
      supportsNativeHLS: false,
      supportsWebkitPiP: false,
      supportsStandardPiP: false,
      supportsAirPlay: false,
      preferNativeHLS: false,
    };
  }

  const browser = detectBrowser();
  const platform = detectPlatform();

  // Create a test video element
  const video = document.createElement('video');

  // Native HLS support (Safari, iOS)
  const supportsNativeHLS = video.canPlayType('application/vnd.apple.mpegurl') !== '';

  // Webkit Picture-in-Picture (Safari)
  const supportsWebkitPiP = typeof (video as any).webkitSetPresentationMode === 'function';

  // Standard Picture-in-Picture API
  const supportsStandardPiP = 'pictureInPictureEnabled' in document;

  // AirPlay support (Safari on Apple devices)
  const supportsAirPlay = typeof (video as any).webkitShowPlaybackTargetPicker === 'function';

  // Prefer native HLS on Safari (macOS & iOS) for better performance
  const preferNativeHLS = browser.isSafari && (platform.isMacOS || platform.isIOS) && supportsNativeHLS;

  return {
    supportsNativeHLS,
    supportsWebkitPiP,
    supportsStandardPiP,
    supportsAirPlay,
    preferNativeHLS,
  };
}

/**
 * Get comprehensive browser and platform info
 */
export function getEnvironmentInfo() {
  return {
    browser: detectBrowser(),
    platform: detectPlatform(),
    media: detectMediaCapabilities(),
  };
}

/**
 * Polyfill for missing browser features
 */
export function initBrowserPolyfills(): void {
  // Storage Access API polyfill for unsupported browsers
  if (!('requestStorageAccess' in document)) {
    (document as any).requestStorageAccess = async () => {
      console.warn('Storage Access API not supported - using fallback');
      return Promise.resolve();
    };

    (document as any).hasStorageAccess = async () => {
      return Promise.resolve(true); // Assume access in unsupported browsers
    };
  }

  // Backdrop filter fallback
  if (typeof CSS !== 'undefined' && !CSS.supports('backdrop-filter', 'blur(1px)')) {
    document.documentElement.classList.add('no-backdrop-filter');
  }
}