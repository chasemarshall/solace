"use client";

import { useCallback } from "react";

export default function WatchPlayer({ channel, parent }: { channel: string; parent: string }) {
  // Get iframe source with proper parent domain
  const getIframeSrc = useCallback(() => {
    // Use the parent environment variable directly
    const parentDomain = parent || 'localhost';
    
    // Enhanced iframe URL with Twitch player features
    return `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(parentDomain)}&muted=false&autoplay=true&theme=dark&controls=true`;
  }, [channel, parent]);

  const iframeSrc = getIframeSrc();

  return (
    <div className="relative w-full">
      {/* Player Container - Larger like Twitch */}
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
        <iframe 
          src={iframeSrc}
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          sandbox="allow-same-origin allow-scripts allow-forms allow-pointer-lock allow-popups"
          referrerPolicy="strict-origin-when-cross-origin"
          scrolling="no"
          frameBorder="0"
          onLoad={() => console.log("Twitch player loaded successfully")}
          onError={(e) => console.error("Twitch player failed to load:", e)}
        />
      </div>

      {/* Stream Info */}
      <div className="mt-4 text-sm text-text-muted">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="font-medium">Live: {channel}</span>
        </div>
      </div>
    </div>
  );
}