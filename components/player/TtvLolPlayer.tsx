'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useImmersive } from '@/contexts/ImmersiveContext';

interface TtvLolPlayerProps {
  channel: string;
}

export default function TtvLolPlayer({ channel }: TtvLolPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [qualityLevels, setQualityLevels] = useState<Array<{ level: number; height: number; bitrate: number }>>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const { isImmersiveMode } = useImmersive();

  useEffect(() => {
    if (!videoRef.current || !channel) return;

    // TTV LOL PRO API endpoint - provides ad-free Twitch streams
    const streamUrl = `/api/hls?src=${encodeURIComponent(`https://api.ttv.lol/playlist/${encodeURIComponent(channel)}.m3u8`)}`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 60,
        enableWorker: true,
        debug: false,
      });

      hlsRef.current = hls;

      // Manifest loaded - extract quality levels
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        const levels = data.levels.map((level: any, index: number) => ({
          level: index,
          height: level.height,
          bitrate: level.bitrate,
        }));
        setQualityLevels(levels);
        setIsLoading(false);
      });

      // Track current quality level
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        setCurrentQuality(data.level);
      });

      // Error handling
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setLoadError('Network error - stream may be offline or unavailable');
              // Try to recover
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setLoadError('Media error - attempting to recover');
              hls.recoverMediaError();
              break;
            default:
              setLoadError(`Fatal error: ${data.details}`);
              break;
          }
        }
      });

      // Load and attach
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      videoRef.current.src = streamUrl;
      setIsLoading(false);
    } else {
      setLoadError('HLS not supported in this browser');
    }
  }, [channel]);

  const handleQualityChange = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setCurrentQuality(level);
    }
  };

  if (loadError) {
    return (
      <div className={`relative w-full aspect-video bg-black flex items-center justify-center ${isImmersiveMode ? '' : 'rounded-xl'} overflow-hidden shadow-2xl`}>
        <div className="text-center text-white p-8">
          <div className="text-red-400 text-xl mb-3">⚠ Stream Error</div>
          <div className="text-sm opacity-75 mb-4">{loadError}</div>
          <div className="text-xs opacity-50">
            Channel: {channel}
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
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <div className="text-lg font-semibold">Loading Stream</div>
            <div className="text-sm opacity-75 mt-2">TTV LOL PRO • Ad-Free</div>
          </div>
        </div>
      )}

      {/* Quality selector - shown on hover */}
      {qualityLevels.length > 0 && !isLoading && (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <select
            value={currentQuality}
            onChange={(e) => handleQualityChange(Number(e.target.value))}
            className="bg-black/80 text-white text-sm px-3 py-2 rounded-lg border border-white/20 hover:border-white/40 backdrop-blur-sm cursor-pointer"
          >
            <option value={-1}>Auto</option>
            {qualityLevels.map((level) => (
              <option key={level.level} value={level.level}>
                {level.height}p {currentQuality === level.level ? '✓' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Ad-free badge */}
      <div className="absolute top-4 left-4 bg-green-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs font-medium">
        Ad-Free
      </div>
    </div>
  );
}
