"use client";

import { useState, useEffect } from "react";
import { User } from "lucide-react";

interface UserProfileProps {
  onAuthChange?: (isAuthenticated: boolean, authData?: any) => void;
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
          console.error('Failed to parse auth data:', e);
          setLoading(false);
        }
      } else if (hash.includes('auth_error=')) {
        const error = hash.split('auth_error=')[1];
        console.error('Authentication error:', decodeURIComponent(error));
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
            console.error('Failed to parse stored auth:', err);
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
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center overflow-hidden">
            {user.profile_image_url ? (
              <img
                src={user.profile_image_url}
                alt={user.display_name}
                className="w-8 h-8 object-cover"
              />
            ) : (
              <User className="w-4 h-4 text-white" />
            )}
          </div>
          <span className="text-sm font-medium text-white">{user.display_name}</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-text-muted hover:text-white transition-colors"
        >
          logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-surface hover:bg-white/5 transition-colors disabled:opacity-50"
    >
      <User className="w-4 h-4" />
      <span className="text-sm">{loading ? "connecting..." : "sign in"}</span>
    </button>
  );
}