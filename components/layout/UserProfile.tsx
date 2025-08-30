"use client";

import { useState, useEffect, useRef } from "react";
import { User, Settings, LogOut } from "lucide-react";

interface UserProfileProps {
  onAuthChange?: (isAuthenticated: boolean, authData?: any) => void;
}

function UserProfileDropdown({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showBadges, setShowBadges] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load badge visibility preference
    const savedShowBadges = localStorage.getItem('chat_show_badges');
    setShowBadges(savedShowBadges !== 'false');
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleBadges = () => {
    const newShowBadges = !showBadges;
    setShowBadges(newShowBadges);
    localStorage.setItem('chat_show_badges', newShowBadges.toString());
    
    // Trigger storage event for other components
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'chat_show_badges',
      newValue: newShowBadges.toString(),
    }));
  };

  const handleLogout = () => {
    if (confirm(`Logout from ${user.display_name}?`)) {
      onLogout();
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full overflow-hidden hover:ring-2 hover:ring-purple-500/50 transition-all duration-200 flex items-center justify-center"
        title={user.display_name}
      >
        {user.profile_image_url ? (
          <img
            src={user.profile_image_url}
            alt={user.display_name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <User className="w-5 h-5 text-white" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-surface border border-white/10 rounded-lg shadow-lg backdrop-blur-sm z-[9999]">
          <div className="py-1">
            <div className="px-3 py-2 border-b border-white/10">
              <div className="text-sm font-medium text-white">{user.display_name}</div>
              <div className="text-xs text-text-muted">Twitch User</div>
            </div>
            
            <button
              onClick={toggleBadges}
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/5 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Show Chat Badges
              </span>
              <div className={`w-4 h-4 rounded border ${showBadges ? 'bg-purple-600 border-purple-600' : 'border-white/30'} flex items-center justify-center`}>
                {showBadges && (
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function UserProfile({ onAuthChange }: UserProfileProps) {
  const [authData, setAuthData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    // Redirect to Twitch OAuth
    window.location.href = '/api/auth/twitch';
  };

  const handleLogout = () => {
    setAuthData(null);
    onAuthChange?.(false);
    localStorage.removeItem('twitch_auth');
    // Clear any chat tokens
    localStorage.removeItem('twitch_username');
    localStorage.removeItem('twitch_oauth');
  };

  useEffect(() => {
    // Check for auth data from OAuth callback (in URL hash)
    const handleAuthCallback = () => {
      const hash = window.location.hash;
      if (hash.includes('auth_success=')) {
        const authDataString = hash.split('auth_success=')[1];
        try {
          const decodedAuthData = JSON.parse(decodeURIComponent(authDataString));
          setAuthData(decodedAuthData);
          onAuthChange?.(true, decodedAuthData);
          localStorage.setItem('twitch_auth', JSON.stringify(decodedAuthData));
          
          // Store chat credentials for TMI
          localStorage.setItem('twitch_username', decodedAuthData.user.login);
          localStorage.setItem('twitch_oauth', `oauth:${decodedAuthData.tokens.access_token}`);
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
          setLoading(false);
        } catch (e) {
          setLoading(false);
        }
      } else if (hash.includes('auth_error=')) {
        const error = hash.split('auth_error=')[1];
        // Authentication error
        setLoading(false);
      }
    };

    // Check for stored auth data
    const storedAuth = localStorage.getItem('twitch_auth');
    if (storedAuth) {
      try {
        const parsedAuth = JSON.parse(storedAuth);
        // Check if token is expired
        if (parsedAuth.expires_at && Date.now() < parsedAuth.expires_at) {
          setAuthData(parsedAuth);
          onAuthChange?.(true, parsedAuth);
          // Set chat credentials
          localStorage.setItem('twitch_username', parsedAuth.user.login);
          localStorage.setItem('twitch_oauth', `oauth:${parsedAuth.tokens.access_token}`);
        } else {
          // Token expired, clear it
          localStorage.removeItem('twitch_auth');
        }
      } catch (e) {
        localStorage.removeItem('twitch_auth');
      }
    }

    // Handle OAuth callback
    handleAuthCallback();
    
    // Listen for storage changes (auth in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'twitch_auth') {
        if (e.newValue) {
          try {
            const parsedAuth = JSON.parse(e.newValue);
            setAuthData(parsedAuth);
            onAuthChange?.(true, parsedAuth);
          } catch (err) {
            // Failed to parse stored auth
          }
        } else {
          setAuthData(null);
          onAuthChange?.(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [onAuthChange]);

  if (authData) {
    const user = authData.user;
    return <UserProfileDropdown user={user} onLogout={handleLogout} />;
  }

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-surface hover:bg-white/5 transition-colors disabled:opacity-50"
    >
      <User className="w-4 h-4" />
      <span className="text-sm">{loading ? "connecting..." : "sign in"}</span>
    </button>
  );
}