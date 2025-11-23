'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useImmersive } from '@/contexts/ImmersiveContext';
import { findWorkingProxy, ProxyHealthMonitor } from '@/lib/twitch/proxyFailover';
import type { ProxyEndpoint } from '@/lib/twitch/proxyConfig';

interface TtvLolPlayerProps {
  channel: string;
  onError?: () => void;
}

export default function TtvLolPlayer({ channel, onError }: TtvLolPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const healthMonitorRef = useRef<ProxyHealthMonitor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [qualityLevels, setQualityLevels] = useState<Array<{ level: number; height: number; bitrate: number }>>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [currentProxy, setCurrentProxy] = useState<ProxyEndpoint | null>(null);
  const [failoverAttempts, setFailoverAttempts] = useState(0);
  const [preferredProxy, setPreferredProxy] = useState<string>('auto');
  const { isImmersiveMode } = useImmersive();

  // Load proxy preference from localStorage
  useEffect(() => {
    const savedProxy = localStorage.getItem('proxy_selection');
    if (savedProxy) {
      setPreferredProxy(savedProxy);
    }

    // Listen for changes to proxy selection
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'proxy_selection' && e.newValue) {
        setPreferredProxy(e.newValue);
        // Player will automatically reinitialize due to dependency array
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (!videoRef.current || !channel) return;

    let isMounted = true;

    // Initialize health monitor for automatic proxy switching
    if (!healthMonitorRef.current) {
      healthMonitorRef.current = new ProxyHealthMonitor((newProxy) => {
        console.log(`[TtvLolPlayer] Switched to ${newProxy.name}`);
        setCurrentProxy(newProxy);
      });
    }

    const initializePlayer = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        // Find a working proxy using failover system
        console.log('[TtvLolPlayer] Finding working proxy...');
        const result = await findWorkingProxy(channel, 3, preferredProxy);

        if (!isMounted) return;

        if (!result.success || !result.streamUrl) {
          console.error('[TtvLolPlayer] All proxies failed');
          setLoadError('All proxy servers unavailable');
          setFailoverAttempts(result.attempts.length);
          onError?.();
          return;
        }

        // Set the working proxy
        setCurrentProxy(result.proxy!);
        healthMonitorRef.current?.setCurrentProxy(result.proxy!);
        setFailoverAttempts(result.attempts.length);

        console.log(`[TtvLolPlayer] Using ${result.proxy!.name} (${result.proxy!.region})`);

        if (Hls.isSupported()) {
          const hls = new Hls({
            lowLatencyMode: true,
            backBufferLength: 30,
            maxBufferLength: 60,
            enableWorker: true,
            debug: false,
          });

          hlsRef.current = hls;

          // Manifest loaded - extract quality levels
          hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            if (!isMounted) return;
            const levels = data.levels.map((level: any, index: number) => ({
              level: index,
              height: level.height,
              bitrate: level.bitrate,
            }));
            setQualityLevels(levels);
            setIsLoading(false);
            healthMonitorRef.current?.reportSuccess();
          });

          // Track current quality level
          hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
            if (!isMounted) return;
            setCurrentQuality(data.level);
          });

          // Error handling with automatic proxy switching
          hls.on(Hls.Events.ERROR, async (event, data) => {
            console.error('[TtvLolPlayer] HLS Error:', data);

            if (data.fatal) {
              const shouldSwitch = healthMonitorRef.current?.reportFailure();

              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.warn('[TtvLolPlayer] Network error detected');

                  if (shouldSwitch) {
                    console.log('[TtvLolPlayer] Too many failures, trying alternative proxy...');
                    const alternativeProxy = await healthMonitorRef.current?.findAlternativeProxy(
                      channel,
                      currentProxy ?? undefined
                    );

                    if (alternativeProxy && isMounted) {
                      console.log(`[TtvLolPlayer] Switching to ${alternativeProxy.name}`);
                      const newStreamUrl = `/api/hls?src=${encodeURIComponent(
                        alternativeProxy.getPlaylistUrl(channel)
                      )}`;
                      hls.loadSource(newStreamUrl);
                      setCurrentProxy(alternativeProxy);
                    } else {
                      console.error('[TtvLolPlayer] No alternative proxy available, triggering fallback');
                      onError?.();
                    }
                  } else {
                    console.log('[TtvLolPlayer] Attempting network recovery...');
                    hls.startLoad();
                  }
                  break;

                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.warn('[TtvLolPlayer] Media error, attempting recovery');
                  hls.recoverMediaError();
                  break;

                default:
                  console.warn('[TtvLolPlayer] Fatal error, triggering fallback');
                  onError?.();
                  break;
              }
            }
          });

          // Load and attach
          hls.loadSource(result.streamUrl);
          if (videoRef.current) {
            hls.attachMedia(videoRef.current);
          }

          return () => {
            isMounted = false;
            hls.destroy();
            hlsRef.current = null;
          };
        } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (Safari)
          videoRef.current.src = result.streamUrl;
          setIsLoading(false);
          healthMonitorRef.current?.reportSuccess();
        } else {
          setLoadError('HLS not supported in this browser');
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('[TtvLolPlayer] Initialization error:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to initialize player');
        onError?.();
      }
    };

    initializePlayer();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, preferredProxy]);

  const handleQualityChange = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setCurrentQuality(level);
    }
  };

  if (loadError) {
    return (
      <div className={`relative w-full aspect-video bg-black flex items-center justify-center ${isImmersiveMode ? '' : 'rounded-xl'} overflow-hidden shadow-2xl`}>
        <div className="text-center text-white p-8">
          <div className="text-red-400 text-xl mb-3">⚠ stream error</div>
          <div className="text-sm opacity-75 mb-4">{loadError}</div>
          <div className="text-xs opacity-50">
            channel: {channel}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full aspect-video bg-black ${isImmersiveMode ? '' : 'rounded-xl'} overflow-hidden shadow-2xl group`}>
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        autoPlay
        muted={false}
        playsInline
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <div className="text-lg font-semibold">loading stream</div>
            <div className="text-sm opacity-75 mt-2">
              {currentProxy ? `${currentProxy.name.toLowerCase()} (${currentProxy.region.toLowerCase()})` : 'finding best proxy...'} • ad-free
            </div>
            {failoverAttempts > 1 && (
              <div className="text-xs opacity-50 mt-1">
                tried {failoverAttempts} {failoverAttempts === 1 ? 'proxy' : 'proxies'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quality selector - shown on hover */}
      {qualityLevels.length > 0 && !isLoading && (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <select
            value={currentQuality}
            onChange={(e) => handleQualityChange(Number(e.target.value))}
            className="bg-black/80 text-white text-sm px-3 py-2 rounded-lg border border-white/20 hover:border-white/40 backdrop-blur-sm cursor-pointer"
          >
            <option value={-1}>Auto</option>
            {qualityLevels.map((level) => (
              <option key={level.level} value={level.level}>
                {level.height}p {currentQuality === level.level ? '✓' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ad-free badge with proxy info */}
      <div className="absolute top-4 left-4 bg-green-600/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg">
        <div className="flex items-center gap-2">
          <span>ad-free</span>
          {currentProxy && (
            <span className="opacity-75">• {currentProxy.name.toLowerCase()}</span>
          )}
        </div>
      </div>
    </div>
  );
}
