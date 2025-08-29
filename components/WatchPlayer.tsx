"use client";

import { useCallback } from "react";

export default function WatchPlayer({ channel, parent }: { channel: string; parent: string }) {

  // Get iframe source with proper parent domain
  const getIframeSrc = useCallback(() => {
    // Use the parent environment variable directly
    const parentDomain = parent || 'localhost';
    
    // Enhanced iframe URL with Twitch player features
    // Note: Auth is handled by browser cookies/session, not URL token params
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
        />
      </div>
    </div>
  );
}