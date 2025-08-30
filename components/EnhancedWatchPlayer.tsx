"use client";

import { useCallback, useState, useEffect } from "react";
import { useStorageAccess } from "./StorageAccessManager";
import { useImmersive } from "@/contexts/ImmersiveContext";

interface EnhancedWatchPlayerProps {
  channel: string;
  parent: string;
}

export default function EnhancedWatchPlayer({ channel, parent }: EnhancedWatchPlayerProps) {
  const { consentGiven, accessGranted, requestAccess } = useStorageAccess();
  const { isImmersiveMode } = useImmersive();
  const [showAccessPrompt, setShowAccessPrompt] = useState(false);
  const [attempting, setAttempting] = useState(false);

  // Get iframe source with proper parent domain
  const getIframeSrc = useCallback(() => {
    const parentDomain = parent || 'localhost';
    return `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(parentDomain)}&muted=false&autoplay=true&theme=dark&controls=true&quality=source`;
  }, [channel, parent]);

  const handlePlayerClick = async () => {
    // Only show prompt if consent given but access not yet attempted
    if (consentGiven && accessGranted === null && !attempting) {
      setShowAccessPrompt(true);
    }
  };

  const handleEnableAccess = async () => {
    setAttempting(true);
    setShowAccessPrompt(false);
    
    const success = await requestAccess();
    
    if (success) {
      // Show success message briefly
      setTimeout(() => {
        setAttempting(false);
      }, 2000);
    } else {
      setAttempting(false);
    }
  };

  const handleDismissPrompt = () => {
    setShowAccessPrompt(false);
  };

  const iframeSrc = getIframeSrc();

  return (
    <div className="relative w-full">
      {/* Player Container */}
      <div className={`relative w-full aspect-video bg-black overflow-hidden shadow-2xl ${isImmersiveMode ? '' : 'rounded-xl'}`}>
        <iframe 
          src={iframeSrc}
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          sandbox="allow-same-origin allow-scripts allow-forms allow-pointer-lock allow-popups allow-storage-access-by-user-activation"
          style={{ visibility: 'visible' }}
          referrerPolicy="strict-origin-when-cross-origin"
          scrolling="no"
          frameBorder="0"
          onClick={handlePlayerClick}
        />
        
        {/* Storage Access Prompt Overlay */}
        {showAccessPrompt && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
            <div className="bg-surface/95 backdrop-blur-sm border border-white/10 rounded-xl p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold text-white mb-2">
                Enable Enhanced Twitch Experience?
              </h3>
              <p className="text-sm text-text-muted mb-4">
                This will sync your Twitch login with the player so you can follow, subscribe, and interact without logging in again.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDismissPrompt}
                  className="flex-1 px-4 py-2 text-sm bg-transparent border border-white/20 text-text-muted hover:text-white hover:border-white/40 rounded-lg transition-colors"
                >
                  Not now
                </button>
                <button
                  onClick={handleEnableAccess}
                  className="flex-1 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  Enable
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success/Status Indicators */}
        {attempting && (
          <div className="absolute top-4 right-4 bg-purple-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm">
            Enabling enhanced experience...
          </div>
        )}
        
        {accessGranted === true && (
          <div className="absolute top-4 right-4 bg-green-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm">
            ✓ Enhanced experience enabled
          </div>
        )}
        
        {accessGranted === false && (
          <div className="absolute top-4 right-4 bg-orange-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm">
            Enhanced experience unavailable
          </div>
        )}
      </div>
    </div>
  );
}