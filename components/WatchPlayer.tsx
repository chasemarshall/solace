"use client";

import { useCallback, useEffect, useState } from "react";

export default function WatchPlayer({ channel, parent }: { channel: string; parent: string }) {
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for stored auth token
    const storedAuth = localStorage.getItem('twitch_auth');
    if (storedAuth) {
      try {
        const parsedAuth = JSON.parse(storedAuth);
        if (parsedAuth.expires_at && Date.now() < parsedAuth.expires_at) {
          setAuthToken(parsedAuth.tokens.access_token);
        }
      } catch (e) {
        console.error('Failed to parse stored auth:', e);
      }
    }
  }, []);

  // Get iframe source with proper parent domain
  const getIframeSrc = useCallback(() => {
    // Use the parent environment variable directly
    const parentDomain = parent || 'localhost';
    
    // Enhanced iframe URL with Twitch player features
    let baseUrl = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(parentDomain)}&muted=false&autoplay=true&theme=dark&controls=true`;
    
    // Add auth token if available
    if (authToken) {
      baseUrl += `&token=${encodeURIComponent(authToken)}`;
    }
    
    return baseUrl;
  }, [channel, parent, authToken]);

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
    </div>
  );
}