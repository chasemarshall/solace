"use client";

import { useState, useEffect } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { STORAGE_KEYS } from "@/lib/constants/storage";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const hasConsented = localStorage.getItem(STORAGE_KEYS.COOKIE_CONSENT);
    if (!hasConsented) {
      // Show banner after a short delay to not be jarring
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEYS.COOKIE_CONSENT, 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(STORAGE_KEYS.COOKIE_CONSENT, 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-surface/95 backdrop-blur-sm border border-white/10 rounded-xl p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white mb-2">
              Cookie & Data Usage
            </h3>
            <p className="text-xs text-text-muted mb-2 leading-relaxed">
              We use cookies and store data via Prisma to enhance your Twitch experience.
            </p>

            {/* Expandable Details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 mb-3 transition-colors"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Hide details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  View more
                </>
              )}
            </button>

            {showDetails && (
              <div className="mb-3 p-2 bg-black/20 rounded text-xs text-text-muted border border-white/5">
                <p className="font-semibold text-white mb-1.5">What we store in our database:</p>
                <ul className="space-y-1 ml-3 list-disc">
                  <li><strong>User Profile:</strong> Twitch ID, username, display name, email, avatar</li>
                  <li><strong>Favorites:</strong> Channels you&apos;ve favorited</li>
                  <li><strong>Follows:</strong> Channels you follow, last live timestamps</li>
                  <li><strong>Preferences:</strong> Player proxy selection, chat font size, timestamp visibility</li>
                </ul>
                <p className="mt-2 text-[11px] leading-relaxed">
                  Third-party cookies sync your Twitch login with the embedded player so you can interact without logging in again.
                </p>
              </div>
            )}

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
                Accept
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