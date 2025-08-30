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