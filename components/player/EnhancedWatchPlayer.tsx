"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useStorageAccess } from "@/components/player/StorageAccessManager";
import { useImmersive } from "@/contexts/ImmersiveContext";
import { createTwitchEmbedReliable } from "@/lib/video/sdk";

interface EnhancedWatchPlayerProps {
  channel: string;
  parent: string;
}

export default function EnhancedWatchPlayer({ channel, parent }: EnhancedWatchPlayerProps) {
  const { consentGiven, accessGranted, requestAccess } = useStorageAccess();
  const { isImmersiveMode } = useImmersive();
  const [showAccessPrompt, setShowAccessPrompt] = useState(false);
  const [attempting, setAttempting] = useState(false);
  const [embed, setEmbed] = useState<any>(null);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [useIframe, setUseIframe] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get iframe source with proper parent domain (fallback)
  const getIframeSrc = useCallback(() => {
    const parentDomain = parent || 'localhost';
    return `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(parentDomain)}&muted=false&autoplay=true&theme=dark&controls=true&quality=source`;
  }, [channel, parent]);

  // Initialize SDK embed
  useEffect(() => {
    if (useIframe || !containerRef.current) return;

    const initializeEmbed = async () => {
      try {
        console.log('🚀 Enhanced Player: Attempting SDK embed');

        const twitchEmbed = await createTwitchEmbedReliable(containerRef.current!, {
          channel: channel.toLowerCase(),
          parent: [parent, 'localhost', '127.0.0.1'],
          width: '100%',
          height: '100%',
          theme: 'dark',
          layout: 'video',
          autoplay: true,
          muted: false,
        });

        setEmbed(twitchEmbed);
        setEmbedError(null);
        console.log('✅ Enhanced Player: SDK embed loaded successfully');

      } catch (error) {
        console.error('❌ Enhanced Player: SDK embed failed, falling back to iframe:', error);
        setUseIframe(true);
        setEmbedError(`SDK failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    // Delay initialization to avoid rapid refreshes
    const timer = setTimeout(initializeEmbed, 500);

    return () => {
      clearTimeout(timer);
      if (embed) {
        try {
          embed.destroy?.();
        } catch (error) {
          console.warn('Enhanced Player: Embed cleanup error:', error);
        }
      }
    };
  }, [channel, parent, useIframe, embed]);

  const handlePlayerClick = async () => {
    // Only show prompt if consent given but access not yet attempted
    if (consentGiven && accessGranted === null && !attempting) {
      setShowAccessPrompt(true);
    }
  };

  const handleEnableAccess = async () => {
    setAttempting(true);
    setShowAccessPrompt(false);

    const success = await requestAccess();

    if (success) {
      // Show success message briefly
      setTimeout(() => {
        setAttempting(false);
      }, 2000);
    } else {
      setAttempting(false);
    }
  };

  const handleDismissPrompt = () => {
    setShowAccessPrompt(false);
  };

  const iframeSrc = getIframeSrc();

  return (
    <div className="relative w-full">
      {/* Player Container */}
      <div className={`relative w-full aspect-video bg-black overflow-hidden shadow-2xl ${isImmersiveMode ? '' : 'rounded-xl'}`}>
        {useIframe ? (
          // Fallback to iframe if SDK fails
          <iframe
            src={iframeSrc}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            sandbox="allow-same-origin allow-scripts allow-forms allow-pointer-lock allow-popups allow-storage-access-by-user-activation"
            style={{ visibility: 'visible' }}
            referrerPolicy="strict-origin-when-cross-origin"
            scrolling="no"
            frameBorder="0"
            onClick={handlePlayerClick}
          />
        ) : (
          // SDK-based embed
          <div
            ref={containerRef}
            className="w-full h-full"
            onClick={handlePlayerClick}
          />
        )}

        {/* Loading indicator for SDK */}
        {!embed && !useIframe && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2"></div>
              <div className="text-sm opacity-75">Loading enhanced player...</div>
            </div>
          </div>
        )}

        {/* Storage Access Prompt Overlay */}
        {showAccessPrompt && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
            <div className="bg-surface/95 backdrop-blur-sm border border-white/10 rounded-xl p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold text-white mb-2">
                Enable Enhanced Twitch Experience?
              </h3>
              <p className="text-sm text-text-muted mb-4">
                This will sync your Twitch login with the player so you can follow, subscribe, and interact without logging in again.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDismissPrompt}
                  className="flex-1 px-4 py-2 text-sm bg-transparent border border-white/20 text-text-muted hover:text-white hover:border-white/40 rounded-lg transition-colors"
                >
                  Not now
                </button>
                <button
                  onClick={handleEnableAccess}
                  className="flex-1 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  Enable
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success/Status Indicators */}
        {attempting && (
          <div className="absolute top-4 right-4 bg-purple-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm">
            Enabling enhanced experience...
          </div>
        )}

        {accessGranted === true && (
          <div className="absolute top-4 right-4 bg-green-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm">
            ✓ Enhanced experience enabled
          </div>
        )}

        {accessGranted === false && (
          <div className="absolute top-4 right-4 bg-orange-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm">
            Enhanced experience unavailable
          </div>
        )}

        {/* SDK Error Indicator */}
        {embedError && (
          <div className="absolute top-4 left-4 bg-orange-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm">
            Using iframe mode
          </div>
        )}
      </div>
    </div>
  );
}