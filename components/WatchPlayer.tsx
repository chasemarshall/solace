"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { loadTwitchSDK } from "@/lib/twitch/embed";

type PlayerState = 'loading' | 'ready' | 'error' | 'buffering';
type PlayerMode = 'js' | 'iframe';

export default function WatchPlayer({ channel, parent }: { channel: string; parent: string }) {
  const [playerMode, setPlayerMode] = useState<PlayerMode>(() => {
    if (typeof window === "undefined") return "js";
    return (localStorage.getItem("player-mode") as PlayerMode) || "js";
  });
  const [playerState, setPlayerState] = useState<PlayerState>('loading');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(50);
  const [showControls, setShowControls] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

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
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  // Initialize player
  useEffect(() => {
    if (playerMode === 'iframe') return;
    
    let disposed = false;
    setPlayerState('loading');
    setError(null);

    async function createPlayer() {
      try {
        const Twitch = await loadTwitchSDK();
        if (disposed || !containerRef.current || !Twitch) return;
        
        const parents = parent.split(",").map(p => p.trim()).filter(Boolean);
        const host = window.location.hostname;
        if (!parents.includes(host)) parents.push(host);

        const embed = new Twitch.Embed(containerRef.current, {
          channel,
          parent: parents,
          width: "100%",
          height: "100%",
          autoplay: true,
          muted: true,
          layout: "video",
        });

        embed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
          const player = embed.getPlayer();
          playerRef.current = player;
          
          setPlayerState('ready');
          setIsPlaying(true);
          player.setMuted(isMuted);
          player.setVolume(volume / 100);

          // Listen for player events
          player.addEventListener(Twitch.Player.PLAY, () => setIsPlaying(true));
          player.addEventListener(Twitch.Player.PAUSE, () => setIsPlaying(false));
        });

        embed.addEventListener(Twitch.Embed.VIDEO_PLAY, () => {
          setPlayerState('ready');
          setIsPlaying(true);
        });

      } catch (e) {
        console.error("Player initialization failed:", e);
        setError("Player failed to load. Try refreshing or switching to iframe mode.");
        setPlayerState('error');
      }
    }

    createPlayer();

    return () => {
      disposed = true;
      if (playerRef.current) {
        playerRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [channel, parent, playerMode, isMuted, volume]);

  // Player controls
  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    playerRef.current.setMuted(newMuted);
  }, [isMuted]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume / 100);
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
        playerRef.current.setMuted(false);
      }
    }
  }, [isMuted]);

  const reloadPlayer = useCallback(() => {
    setPlayerState('loading');
    setError(null);
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }
    // Trigger re-render by changing a dependency
    window.location.reload();
  }, []);

  const togglePlayerMode = useCallback(() => {
    const newMode: PlayerMode = playerMode === 'js' ? 'iframe' : 'js';
    setPlayerMode(newMode);
    localStorage.setItem("player-mode", newMode);
    setError(null);
  }, [playerMode]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target !== document.body) return; // Only when not in input
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'KeyM':
          toggleMute();
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
  }, [togglePlayPause, toggleMute, toggleFullscreen, reloadPlayer]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const iframeParent = parent.split(",")[0];
  const iframeSrc = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(iframeParent)}&muted=false&autoplay=true`;

  return (
    <div className="relative w-full">
      {/* Player Mode Toggle */}
      <div className="mb-3 flex justify-between items-center">
        <div className="flex gap-2 text-sm text-text-muted">
          <span>Mode:</span>
          <button
            onClick={togglePlayerMode}
            className={`px-2 py-1 rounded transition-colors ${
              playerMode === 'js' 
                ? 'bg-purple-600 text-white' 
                : 'bg-surface hover:bg-white/10 text-text-muted'
            }`}
          >
            Enhanced
          </button>
          <button
            onClick={togglePlayerMode}
            className={`px-2 py-1 rounded transition-colors ${
              playerMode === 'iframe' 
                ? 'bg-purple-600 text-white' 
                : 'bg-surface hover:bg-white/10 text-text-muted'
            }`}
          >
            Basic
          </button>
        </div>
        
        {playerMode === 'js' && (
          <div className="text-xs text-text-muted">
            Shortcuts: Space (play/pause), M (mute), F (fullscreen), R (reload)
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-3 bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Player Container */}
      <div 
        ref={containerRef}
        className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-white/10 group"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setShowControls(false)}
      >
        {playerMode === 'iframe' ? (
          <iframe 
            src={iframeSrc}
            className="w-full h-full"
            allowFullScreen
            scrolling="no"
          />
        ) : (
          <>
            {/* Loading State */}
            {playerState === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  <div className="text-sm text-text-muted">Loading player...</div>
                </div>
              </div>
            )}

            {/* Center Play/Pause Button */}
            {playerState === 'ready' && (showControls || !isPlaying) && (
              <button
                onClick={togglePlayPause}
                className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-200 hover:bg-black/40"
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
            )}

            {/* Bottom Controls Bar */}
            {playerState === 'ready' && showControls && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
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

                    {/* Volume */}
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
            )}
          </>
        )}
      </div>

      {/* Stream Info */}
      <div className="mt-3 text-sm text-text-muted">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
          <span>Live: {channel}</span>
        </div>
      </div>
    </div>
  );
}
