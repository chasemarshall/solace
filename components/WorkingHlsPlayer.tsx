'use client';

import React, { useEffect, useRef, useState } from 'react';

interface WorkingHlsPlayerProps {
  src: string;
}

export default function WorkingHlsPlayer({ src }: WorkingHlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hlsSupported, setHlsSupported] = useState(false);

  useEffect(() => {
    if (!videoRef.current || !src) return;

    const video = videoRef.current;
    const proxiedSrc = `/api/hls?src=${encodeURIComponent(src)}`;

    // Check for native HLS support first
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('Using native HLS support');
      setHlsSupported(true);
      video.src = proxiedSrc;
      video.addEventListener('loadstart', () => setIsLoading(false));
      video.addEventListener('error', (e) => {
        console.error('Native HLS error:', e);
        setError('Native HLS playback failed');
        setIsLoading(false);
      });
      return;
    }

    // Dynamic import for hls.js
    import('hls.js').then(({ default: Hls }) => {
      if (Hls.isSupported()) {
        console.log('Using hls.js');
        setHlsSupported(true);
        
        const hls = new Hls({
          lowLatencyMode: true,
          debug: false,
        });

        hls.loadSource(proxiedSrc);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS manifest parsed');
          setIsLoading(false);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS.js error:', data);
          if (data.fatal) {
            setError(`HLS Error: ${data.type} - ${data.details}`);
            setIsLoading(false);
          }
        });

        return () => {
          hls.destroy();
        };
      } else {
        setError('HLS not supported in this browser');
        setIsLoading(false);
      }
    }).catch((err) => {
      console.error('Failed to load hls.js:', err);
      setError('Failed to load HLS library');
      setIsLoading(false);
    });
  }, [src]);

  if (error) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-red-400 text-lg mb-2">⚠ Playback Error</div>
          <div className="text-sm opacity-75">{error}</div>
          <div className="text-xs opacity-50 mt-2">Try Safari for native HLS support</div>
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
            <div className="text-sm opacity-75">Processing SSAI manifest...</div>
          </div>
        </div>
      )}

      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
        {hlsSupported ? (videoRef.current?.canPlayType('application/vnd.apple.mpegurl') ? 'Native HLS' : 'hls.js') : 'No HLS'}
      </div>
    </div>
  );
}