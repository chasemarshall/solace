import { useEffect, useRef, useState, useCallback } from 'react';
import { isAdRequest, isTwitchRequest } from '@/lib/constants/adPatterns';

interface AdBlockerStats {
  blockedRequests: number;
  savedBandwidth: number;
  loadTimeImprovement: number;
  hlsInterceptions: number;
  gqlBlocks: number;
}

interface AdBlockerHook {
  stats: AdBlockerStats;
  isActive: boolean;
  errors: string[];
}

// Track if service worker has been registered to prevent duplicate registrations
let swRegistered = false;

export function useAdBlocker(enabled: boolean = false): AdBlockerHook {
  const [stats, setStats] = useState<AdBlockerStats>({
    blockedRequests: 0,
    savedBandwidth: 0,
    loadTimeImprovement: 0,
    hlsInterceptions: 0,
    gqlBlocks: 0
  });
  const [isActive, setIsActive] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const originalFetchRef = useRef<typeof window.fetch>();
  const swRegistrationRef = useRef<ServiceWorkerRegistration>();

  const addError = useCallback((error: string) => {
    setErrors(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${error}`]);
  }, []);

  const updateStats = useCallback((type: keyof AdBlockerStats, increment = 1) => {
    setStats(prev => ({
      ...prev,
      [type]: prev[type] + increment
    }));
  }, []);

  useEffect(() => {
    if (!enabled) {
      // Cleanup when disabled
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
      }
      setIsActive(false);
      return;
    }

    // Register service worker only once per app lifecycle
    if ('serviceWorker' in navigator && !swRegistered) {
      swRegistered = true;
      navigator.serviceWorker.register('/sw-adblock-dev.js', {
        scope: '/'
      })
        .then((registration) => {
          console.log('🛡️ Dev Ad Blocker Service Worker registered');
          swRegistrationRef.current = registration;
          setIsActive(true);

          // Listen for messages from SW
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'AD_BLOCKED') {
              updateStats('blockedRequests');
              updateStats('savedBandwidth', event.data.size || 1024);
            } else if (event.data.type === 'HLS_INTERCEPTED') {
              updateStats('hlsInterceptions');
            } else if (event.data.type === 'GQL_BLOCKED') {
              updateStats('gqlBlocks');
            }
          });
        })
        .catch(err => {
          console.error('SW registration failed:', err);
          addError(`Service Worker registration failed: ${err.message}`);
          swRegistered = false; // Allow retry on error
        });
    } else if (swRegistrationRef.current) {
      // Service worker already registered
      setIsActive(true);
    }

    // Enhanced fetch interception
    if (!originalFetchRef.current) {
      originalFetchRef.current = window.fetch;
    }

    window.fetch = async (...args) => {
      const [resource, options] = args;
      const url = typeof resource === 'string' ? resource : 
                  resource instanceof Request ? resource.url :
                  resource instanceof URL ? resource.toString() : 
                  String(resource);
      const startTime = performance.now();
      
      // Check for ad patterns
      if (isAdRequest(url)) {
        console.log('🚫 Fetch blocked:', url.substring(0, 100));
        updateStats('blockedRequests');
        updateStats('savedBandwidth', 2048); // Estimated ad size
        return new Response('', { status: 204 });
      }
      
      // Route only specific Twitch requests through dev proxy to avoid breaking embed
      if (isTwitchRequest(url) && enabled && shouldProxy(url)) {
        try {
          const proxyType = getProxyType(url);
          const proxyUrl = `/api/dev-proxy?type=${proxyType}&url=${encodeURIComponent(url)}`;
          
          const response = await originalFetchRef.current!(proxyUrl, options);
          const endTime = performance.now();
          updateStats('loadTimeImprovement', endTime - startTime);
          
          return response;
        } catch (error) {
          addError(`Proxy error: ${error}`);
          // Fallback to original request
        }
      }
      
      return originalFetchRef.current!.apply(window, args);
    };

    // Cleanup function
    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
      }
      setIsActive(false);
    };
  }, [enabled, updateStats, addError]);

  return { stats, isActive, errors };
}

function shouldProxy(url: string): boolean {
  // Only proxy specific requests that we know are safe to intercept
  return url.includes('.m3u8') || 
         url.includes('usher.ttvnw.net') ||
         url.includes('gql.twitch.tv') ||
         url.includes('ads.twitch.tv') ||
         url.includes('twitchads.com');
}

function getProxyType(url: string): string {
  if (url.includes('.m3u8') || url.includes('usher.ttvnw.net')) {
    return 'hls';
  } else if (url.includes('gql.twitch.tv')) {
    return 'graphql';
  } else {
    return 'general';
  }
}