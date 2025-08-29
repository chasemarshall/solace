// Enhanced patterns for 2024-2025 Twitch ad infrastructure
const AD_PATTERNS = [
  // Traditional ad servers
  /.*ads\.twitch\.tv.*/,
  /.*twitchads\.com.*/,
  /.*doubleclick\.net.*/,
  /.*googlesyndication\.com.*/,
  /.*amazon-adsystem\.com.*/,
  /.*pubads\.g\.doubleclick\.net.*/,
  
  // SSAI and video delivery
  /.*video-weaver\..*\.hls\.ttvnw\.net.*ad.*/,
  /.*video-edge-.*\.amazonaws\.com.*commercial.*/,
  /.*cloudfront\.net.*stitched-ad.*/,
  
  // Analytics and tracking
  /.*analytics\.twitch\.tv.*/,
  /.*spade\.twitch\.tv.*/,
  /.*countess\.twitch\.tv.*/,
  
  // GraphQL ad-related endpoints
  /.*gql\.twitch\.tv.*VideoAdUI.*/,
  /.*gql\.twitch\.tv.*PlaybackAdAccessToken.*/,
  /.*gql\.twitch\.tv.*AdSchedule.*/
];

// HLS manifest patterns to intercept
const HLS_PATTERNS = [
  /.*\.m3u8.*/,
  /.*usher\.ttvnw\.net.*/
];

// GraphQL operation patterns to filter
const GQL_AD_OPERATIONS = [
  'VideoAdUI',
  'PlaybackAdAccessToken',
  'AdSchedule',
  'VideoPreviewCard',
  'AdManager',
  'CommercialBreak',
  'VideoPlayerStreamInfoOverlayChannel',
  'AdBreakActivity',
  'VideoAdBlock'
];

let blockedCount = 0;
let hlsInterceptCount = 0;

function shouldInterceptTwitchRequest(url) {
  // Only intercept specific Twitch API calls, not static assets
  return url.includes('/api/') || 
         url.includes('/helix/') ||
         url.includes('/kraken/') ||
         url.includes('/v5/') ||
         url.includes('usher.ttvnw.net') ||
         url.includes('gql.twitch.tv');
}

self.addEventListener('install', event => {
  console.log('🛡️ Dev Ad Blocker Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('🛡️ Dev Ad Blocker Service Worker activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = event.request.url;
  const method = event.request.method;
  
  // Block ad requests
  if (AD_PATTERNS.some(pattern => pattern.test(url))) {
    blockedCount++;
    console.log(`🚫 SW blocked ad request #${blockedCount}:`, url.substring(0, 100));
    event.respondWith(new Response('', { status: 204 }));
    return;
  }
  
  // Intercept HLS manifests for ad marker removal
  if (HLS_PATTERNS.some(pattern => pattern.test(url))) {
    hlsInterceptCount++;
    console.log(`🎬 SW intercepting HLS #${hlsInterceptCount}:`, url.substring(0, 100));
    event.respondWith(handleHLSRequest(event.request));
    return;
  }
  
  // Intercept GraphQL requests for ad query filtering
  if (url.includes('gql.twitch.tv') && method === 'POST') {
    console.log('🔍 SW intercepting GraphQL request');
    event.respondWith(handleGraphQLRequest(event.request));
    return;
  }
  
  // Allow other requests with proxy routing for specific Twitch requests only
  if ((url.includes('twitch.tv') || url.includes('ttvnw.net')) && shouldInterceptTwitchRequest(url)) {
    event.respondWith(handleTwitchRequest(event.request));
    return;
  }
  
  // Let browser handle all other requests normally (no interception)
});

async function handleHLSRequest(request) {
  try {
    // Route through our dev proxy for HLS processing
    const proxyUrl = `/api/dev-proxy?type=hls&url=${encodeURIComponent(request.url)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`HLS proxy failed: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    console.error('SW HLS error:', error);
    // Fallback to direct request
    return fetch(request);
  }
}

async function handleGraphQLRequest(request) {
  try {
    const requestBody = await request.clone().text();
    let gqlData;
    
    try {
      gqlData = JSON.parse(requestBody);
    } catch {
      // If not valid JSON, pass through
      return fetch(request);
    }
    
    // Filter out ad operations
    const filteredOperations = Array.isArray(gqlData) 
      ? gqlData.filter(op => {
          const operationName = op.operationName || '';
          const isAdOperation = GQL_AD_OPERATIONS.some(pattern => 
            operationName.includes(pattern)
          );
          
          if (isAdOperation) {
            console.log('🚫 SW blocked GraphQL ad operation:', operationName);
            return false;
          }
          
          return true;
        })
      : [gqlData].filter(op => {
          const operationName = op.operationName || '';
          const isAdOperation = GQL_AD_OPERATIONS.some(pattern => 
            operationName.includes(pattern)
          );
          
          if (isAdOperation) {
            console.log('🚫 SW blocked GraphQL ad operation:', operationName);
            return false;
          }
          
          return true;
        });
    
    if (filteredOperations.length === 0) {
      return new Response('[]', { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Create new request with filtered operations
    const newRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(Array.isArray(gqlData) ? filteredOperations : filteredOperations[0])
    });
    
    return fetch(newRequest);
  } catch (error) {
    console.error('SW GraphQL error:', error);
    return fetch(request);
  }
}

async function handleTwitchRequest(request) {
  try {
    // Add anti-detection headers
    const headers = new Headers(request.headers);
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    headers.set('Accept-Language', 'en-US,en;q=0.9');
    headers.set('Sec-Ch-Ua', '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"');
    headers.set('Sec-Ch-Ua-Mobile', '?0');
    headers.set('Sec-Ch-Ua-Platform', '"Windows"');
    
    const newRequest = new Request(request.url, {
      method: request.method,
      headers: headers,
      body: request.body,
      mode: 'cors',
      credentials: 'include'
    });
    
    return fetch(newRequest);
  } catch (error) {
    console.error('SW Twitch request error:', error);
    return fetch(request);
  }
}

// Periodic stats reporting
setInterval(() => {
  if (blockedCount > 0 || hlsInterceptCount > 0) {
    console.log(`📊 SW Stats - Blocked: ${blockedCount}, HLS Intercepted: ${hlsInterceptCount}`);
  }
}, 30000); // Every 30 seconds