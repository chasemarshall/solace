"use client";

import { useState, useCallback, useEffect } from "react";
import TtvLolPlayer from "@/components/player/TtvLolPlayer";
import SafariNativePlayer from "@/components/player/SafariNativePlayer";
import { usePlatform } from "@/hooks/usePlatform";
import { STORAGE_KEYS } from "@/lib/constants/storage";

interface EnhancedWatchPlayerProps {
  channel: string;
  parent: string;
}

export default function EnhancedWatchPlayer({ channel, parent }: EnhancedWatchPlayerProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [useIframePlayer, setUseIframePlayer] = useState(false);
  const [useSafariNative, setUseSafariNative] = useState(false);

  // Use the platform detection hook (runs once on mount)
  const envInfo = usePlatform();

  const handleFallback = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("EnhancedWatchPlayer: Switching to fallback player");
    }
    setUseFallback(true);
  }, []);

  // Helper to compute which player to use
  const computePlayerType = useCallback((proxySelection: string | null, useNativePlayer: boolean) => {
    const shouldUseIframe = proxySelection === 'iframe';

    if (shouldUseIframe) {
      return { useIframe: true, useSafariNative: false };
    }

    if (!useNativePlayer) {
      return { useIframe: false, useSafariNative: false };
    }

    // Use native player for Safari on macOS or iOS (better performance)
    const shouldUseSafariNativePlayer = envInfo.media.preferNativeHLS &&
                                        (envInfo.platform.isMacOS || envInfo.platform.isIOS) &&
                                        envInfo.browser.isSafari;

    return { useIframe: false, useSafariNative: shouldUseSafariNativePlayer };
  }, [envInfo]);

  // Determine which player to use based on browser, platform, and user preferences
  useEffect(() => {
    const proxySelection = localStorage.getItem(STORAGE_KEYS.PROXY_SELECTION);

    // Migration: Check for old DISABLE_NATIVE_PLAYER key and migrate to USE_NATIVE_PLAYER
    const legacyDisableKey = localStorage.getItem(STORAGE_KEYS.DISABLE_NATIVE_PLAYER);
    const newUseKey = localStorage.getItem(STORAGE_KEYS.USE_NATIVE_PLAYER);

    let useNativePlayer = true; // Default to true

    if (newUseKey !== null) {
      // New key exists, use it
      useNativePlayer = newUseKey === 'true';
    } else if (legacyDisableKey !== null) {
      // Migrate from old key (inverted logic)
      useNativePlayer = legacyDisableKey !== 'true';
      // Save to new key and remove old key
      localStorage.setItem(STORAGE_KEYS.USE_NATIVE_PLAYER, useNativePlayer.toString());
      localStorage.removeItem(STORAGE_KEYS.DISABLE_NATIVE_PLAYER);
    }

    const playerType = computePlayerType(proxySelection, useNativePlayer);

    if (process.env.NODE_ENV === 'development') {
      console.log('[EnhancedWatchPlayer] Player selection:', {
        browser: envInfo.browser.isSafari ? 'Safari' : 'Other',
        platform: envInfo.platform.platformName,
        preferNativeHLS: envInfo.media.preferNativeHLS,
        useSafariNative: playerType.useSafariNative,
        useIframe: playerType.useIframe,
        useNativePlayer,
        proxySelection,
      });
    }

    setUseIframePlayer(playerType.useIframe);
    setUseSafariNative(playerType.useSafariNative);

    // Listen for changes to proxy selection
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.PROXY_SELECTION || e.key === STORAGE_KEYS.USE_NATIVE_PLAYER) {
        const newProxySelection = localStorage.getItem(STORAGE_KEYS.PROXY_SELECTION);
        const newUseNative = localStorage.getItem(STORAGE_KEYS.USE_NATIVE_PLAYER) === 'true';

        const newPlayerType = computePlayerType(newProxySelection, newUseNative);

        // Batch state updates to prevent multiple re-renders
        setUseIframePlayer(newPlayerType.useIframe);
        setUseSafariNative(newPlayerType.useSafariNative);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [envInfo, computePlayerType]);

  // Show iframe player if user selected it OR if proxy player failed
  if (useFallback || useIframePlayer) {
    const parentDomain = parent || 'localhost';
    const iframeSrc = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(parentDomain)}&muted=false&autoplay=true&theme=dark&controls=true&quality=1080p60`;

    return (
      <div className="relative w-full aspect-video bg-black overflow-hidden shadow-2xl rounded-xl">
        <iframe
          src={iframeSrc}
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          sandbox="allow-same-origin allow-scripts allow-forms allow-pointer-lock allow-popups allow-storage-access-by-user-activation"
          style={{ visibility: 'visible' }}
          referrerPolicy="strict-origin-when-cross-origin"
          scrolling="no"
          frameBorder="0"
        />
      </div>
    );
  }

  // Safari Native Player - Optimized for macOS/iOS
  if (useSafariNative) {
    return (
      <div className="relative w-full">
        <SafariNativePlayer
          channel={channel}
          onError={handleFallback}
          capabilities={envInfo.media}
        />
      </div>
    );
  }

  // Default: TTV LOL PRO Player - Ad-Free Twitch Streams
  return (
    <div className="relative w-full">
      {/* TTV LOL PRO Player - Ad-Free Twitch Streams */}
      <TtvLolPlayer channel={channel} onError={handleFallback} />
    </div>
  );
}