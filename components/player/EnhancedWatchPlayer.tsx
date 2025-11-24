"use client";

import { useState, useCallback, useEffect } from "react";
import TtvLolPlayer from "@/components/player/TtvLolPlayer";
import SafariNativePlayer from "@/components/player/SafariNativePlayer";
import { detectBrowser, detectPlatform, detectMediaCapabilities } from "@/lib/utils/browserCompat";

interface EnhancedWatchPlayerProps {
  channel: string;
  parent: string;
}

export default function EnhancedWatchPlayer({ channel, parent }: EnhancedWatchPlayerProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [useIframePlayer, setUseIframePlayer] = useState(false);
  const [useSafariNative, setUseSafariNative] = useState(false);

  const handleFallback = useCallback(() => {
    console.log("EnhancedWatchPlayer: Switching to fallback player");
    setUseFallback(true);
  }, []);

  // Determine which player to use based on browser, platform, and user preferences
  useEffect(() => {
    const proxySelection = localStorage.getItem('proxy_selection');
    const disableNativePlayer = localStorage.getItem('disable_native_player') === 'true';

    // Default to iframe if 'iframe' is explicitly selected
    const shouldUseIframe = proxySelection === 'iframe';
    setUseIframePlayer(shouldUseIframe);

    // Detect if we should use Safari native player
    if (!shouldUseIframe && !disableNativePlayer) {
      const browser = detectBrowser();
      const platform = detectPlatform();
      const media = detectMediaCapabilities();

      // Use native player for Safari on macOS or iOS (better performance)
      const shouldUseSafariNativePlayer = media.preferNativeHLS &&
                                          (platform.isMacOS || platform.isIOS) &&
                                          browser.isSafari;

      console.log('[EnhancedWatchPlayer] Player selection:', {
        browser: browser.isSafari ? 'Safari' : 'Other',
        platform: platform.platformName,
        preferNativeHLS: media.preferNativeHLS,
        useSafariNative: shouldUseSafariNativePlayer,
        proxySelection,
      });

      setUseSafariNative(shouldUseSafariNativePlayer);
    } else {
      setUseSafariNative(false);
    }

    // Listen for changes to proxy selection
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'proxy_selection') {
        const newValue = e.newValue;
        setUseIframePlayer(newValue === 'iframe');

        // Re-evaluate Safari native player
        if (newValue !== 'iframe') {
          const browser = detectBrowser();
          const platform = detectPlatform();
          const media = detectMediaCapabilities();
          const disableNative = localStorage.getItem('disable_native_player') === 'true';

          setUseSafariNative(
            !disableNative &&
            media.preferNativeHLS &&
            (platform.isMacOS || platform.isIOS) &&
            browser.isSafari
          );
        } else {
          setUseSafariNative(false);
        }
      } else if (e.key === 'disable_native_player') {
        const disabled = e.newValue === 'true';
        if (disabled) {
          setUseSafariNative(false);
        } else {
          // Re-check if we should use native player
          const browser = detectBrowser();
          const platform = detectPlatform();
          const media = detectMediaCapabilities();
          const proxyPref = localStorage.getItem('proxy_selection');

          setUseSafariNative(
            proxyPref !== 'iframe' &&
            media.preferNativeHLS &&
            (platform.isMacOS || platform.isIOS) &&
            browser.isSafari
          );
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
        <SafariNativePlayer channel={channel} onError={handleFallback} />
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