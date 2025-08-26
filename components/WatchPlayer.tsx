"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { loadTwitchSDK } from "@/lib/twitch/embed";

type PlayerState = 'loading' | 'ready' | 'error' | 'buffering';
type PlayerMode = 'js' | 'iframe';

export default function WatchPlayer({ channel, parent }: { channel: string; parent: string }) {
  const [playerMode, setPlayerMode] = useState<PlayerMode>("iframe");
  const [isClient, setIsClient] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>('loading');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(50);
  const [showControls, setShowControls] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const embedRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitializingRef = useRef(false);

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true);
    const savedMode = localStorage.getItem("player-mode") as PlayerMode;
    if (savedMode && (savedMode === "js" || savedMode === "iframe")) {
      setPlayerMode(savedMode);
    }
  }, []);

  // Auto-hide controls after 3 seconds of inactivity
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // Handle mouse movement to show controls
  const handleMouseMove = useCallback(() => {
    if (playerMode === 'js' && playerState === 'ready') {
      resetControlsTimeout();
    }
  }, [resetControlsTimeout, playerMode, playerState]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // Clean up player references
    if (playerRef.current) {
      try {
        // Remove any event listeners if possible
        if (typeof playerRef.current.removeEventListener === 'function') {
          // Attempt to clean up event listeners
          console.log("Cleaning up player event listeners");
        }
        playerRef.current = null;
      } catch (e) {
        console.log("Player cleanup error:", e);
      }
    }

    // Clean up embed
    if (embedRef.current) {
      try {
        // Attempt to destroy embed if method exists
        if (typeof embedRef.current.destroy === 'function') {
          embedRef.current.destroy();
        }
        embedRef.current = null;
      } catch (e) {
        console.log("Embed cleanup error:", e);
      }
    }

    // Clear container safely using React-friendly approach
    try {
      if (containerRef.current && containerRef.current.children.length > 0) {
        // Use a more React-friendly approach - set state to trigger re-render
        setPlayerState('loading');
      }
    } catch (e) {
      console.log("Container cleanup error:", e);
    }

    isInitializingRef.current = false;
  }, []);

  // Initialize JS player
  const initializeJSPlayer = useCallback(async () => {
    if (isInitializingRef.current || !containerRef.current) return;
    
    isInitializingRef.current = true;
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

      // Clear and prepare container for embed safely
      try {
        if (containerRef.current && containerRef.current.children.length > 0) {
          // Remove existing children safely
          const children = Array.from(containerRef.current.children);
          children.forEach(child => {
            try {
              if (child.parentNode === containerRef.current && containerRef.current) {
                containerRef.current.removeChild(child);
              }
            } catch (e) {
              console.log('Error removing child element:', e);
            }
          });
        }
      } catch (e) {
        console.log('Error clearing container:', e);
      }

      // Initialize Twitch embed directly in the container
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

      // Set up event listeners with error handling
      const handleVideoReady = () => {
        try {
          const player = embed.getPlayer();
          if (!player) {
            throw new Error("Player not available");
          }

          playerRef.current = player;
          setPlayerState('ready');
          setIsPlaying(true);
          
          // Set initial volume and mute state
          player.setMuted(isMuted);
          player.setVolume(volume / 100);

          // Add player event listeners with null checks
          const handlePlay = () => setIsPlaying(true);
          const handlePause = () => setIsPlaying(false);
          const handleOffline = () => setPlayerState('error');

          if (player && typeof player.addEventListener === 'function' && Twitch?.Player) {
            player.addEventListener(Twitch.Player.PLAY, handlePlay);
            player.addEventListener(Twitch.Player.PAUSE, handlePause);
            player.addEventListener(Twitch.Player.OFFLINE, handleOffline);
          } else {
            console.warn('Player addEventListener not available, using fallback event handling');
          }

          console.log("JS Player initialized successfully");
          
        } catch (e) {
          console.error("Error setting up player:", e);
          setError("Failed to initialize player controls");
          setPlayerState('error');
        }
      };

      const handleVideoPlay = () => {
        setPlayerState('ready');
        setIsPlaying(true);
      };

      const handleEmbedError = (error: any) => {
        console.error("Embed error:", error);
        setError("Player failed to load. Try refreshing or switching to Basic mode.");
        setPlayerState('error');
      };

      // Attach embed event listeners with error handling
      try {
        if (embed && typeof embed.addEventListener === 'function' && Twitch?.Embed) {
          embed.addEventListener(Twitch.Embed.VIDEO_READY, handleVideoReady);
          embed.addEventListener(Twitch.Embed.VIDEO_PLAY, handleVideoPlay);
        } else {
          console.warn('Embed addEventListener not available');
          // Set a fallback timeout to attempt player initialization
          setTimeout(() => {
            try {
              handleVideoReady();
            } catch (e) {
              console.error('Fallback player initialization failed:', e);
              setPlayerState('error');
            }
          }, 2000);
        }
      } catch (e) {
        console.error('Error setting up embed event listeners:', e);
      }
      
      // Handle potential errors
      setTimeout(() => {
        if (playerState === 'loading') {
          setError("Player is taking too long to load. Try Basic mode instead.");
          setPlayerState('error');
        }
      }, 10000); // 10 second timeout

    } catch (e) {
      console.error("Player initialization failed:", e);
      setError("Enhanced player failed to load. Try refreshing or use Basic mode.");
      setPlayerState('error');
    } finally {
      isInitializingRef.current = false;
    }
  }, [channel, parent, isMuted, volume, cleanup, playerState]);

  // Initialize player based on mode (only after client-side hydration)
  useEffect(() => {
    if (!isClient) return; // Wait for client-side hydration
    
    if (playerMode === 'js') {
      initializeJSPlayer();
    } else {
      setPlayerState('ready');
      cleanup();
    }

    return cleanup;
  }, [playerMode, channel, initializeJSPlayer, cleanup, isClient]);

  // Player controls with error handling
  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    
    try {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
    } catch (e) {
      console.error("Error toggling play/pause:", e);
      setError("Playback control failed");
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    
    try {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      playerRef.current.setMuted(newMuted);
    } catch (e) {
      console.error("Error toggling mute:", e);
      setError("Volume control failed");
    }
  }, [isMuted]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!playerRef.current) return;
    
    try {
      setVolume(newVolume);
      playerRef.current.setVolume(newVolume / 100);
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
        playerRef.current.setMuted(false);
      }
    } catch (e) {
      console.error("Error changing volume:", e);
      setError("Volume control failed");
    }
  }, [isMuted]);

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

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    try {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.error("Fullscreen error:", e);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in an input field
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (playerMode === 'js') togglePlayPause();
          break;
        case 'KeyM':
          if (playerMode === 'js') toggleMute();
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
        case 'KeyR':
          reloadPlayer();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [togglePlayPause, toggleMute, toggleFullscreen, reloadPlayer, playerMode]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Get iframe source
  const iframeParent = parent.split(",")[0] || "localhost";
  const iframeSrc = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(iframeParent)}&muted=false&autoplay=true`;

  return (
    <div className="relative w-full">
      {/* Player Mode Toggle - only show after hydration */}
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
        className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-white/10 group"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => playerMode === 'js' && setShowControls(false)}
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

            {/* JS Player Controls */}
            {playerMode === 'js' && playerState === 'ready' && showControls && (
              <>
                {/* Center Play/Pause Button */}
                <button
                  onClick={togglePlayPause}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-200 hover:bg-black/40 z-10"
                >
                  <div className="bg-black/60 rounded-full p-4 transition-transform hover:scale-110">
                    {isPlaying ? (
                      <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                      </svg>
                    ) : (
                      <svg className="h-8 w-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    )}
                  </div>
                </button>

                {/* Bottom Controls Bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 z-10">
                  <div className="flex items-center gap-4">
                    {/* Left Controls */}
                    <div className="flex items-center gap-3">
                      {/* Play/Pause */}
                      <button
                        onClick={togglePlayPause}
                        className="text-white hover:text-purple-400 transition-colors"
                        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                      >
                        {isPlaying ? (
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                      </button>

                      {/* Volume Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={toggleMute}
                          className="text-white hover:text-purple-400 transition-colors"
                          title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                        >
                          {isMuted || volume === 0 ? (
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                            </svg>
                          ) : volume < 50 ? (
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
                            </svg>
                          ) : (
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                            </svg>
                          )}
                        </button>
                        
                        {/* Volume Slider */}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                          className="w-20 accent-purple-500"
                          title={`Volume: ${volume}%`}
                        />
                      </div>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Right Controls */}
                    <div className="flex items-center gap-3">
                      {/* Reload */}
                      <button
                        onClick={reloadPlayer}
                        className="text-white hover:text-purple-400 transition-colors"
                        title="Reload Player (R)"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>

                      {/* Fullscreen */}
                      <button
                        onClick={toggleFullscreen}
                        className="text-white hover:text-purple-400 transition-colors"
                        title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
                      >
                        {isFullscreen ? (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Stream Info */}
      <div className="mt-3 text-sm text-text-muted">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
          <span>Live: {channel}</span>
          {playerMode === 'js' && (
            <span className="ml-auto text-xs">
              Enhanced Mode {playerState === 'ready' && '• Space: play/pause, M: mute, F: fullscreen'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
