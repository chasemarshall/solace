"use client";

import { useState, useCallback } from "react";
import TtvLolPlayer from "@/components/player/TtvLolPlayer";

interface EnhancedWatchPlayerProps {
  channel: string;
  parent: string;
}

export default function EnhancedWatchPlayer({ channel, parent }: EnhancedWatchPlayerProps) {
  const [useFallback, setUseFallback] = useState(false);

  const handleFallback = useCallback(() => {
    console.log("EnhancedWatchPlayer: Switching to fallback player");
    setUseFallback(true);
  }, []);

  if (useFallback) {
    const parentDomain = parent || 'localhost';
    const iframeSrc = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(parentDomain)}&muted=false&autoplay=true&theme=dark&controls=true&quality=source`;

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

  return (
    <div className="relative w-full">
      {/* TTV LOL PRO Player - Ad-Free Twitch Streams */}
      <TtvLolPlayer channel={channel} onError={handleFallback} />
    </div>
  );
}