/**
 * Proxy Failover System
 *
 * Implements automatic failover between multiple ad-free proxy endpoints.
 * Tries proxies in priority order until one successfully provides a stream.
 */

import {
  PROXY_ENDPOINTS,
  FAILOVER_CONFIG,
  type ProxyEndpoint,
} from './proxyConfig';

// Re-export ProxyEndpoint type for consumers
export type { ProxyEndpoint };

export interface ProxyTestResult {
  proxy: ProxyEndpoint;
  success: boolean;
  error?: string;
  responseTime?: number;
}

export interface FailoverResult {
  success: boolean;
  proxy?: ProxyEndpoint;
  playlistUrl?: string;
  streamUrl?: string;
  attempts: ProxyTestResult[];
  error?: string;
}

/**
 * Tests if a proxy can successfully provide a playlist for the given channel
 */
async function testProxy(
  proxy: ProxyEndpoint,
  channel: string,
  timeout: number = FAILOVER_CONFIG.timeout
): Promise<ProxyTestResult> {
  const startTime = Date.now();

  try {
    const playlistUrl = proxy.getPlaylistUrl(channel);
    const proxyStreamUrl = `/api/hls?src=${encodeURIComponent(playlistUrl)}`;

    // Test if the proxy can provide a valid playlist
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(proxyStreamUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        proxy,
        success: true,
        responseTime,
      };
    } else {
      return {
        proxy,
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        responseTime,
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      proxy,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
    };
  }
}

/**
 * Attempts to find a working proxy for the given channel
 * Tries proxies in priority order with automatic failover
 * @param channel - The Twitch channel name
 * @param maxRetries - Maximum number of proxies to try
 * @param preferredProxyName - Optional proxy name to try first (e.g., "Luminous EU")
 */
export async function findWorkingProxy(
  channel: string,
  maxRetries: number = FAILOVER_CONFIG.maxRetries,
  preferredProxyName?: string
): Promise<FailoverResult> {
  const attempts: ProxyTestResult[] = [];
  let sortedProxies = [...PROXY_ENDPOINTS].sort(
    (a, b) => a.priority - b.priority
  );

  // If a preferred proxy is specified, try it first
  if (preferredProxyName && preferredProxyName !== 'auto') {
    const preferredProxy = PROXY_ENDPOINTS.find(p => p.name === preferredProxyName);
    if (preferredProxy) {
      console.log(`[Proxy Failover] User selected ${preferredProxy.name}, trying first...`);
      // Move preferred proxy to the front
      sortedProxies = [
        preferredProxy,
        ...sortedProxies.filter(p => p.name !== preferredProxyName)
      ];
    }
  }

  // Try up to maxRetries proxies
  const proxiesToTry = sortedProxies.slice(0, maxRetries);

  for (const proxy of proxiesToTry) {
    console.log(`[Proxy Failover] Trying ${proxy.name} (${proxy.region})...`);

    const result = await testProxy(proxy, channel);
    attempts.push(result);

    if (result.success) {
      console.log(
        `[Proxy Failover] ✓ ${proxy.name} succeeded in ${result.responseTime}ms`
      );

      const playlistUrl = proxy.getPlaylistUrl(channel);
      const streamUrl = `/api/hls?src=${encodeURIComponent(playlistUrl)}`;

      return {
        success: true,
        proxy,
        playlistUrl,
        streamUrl,
        attempts,
      };
    } else {
      console.warn(
        `[Proxy Failover] ✗ ${proxy.name} failed: ${result.error}`
      );

      // Wait before trying next proxy
      if (proxiesToTry.indexOf(proxy) < proxiesToTry.length - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, FAILOVER_CONFIG.retryDelay)
        );
      }
    }
  }

  // All proxies failed
  console.error(
    `[Proxy Failover] All ${attempts.length} proxy attempts failed`
  );

  return {
    success: false,
    attempts,
    error: `All proxy attempts failed. Tried ${attempts.length} proxies.`,
  };
}

/**
 * Gets the stream URL using the first available proxy
 * Returns null if all proxies fail
 */
export async function getProxyStreamUrl(
  channel: string
): Promise<string | null> {
  const result = await findWorkingProxy(channel);

  if (result.success && result.streamUrl) {
    return result.streamUrl;
  }

  return null;
}

/**
 * Monitors a proxy connection and automatically switches to fallback if it fails
 */
export class ProxyHealthMonitor {
  private currentProxy: ProxyEndpoint | null = null;
  private failureCount = 0;
  private maxFailures = 3;
  private onProxyChange?: (proxy: ProxyEndpoint) => void;

  constructor(onProxyChange?: (proxy: ProxyEndpoint) => void) {
    this.onProxyChange = onProxyChange;
  }

  setCurrentProxy(proxy: ProxyEndpoint) {
    this.currentProxy = proxy;
    this.failureCount = 0;
  }

  reportFailure() {
    this.failureCount++;
    console.warn(
      `[Proxy Monitor] Failure ${this.failureCount}/${this.maxFailures} for ${this.currentProxy?.name}`
    );

    return this.failureCount >= this.maxFailures;
  }

  reportSuccess() {
    this.failureCount = 0;
  }

  shouldSwitchProxy(): boolean {
    return this.failureCount >= this.maxFailures;
  }

  async findAlternativeProxy(
    channel: string,
    excludeProxy?: ProxyEndpoint
  ): Promise<ProxyEndpoint | null> {
    const sortedProxies = [...PROXY_ENDPOINTS]
      .filter((p) => p !== excludeProxy)
      .sort((a, b) => a.priority - b.priority);

    for (const proxy of sortedProxies) {
      const result = await testProxy(proxy, channel);
      if (result.success) {
        this.setCurrentProxy(proxy);
        this.onProxyChange?.(proxy);
        return proxy;
      }
    }

    return null;
  }
}
