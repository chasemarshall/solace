"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { loadTwitchSDK } from "@/lib/twitch/embed";

type PlayerState = 'loading' | 'ready' | 'error';
type PlayerMode = 'js' | 'iframe';

export default function WatchPlayer({ channel, parent }: { channel: string; parent: string }) {
  const [playerMode, setPlayerMode] = useState<PlayerMode>("iframe");
  const [isClient, setIsClient] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>('loading');
  const [error, setError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const embedRef = useRef<any>(null);

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
    const savedMode = localStorage.getItem("player-mode") as PlayerMode;
    if (savedMode && (savedMode === "js" || savedMode === "iframe")) {
      setPlayerMode(savedMode);
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current = null;
      } catch (e) {
        console.log("Player cleanup error:", e);
      }
    }

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

    // Clear container
    if (containerRef.current) {
      try {
        containerRef.current.innerHTML = '';
      } catch (e) {
        console.log("Container cleanup error:", e);
      }
    }
  }, []);

  // Initialize JS player
  const initializeJSPlayer = useCallback(async () => {
    if (!containerRef.current) return;
    
    setPlayerState('loading');
    setError(null);
    cleanup();

    try {
      const Twitch = await loadTwitchSDK();
      
      if (!Twitch || !containerRef.current) {
        throw new Error("Twitch SDK failed to load");
      }

      // Prepare parent domains
      const parents = parent.split(",").map(p => p.trim()).filter(Boolean);
      const currentHost = window.location.hostname;
      if (!parents.includes(currentHost)) {
        parents.push(currentHost);
      }

      // Clear container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      // Initialize Twitch embed
      const embed = new Twitch.Embed(containerRef.current, {
        channel: channel.toLowerCase(),
        parent: parents,
        width: "100%",
        height: "100%",
        autoplay: true,
        muted: true,
        layout: "video",
        theme: "dark"
      });

      embedRef.current = embed;

      // Set up event listeners
      const handleVideoReady = () => {
        try {
          const player = embed.getPlayer();
          if (player) {
            playerRef.current = player;
            setPlayerState('ready');
            console.log("JS Player initialized successfully");
          }
        } catch (e) {
          console.error("Error setting up player:", e);
          setError("Failed to initialize player controls");
          setPlayerState('error');
        }
      };

      const handleEmbedError = (error: any) => {
        console.error("Embed error:", error);
        setError("Player failed to load. Try switching to Basic mode.");
        setPlayerState('error');
      };

      // Attach embed event listeners
      if (embed && typeof embed.addEventListener === 'function' && Twitch?.Embed) {
        embed.addEventListener(Twitch.Embed.VIDEO_READY, handleVideoReady);
        embed.addEventListener(Twitch.Embed.VIDEO_PLAY, () => setPlayerState('ready'));
        embed.addEventListener(Twitch.Embed.VIDEO_END, () => setPlayerState('ready'));
        embed.addEventListener(Twitch.Embed.EMBED_ERROR, handleEmbedError);
      }

      // Fallback timeout
      setTimeout(() => {
        if (playerState === 'loading') {
          setPlayerState('ready'); // Assume it's working if no error
        }
      }, 5000);

    } catch (e) {
      console.error("Player initialization failed:", e);
      setError("Enhanced player failed to load. Try Basic mode.");
      setPlayerState('error');
    }
  }, [channel, parent, cleanup, playerState]);

  // Initialize player based on mode
  useEffect(() => {
    if (!isClient) return;
    
    if (playerMode === 'js') {
      initializeJSPlayer();
    } else {
      setPlayerState('ready');
      cleanup();
    }

    return cleanup;
  }, [playerMode, channel, initializeJSPlayer, cleanup, isClient]);

  const reloadPlayer = useCallback(() => {
    setError(null);
    if (playerMode === 'js') {
      initializeJSPlayer();
    } else {
      window.location.reload();
    }
  }, [playerMode, initializeJSPlayer]);

  const togglePlayerMode = useCallback((newMode: PlayerMode) => {
    setPlayerMode(newMode);
    localStorage.setItem("player-mode", newMode);
    setError(null);
    cleanup();
  }, [cleanup]);

  // Get iframe source
  const iframeParent = parent.split(",")[0] || "localhost";
  const iframeSrc = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(iframeParent)}&muted=false&autoplay=true`;

  return (
    <div className="relative w-full">
      {/* Player Mode Toggle */}
      {isClient && (
        <div className="mb-3 flex justify-end">
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

      {/* Error Display */}
      {error && (
        <div className="mb-3 bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-300 flex items-center justify-between">
          <span>{error}</span>
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
          />
        ) : (
          <>
            {/* Loading State for JS Player */}
            {playerState === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
                  <div className="text-sm text-text-muted">Loading enhanced player...</div>
                </div>
              </div>
            )}

            {/* Error State for JS Player */}
            {playerState === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
                <div className="flex flex-col items-center gap-3 text-center p-6">
                  <div className="text-red-400 text-4xl">⚠</div>
                  <div className="text-sm text-text-muted max-w-md">
                    Enhanced player failed to load. Try switching to Basic mode or refreshing the page.
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => togglePlayerMode('iframe')}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                    >
                      Switch to Basic
                    </button>
                    <button
                      onClick={reloadPlayer}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
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
              Enhanced Mode
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
