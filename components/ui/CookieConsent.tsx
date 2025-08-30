"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const hasConsented = localStorage.getItem('cookie-consent');
    if (!hasConsented) {
      // Show banner after a short delay to not be jarring
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-surface/95 backdrop-blur-sm border border-white/10 rounded-xl p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white mb-2">
              Enhanced Twitch Experience
            </h3>
            <p className="text-xs text-text-muted mb-3 leading-relaxed">
              Allow third-party cookies to sync your Twitch login with the embedded player. 
              This lets you follow, subscribe, and interact without logging in again.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDecline}
                className="px-3 py-1.5 text-xs bg-transparent border border-white/20 text-text-muted hover:text-white hover:border-white/40 rounded transition-colors"
              >
                No thanks
              </button>
              <button
                onClick={handleAccept}
                className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition-colors"
              >
                Enable
              </button>
            </div>
          </div>
          <button
            onClick={handleDecline}
            className="text-text-muted hover:text-white p-1 -mt-1 -mr-1 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}