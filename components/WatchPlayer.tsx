"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createTwitchEmbed, isTwitchSDKAvailable, resetTwitchSDK } from "@/lib/twitch/embed";

type PlayerState = 'loading' | 'ready' | 'error' | 'unmuted';
type PlayerMode = 'iframe' | 'js';

interface PlayerError {
  type: 'sdk' | 'embed' | 'cors' | 'network' | 'unknown';
  message: string;
  retryable: boolean;
}

export default function WatchPlayer({ channel, parent }: { channel: string; parent: string }) {
  const [playerMode, setPlayerMode] = useState<PlayerMode>("iframe");
  const [isClient, setIsClient] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>('loading');
  const [error, setError] = useState<PlayerError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isAutoFallback, setIsAutoFallback] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showUnmutePrompt, setShowUnmutePrompt] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const embedRef = useRef<any>(null);
  const maxRetries = 3;
  const unmuteTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
    const savedMode = localStorage.getItem("player-mode") as PlayerMode;
    if (savedMode && (savedMode === "js" || savedMode === "iframe")) {
      setPlayerMode(savedMode);
    } else {
      // Default to iframe mode since Enhanced mode has CORS issues
      setPlayerMode("iframe");
      localStorage.setItem("player-mode", "iframe");
    }
  }, []);

  // Enhanced cleanup function
  const cleanup = useCallback(() => {
    // Clear unmute timeout
    if (unmuteTimeoutRef.current) {
      clearTimeout(unmuteTimeoutRef.current);
    }

    // Cleanup player
    if (playerRef.current) {
      try {
        if (typeof playerRef.current.pause === 'function') {
          playerRef.current.pause();
        }
        playerRef.current = null;
      } catch (e) {
        console.log("Player cleanup error:", e);
      }
    }

    // Cleanup embed
    if (embedRef.current) {
      try {
        if (typeof embedRef.current.destroy === 'function') {
          embedRef.current.destroy();
        }
        embedRef.current = null;
      } catch (e) {
        console.log("Embed cleanup error:", e);
      }
    }

    // Clear container safely
    if (containerRef.current) {
      try {
        // Remove all child nodes safely
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
      } catch (e) {
        console.log("Container cleanup error:", e);
      }
    }
  }, []);

  const togglePlayerMode = useCallback((newMode: PlayerMode) => {
    setPlayerMode(newMode);
    localStorage.setItem("player-mode", newMode);
    setError(null);
    setIsAutoFallback(false);
    cleanup();
  }, [cleanup]);

  // Enhanced error handling
  const handleError = useCallback((error: any, context: string): PlayerError => {
    console.error(`Player error in ${context}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('CORS') || errorMessage.includes('cross-origin')) {
      return {
        type: 'cors',
        message: 'Enhanced mode blocked by browser security policy. Basic mode is recommended.',
        retryable: false
      };
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return {
        type: 'network',
        message: 'Network error. Please check your connection and try again.',
        retryable: true
      };
    }
    
    if (errorMessage.includes('SDK') || errorMessage.includes('embed')) {
      return {
        type: 'sdk',
        message: 'Enhanced player failed to load. Try Basic mode or refresh the page.',
        retryable: true
      };
    }
    
    return {
      type: 'unknown',
      message: 'An unexpected error occurred. Please try again.',
      retryable: true
    };
  }, []);

  // Initialize JS player with enhanced error handling
  const initializeJSPlayer = useCallback(async () => {
    if (!containerRef.current) return;
    
    setPlayerState('loading');
    setError(null);
    setShowUnmutePrompt(false);
    cleanup();

    try {
      // Check if SDK is already available
      if (!isTwitchSDKAvailable()) {
        console.log("Twitch SDK not available, attempting to load...");
      }

      const embed = await createTwitchEmbed(containerRef.current, {
        channel: channel.toLowerCase(),
        parent: parent,
        width: "100%",
        height: "100%",
        autoplay: true,
        muted: true, // Start muted for autoplay compatibility
        layout: "video",
        theme: "dark"
      });

      embedRef.current = embed;
      setRetryCount(0);

      // Enhanced event handling
      const handleVideoReady = () => {
        try {
          const player = embed.getPlayer();
          if (player) {
            playerRef.current = player;
            setPlayerState('ready');
            console.log("Enhanced player initialized successfully");
            
            // Show unmute prompt after a delay
            unmuteTimeoutRef.current = setTimeout(() => {
              setShowUnmutePrompt(true);
            }, 3000);
          }
        } catch (e) {
          console.error("Error setting up player:", e);
          setError(handleError(e, 'video-ready'));
          setPlayerState('error');
        }
      };

      const handleEmbedError = (error: any) => {
        console.error("Embed error:", error);
        const playerError = handleError(error, 'embed');
        setError(playerError);
        setPlayerState('error');
        
        // Auto-fallback for non-retryable errors
        if (!playerError.retryable) {
          setTimeout(() => {
            setIsAutoFallback(true);
            togglePlayerMode('iframe');
          }, 2000);
        }
      };

      // Attach event listeners with error handling
      if (embed && typeof embed.addEventListener === 'function') {
        try {
          embed.addEventListener('VIDEO_READY', handleVideoReady);
          embed.addEventListener('VIDEO_PLAY', () => setPlayerState('ready'));
          embed.addEventListener('VIDEO_END', () => setPlayerState('ready'));
          embed.addEventListener('EMBED_ERROR', handleEmbedError);
        } catch (e) {
          console.warn("Could not attach embed event listeners:", e);
        }
      }

      // Fallback timeout
      setTimeout(() => {
        if (playerState === 'loading') {
          console.log("Player loading timeout reached, assuming success");
          setPlayerState('ready');
        }
      }, 10000);

    } catch (e) {
      const playerError = handleError(e, 'initialization');
      setError(playerError);
      setPlayerState('error');
      
      if (retryCount < maxRetries && playerError.retryable) {
        const nextRetryCount = retryCount + 1;
        setRetryCount(nextRetryCount);
        
        console.log(`Retrying player initialization (${nextRetryCount}/${maxRetries + 1})...`);
        setTimeout(() => {
          initializeJSPlayer();
        }, 2000 * nextRetryCount);
      } else if (!playerError.retryable) {
        // Auto-fallback for non-retryable errors
        setTimeout(() => {
          setIsAutoFallback(true);
          togglePlayerMode('iframe');
        }, 2000);
      }
    }
  }, [channel, parent, cleanup, playerState, togglePlayerMode, retryCount, maxRetries, handleError]);

  // Initialize player based on mode
  useEffect(() => {
    if (!isClient) return;
    
    if (playerMode === 'js') {
      // For Enhanced mode, try to initialize but fallback to Basic if CORS issues
      initializeJSPlayer().catch((error) => {
        console.log("Enhanced mode failed, falling back to Basic mode:", error);
        setPlayerMode('iframe');
        setError(null);
      });
    } else {
      setPlayerState('ready');
      cleanup();
    }

    return cleanup;
  }, [playerMode, channel, initializeJSPlayer, cleanup, isClient]);

  // Handle unmute
  const handleUnmute = useCallback(async () => {
    if (playerRef.current && typeof playerRef.current.setMuted === 'function') {
      try {
        playerRef.current.setMuted(false);
        setIsMuted(false);
        setShowUnmutePrompt(false);
        setPlayerState('unmuted');
      } catch (e) {
        console.error("Failed to unmute player:", e);
      }
    }
  }, []);

  const reloadPlayer = useCallback(() => {
    setError(null);
    setRetryCount(0);
    if (playerMode === 'js') {
      resetTwitchSDK(); // Reset SDK state
      initializeJSPlayer();
    } else {
      window.location.reload();
    }
  }, [playerMode, initializeJSPlayer]);

  // Get iframe source with proper parent domain
  const getIframeSrc = useCallback(() => {
    if (!isClient) return '';
    
    // Use the parent environment variable directly
    const parentDomain = parent || 'localhost';
    
    // Privacy-focused iframe URL - minimal parameters, no tracking
    return `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(parentDomain)}&muted=false&autoplay=true&theme=dark&controls=true`;
  }, [channel, parent, isClient]);

  const iframeSrc = getIframeSrc();

  return (
    <div className="relative w-full">
      {/* Player Mode Toggle */}
      {isClient && (
        <div className="mb-3 flex justify-between items-center">
          <div className="text-sm text-text-muted">
            {playerMode === 'js' && playerState === 'ready' && (
              <span className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                Enhanced Mode Active
              </span>
            )}
            {playerMode === 'iframe' && (
              <span className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                Basic Mode Active
              </span>
            )}
          </div>
          <div className="flex gap-1 bg-surface rounded-lg p-1">
            <button
              onClick={() => togglePlayerMode('iframe')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                playerMode === 'iframe' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-text-muted hover:text-text hover:bg-white/5'
              }`}
            >
              Basic
            </button>
            <button
              onClick={() => togglePlayerMode('js')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                playerMode === 'js' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-text-muted hover:text-text hover:bg-white/5'
              }`}
            >
              Enhanced
            </button>
          </div>
        </div>
      )}

      {/* Auto-fallback Notification */}
      {isAutoFallback && playerMode === 'iframe' && (
        <div className="mb-3 bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-300 flex items-center justify-between">
          <div className="flex-1">
            <span>Automatically switched to Basic mode for better compatibility.</span>
            <div className="mt-1 text-xs text-blue-400">
              Enhanced mode had issues loading. You can try Enhanced mode again anytime.
            </div>
          </div>
          <button
            onClick={() => setIsAutoFallback(false)}
            className="ml-3 text-blue-400 hover:text-blue-300"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-3 bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-300 flex items-center justify-between">
          <div className="flex-1">
            <span>{error.message}</span>
            {error.type === 'cors' && (
              <div className="mt-1 text-xs text-red-400">
                This is a browser security feature. Basic mode works without restrictions.
              </div>
            )}
            {error.retryable && (
              <div className="mt-1 text-xs text-red-400">
                The player will automatically retry or switch to Basic mode.
              </div>
            )}
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-3 text-red-400 hover:text-red-300"
          >
            ×
          </button>
        </div>
      )}

      {/* Player Container */}
      <div 
        ref={containerRef}
        className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-white/10"
      >
        {playerMode === 'iframe' ? (
          <iframe 
            src={iframeSrc}
            className="w-full h-full"
            allowFullScreen
            scrolling="no"
            frameBorder="0"
            onLoad={() => console.log("Iframe loaded successfully")}
            onError={(e) => console.error("Iframe failed to load:", e)}
          />
        ) : (
          <>
            {/* Loading State for JS Player */}
            {playerState === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
                  <div className="text-sm text-text-muted">Loading enhanced player...</div>
                  {retryCount > 0 && (
                    <div className="text-xs text-text-muted">Attempt {retryCount + 1}/{maxRetries + 1}</div>
                  )}
                </div>
              </div>
            )}

            {/* Error State for JS Player */}
            {playerState === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
                <div className="flex flex-col items-center gap-3 text-center p-6">
                  <div className="text-red-400 text-4xl">⚠</div>
                  <div className="text-sm text-text-muted max-w-md">
                    {error?.message || "Enhanced player failed to load."}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => togglePlayerMode('iframe')}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                    >
                      Switch to Basic
                    </button>
                    {error?.retryable && (
                      <button
                        onClick={reloadPlayer}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Unmute Prompt */}
            {showUnmutePrompt && playerState === 'ready' && isMuted && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                <div className="flex flex-col items-center gap-3 text-center p-6">
                  <div className="text-white text-4xl">🔇</div>
                  <div className="text-sm text-white max-w-md">
                    Stream is muted for autoplay compatibility
                  </div>
                  <button
                    onClick={handleUnmute}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                  >
                    Unmute Stream
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stream Info */}
      <div className="mt-3 text-sm text-text-muted">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
          <span>Live: {channel}</span>
          {playerMode === 'js' && playerState === 'ready' && (
            <span className="ml-auto text-xs">
              {isMuted ? 'Muted' : 'Unmuted'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
