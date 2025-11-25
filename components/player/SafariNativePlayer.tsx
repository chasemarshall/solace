'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { findWorkingProxy, type ProxyEndpoint } from '@/lib/twitch/proxyFailover';
import { detectMediaCapabilities } from '@/lib/utils/browserCompat';
import { STORAGE_KEYS } from '@/lib/constants/storage';
import { useStorageListener } from '@/hooks/useStorageListener';
import { PlayerError, PlayerLoading, PlayerBadge, PlayerContainer } from '@/components/player/PlayerUI';

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
  const [currentProxy, setCurrentProxy] = useState<ProxyEndpoint | null>(null);
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const [isAirPlaySupported, setIsAirPlaySupported] = useState(false);
  const [preferredProxy, setPreferredProxy] = useState<string>('auto');

  // Load proxy preference
  useEffect(() => {
    const savedProxy = localStorage.getItem(STORAGE_KEYS.PROXY_SELECTION);
    if (savedProxy) {
      setPreferredProxy(savedProxy);
    }
  }, []);

  // Listen for changes to proxy selection using custom hook
  useStorageListener(
    STORAGE_KEYS.PROXY_SELECTION,
    useCallback((newValue) => {
      if (newValue) {
        setPreferredProxy(newValue);
      }
    }, [])
  );

  // Detect Safari-specific capabilities
  useEffect(() => {
    if (!videoRef.current) return;

    const capabilities = detectMediaCapabilities();
    setIsPiPSupported(capabilities.supportsWebkitPiP);
    setIsAirPlaySupported(capabilities.supportsAirPlay);

    if (process.env.NODE_ENV === 'development') {
      console.log('[SafariNativePlayer] Capabilities:', {
        webkitPiP: capabilities.supportsWebkitPiP,
        airPlay: capabilities.supportsAirPlay,
        nativeHLS: capabilities.supportsNativeHLS,
      });
    }
  }, []);

  // Initialize native HLS player
  useEffect(() => {
    if (!videoRef.current || !channel) return;

    let isMounted = true;
    let videoElement: SafariVideoElement | null = null;

    const handleCanPlay = () => {
      if (isMounted) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[SafariNativePlayer] Stream ready for playback');
        }
        setIsLoading(false);
      }
    };

    const handleError = (e: Event) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[SafariNativePlayer] Playback error:', e);
      }
      if (isMounted) {
        setLoadError('Playback failed');
        onError?.();
      }
    };

    const initializePlayer = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        if (process.env.NODE_ENV === 'development') {
          console.log('[SafariNativePlayer] Initializing for channel:', channel);
        }

        // Find working proxy
        const result = await findWorkingProxy(channel, 3, preferredProxy);

        if (!isMounted) return;

        if (!result.success || !result.streamUrl) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[SafariNativePlayer] All proxies failed');
          }
          setLoadError('All proxy servers unavailable');
          onError?.();
          return;
        }

        setCurrentProxy(result.proxy || null);
        if (process.env.NODE_ENV === 'development') {
          console.log(`[SafariNativePlayer] Using ${result.proxy!.name} with native HLS`);
        }

        // Use native HLS playback - Safari handles this internally via AVPlayer
        if (videoRef.current && isMounted) {
          videoElement = videoRef.current;
          videoElement.src = result.streamUrl;

          videoElement.addEventListener('canplay', handleCanPlay);
          videoElement.addEventListener('error', handleError);

          // Attempt to play (may be blocked by autoplay policy)
          videoElement.play().catch((err) => {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[SafariNativePlayer] Autoplay prevented:', err);
            }
            // This is expected and user can click play
            // Set loading to false so user knows they can interact
            if (isMounted) {
              setIsLoading(false);
            }
          });
        }
      } catch (error) {
        if (!isMounted) return;
        if (process.env.NODE_ENV === 'development') {
          console.error('[SafariNativePlayer] Initialization error:', error);
        }
        setLoadError(error instanceof Error ? error.message : 'Failed to initialize player');
        onError?.();
      }
    };

    initializePlayer();

    return () => {
      isMounted = false;
      if (videoElement) {
        videoElement.removeEventListener('canplay', handleCanPlay);
        videoElement.removeEventListener('error', handleError);
        // Clean up video resources
        videoElement.pause();
        videoElement.removeAttribute('src');
        videoElement.load();
      }
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
    return <PlayerError error={loadError} channel={channel} />;
  }

  return (
    <PlayerContainer>
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
        <PlayerLoading
          currentProxy={currentProxy}
          failoverAttempts={0}
          playerType="native"
        />
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

      <PlayerBadge currentProxy={currentProxy} badgeType="native" />

      {/* Quality info badge - Native player uses auto quality */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-black/80 text-white text-xs px-3 py-2 rounded-lg backdrop-blur-sm">
          Auto Quality (Safari Optimized)
        </div>
      </div>
    </PlayerContainer>
  );
}
