'use client';

import React, { useEffect, useRef } from 'react';

interface SimpleHlsPlayerProps {
  src: string;
}

export default function SimpleHlsPlayer({ src }: SimpleHlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current || !src) return;

    // Use native HTML5 video for now to test
    const proxiedSrc = `/api/hls?src=${encodeURIComponent(src)}`;
    
    // Try native HLS first (works in Safari)
    if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = proxiedSrc;
    }
  }, [src]);

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
      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
        Native HLS Test
      </div>
    </div>
  );
}