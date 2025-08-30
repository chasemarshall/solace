'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';

interface DevHlsPlayerProps {
  src: string;
  onMetrics?: (metrics: PlayerMetrics) => void;
}

interface PlayerMetrics {
  levelSwitches: number;
  errors: number;
  stalls: number;
  lastLevelSwitch: Date | null;
  lastError: string | null;
  lastStall: Date | null;
  currentLevel: number;
  availableLevels: number;
}

export default function DevHlsPlayer({ src, onMetrics }: DevHlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [metrics, setMetrics] = useState<PlayerMetrics>({
    levelSwitches: 0,
    errors: 0,
    stalls: 0,
    lastLevelSwitch: null,
    lastError: null,
    lastStall: null,
    currentLevel: -1,
    availableLevels: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const updateMetrics = useCallback((update: Partial<PlayerMetrics>) => {
    setMetrics(prev => {
      const newMetrics = { ...prev, ...update };
      onMetrics?.(newMetrics);
      return newMetrics;
    });
  }, [onMetrics]);

  useEffect(() => {
    if (!videoRef.current || !src) return;

    // Build proxied URL
    const proxiedSrc = `/api/hls?src=${encodeURIComponent(src)}`;
    
    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 60,
        enableWorker: true,
      });

      hlsRef.current = hls;

      // Level switching metrics
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        updateMetrics({
          levelSwitches: metrics.levelSwitches + 1,
          lastLevelSwitch: new Date(),
          currentLevel: data.level,
        });
      });

      // Manifest loaded - count available levels
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        updateMetrics({
          availableLevels: data.levels.length,
        });
        setIsLoading(false);
      });

      // Error tracking
      hls.on(Hls.Events.ERROR, (event, data) => {
        const errorMsg = `${data.type}: ${data.details}`;
        updateMetrics({
          errors: metrics.errors + 1,
          lastError: errorMsg,
        });
        
        if (data.fatal) {
          setLoadError(errorMsg);
        }
      });

      // Stall detection via waiting event
      videoRef.current.addEventListener('waiting', () => {
        updateMetrics({
          stalls: metrics.stalls + 1,
          lastStall: new Date(),
        });
      });

      // Load and attach
      hls.loadSource(proxiedSrc);
      hls.attachMedia(videoRef.current);

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      videoRef.current.src = proxiedSrc;
      setIsLoading(false);
    } else {
      setLoadError('HLS not supported in this browser');
    }
  }, [src, updateMetrics, metrics.levelSwitches, metrics.errors, metrics.stalls]);

  if (loadError) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-red-400 text-lg mb-2">⚠ Load Error</div>
          <div className="text-sm opacity-75">{loadError}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        autoPlay
        muted
        playsInline
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div className="text-lg font-semibold">Loading HLS Stream</div>
            <div className="text-sm opacity-75">Processing manifest...</div>
          </div>
        </div>
      )}

      {/* Minimal metrics overlay */}
      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-mono">
        L:{metrics.currentLevel}/{metrics.availableLevels} | S:{metrics.levelSwitches} | E:{metrics.errors}
      </div>
    </div>
  );
}