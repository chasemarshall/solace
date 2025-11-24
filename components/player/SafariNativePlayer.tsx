'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useImmersive } from '@/contexts/ImmersiveContext';
import { findWorkingProxy } from '@/lib/twitch/proxyFailover';
import { detectMediaCapabilities } from '@/lib/utils/browserCompat';

interface SafariNativePlayerProps {
  channel: string;
  onError?: () => void;
}

// Extend HTMLVideoElement for Safari-specific APIs
interface SafariVideoElement extends HTMLVideoElement {
  webkitSetPresentationMode?: (mode: 'inline' | 'picture-in-picture' | 'fullscreen') => void;
  webkitPresentationMode?: string;
  webkitSupportsPresentationMode?: (mode: string) => boolean;
  webkitShowPlaybackTargetPicker?: () => void;
}

export default function SafariNativePlayer({ channel, onError }: SafariNativePlayerProps) {
  const videoRef = useRef<SafariVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentProxy, setCurrentProxy] = useState<any>(null);
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const [isAirPlaySupported, setIsAirPlaySupported] = useState(false);
  const [preferredProxy, setPreferredProxy] = useState<string>('auto');
  const { isImmersiveMode } = useImmersive();

  // Load proxy preference
  useEffect(() => {
    const savedProxy = localStorage.getItem('proxy_selection');
    if (savedProxy) {
      setPreferredProxy(savedProxy);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'proxy_selection' && e.newValue) {
        setPreferredProxy(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Detect Safari-specific capabilities
  useEffect(() => {
    if (!videoRef.current) return;

    const capabilities = detectMediaCapabilities();
    setIsPiPSupported(capabilities.supportsWebkitPiP);
    setIsAirPlaySupported(capabilities.supportsAirPlay);

    console.log('[SafariNativePlayer] Capabilities:', {
      webkitPiP: capabilities.supportsWebkitPiP,
      airPlay: capabilities.supportsAirPlay,
      nativeHLS: capabilities.supportsNativeHLS,
    });
  }, []);

  // Initialize native HLS player
  useEffect(() => {
    if (!videoRef.current || !channel) return;

    let isMounted = true;

    const initializePlayer = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        console.log('[SafariNativePlayer] Initializing for channel:', channel);

        // Find working proxy
        const result = await findWorkingProxy(channel, 3, preferredProxy);

        if (!isMounted) return;

        if (!result.success || !result.streamUrl) {
          console.error('[SafariNativePlayer] All proxies failed');
          setLoadError('All proxy servers unavailable');
          onError?.();
          return;
        }

        setCurrentProxy(result.proxy);
        console.log(`[SafariNativePlayer] Using ${result.proxy!.name} with native HLS`);

        // Use native HLS playback - Safari handles this internally via AVPlayer
        if (videoRef.current) {
          videoRef.current.src = result.streamUrl;

          // Safari native player doesn't expose manifest loaded event
          // We'll rely on canplay event instead
          const handleCanPlay = () => {
            if (isMounted) {
              console.log('[SafariNativePlayer] Stream ready for playback');
              setIsLoading(false);
            }
          };

          const handleError = (e: Event) => {
            console.error('[SafariNativePlayer] Playback error:', e);
            if (isMounted) {
              setLoadError('Playback failed');
              onError?.();
            }
          };

          videoRef.current.addEventListener('canplay', handleCanPlay);
          videoRef.current.addEventListener('error', handleError);

          // Attempt to play (may be blocked by autoplay policy)
          videoRef.current.play().catch((err) => {
            console.warn('[SafariNativePlayer] Autoplay prevented:', err);
            // This is expected and user can click play
          });

          return () => {
            if (videoRef.current) {
              videoRef.current.removeEventListener('canplay', handleCanPlay);
              videoRef.current.removeEventListener('error', handleError);
            }
          };
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('[SafariNativePlayer] Initialization error:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to initialize player');
        onError?.();
      }
    };

    initializePlayer();

    return () => {
      isMounted = false;
    };
  }, [channel, preferredProxy, onError]);

  // Handle Picture-in-Picture toggle
  const handlePictureInPicture = useCallback(() => {
    if (!videoRef.current || !isPiPSupported) return;

    const video = videoRef.current;
    const currentMode = video.webkitPresentationMode || 'inline';

    if (currentMode === 'picture-in-picture') {
      video.webkitSetPresentationMode?.('inline');
    } else {
      video.webkitSetPresentationMode?.('picture-in-picture');
    }
  }, [isPiPSupported]);

  // Handle AirPlay
  const handleAirPlay = useCallback(() => {
    if (!videoRef.current || !isAirPlaySupported) return;
    videoRef.current.webkitShowPlaybackTargetPicker?.();
  }, [isAirPlaySupported]);

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
        x-webkit-airplay="allow"
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <div className="text-lg font-semibold">loading stream</div>
            <div className="text-sm opacity-75 mt-2">
              {currentProxy ? `${currentProxy.name.toLowerCase()} (${currentProxy.region.toLowerCase()})` : 'finding best proxy...'} • native player
            </div>
            <div className="text-xs opacity-50 mt-1">
              optimized for safari
            </div>
          </div>
        </div>
      )}

      {/* Safari-specific controls overlay */}
      {!isLoading && (isPiPSupported || isAirPlaySupported) && (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          {isPiPSupported && (
            <button
              onClick={handlePictureInPicture}
              className="bg-black/80 text-white text-sm px-3 py-2 rounded-lg border border-white/20 hover:border-white/40 backdrop-blur-sm cursor-pointer"
              title="Picture in Picture"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/>
              </svg>
            </button>
          )}
          {isAirPlaySupported && (
            <button
              onClick={handleAirPlay}
              className="bg-black/80 text-white text-sm px-3 py-2 rounded-lg border border-white/20 hover:border-white/40 backdrop-blur-sm cursor-pointer"
              title="AirPlay"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 22h12l-6-6zM21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v-2H3V5h18v12h-4v2h4c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Native player badge */}
      <div className="absolute top-4 left-4 bg-blue-600/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg">
        <div className="flex items-center gap-2">
          <span>native player</span>
          {currentProxy && (
            <span className="opacity-75">• {currentProxy.name.toLowerCase()}</span>
          )}
        </div>
      </div>

      {/* Quality info badge - Native player uses auto quality */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-black/80 text-white text-xs px-3 py-2 rounded-lg backdrop-blur-sm">
          Auto Quality (Safari Optimized)
        </div>
      </div>
    </div>
  );
}
