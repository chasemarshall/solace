"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { User, Settings, LogOut, Sun, Moon, Wifi } from "lucide-react";
import { PROXY_ENDPOINTS } from "@/lib/twitch/proxyConfig";

interface UserProfileProps {
  onAuthChange?: (isAuthenticated: boolean, authData?: any) => void;
}

function UserProfileDropdown({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showBadges, setShowBadges] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [bttvEnabled, setBttvEnabled] = useState(true);
  const [ffzEnabled, setFfzEnabled] = useState(true);
  const [seventvEnabled, setSeventvEnabled] = useState(true);
  const [selectedProxy, setSelectedProxy] = useState<string>('auto');
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Load preferences
    const savedShowBadges = localStorage.getItem('chat_show_badges');
    const savedTheme = localStorage.getItem('theme');
    const savedBttv = localStorage.getItem('emotes_bttv');
    const savedFfz = localStorage.getItem('emotes_ffz');
    const savedSeventv = localStorage.getItem('emotes_7tv');
    const savedProxy = localStorage.getItem('proxy_selection');

    setShowBadges(savedShowBadges !== 'false');
    setIsDarkMode(savedTheme !== 'light');
    setBttvEnabled(savedBttv !== 'false');
    setFfzEnabled(savedFfz !== 'false');
    setSeventvEnabled(savedSeventv !== 'false');
    setSelectedProxy(savedProxy || 'auto');
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

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('theme', newTheme);
    
    // Apply theme to document
    if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  };

  const toggleBttv = () => {
    const newEnabled = !bttvEnabled;
    setBttvEnabled(newEnabled);
    localStorage.setItem('emotes_bttv', newEnabled.toString());
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'emotes_bttv',
      newValue: newEnabled.toString(),
    }));
  };

  const toggleFfz = () => {
    const newEnabled = !ffzEnabled;
    setFfzEnabled(newEnabled);
    localStorage.setItem('emotes_ffz', newEnabled.toString());
    
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'emotes_ffz',
      newValue: newEnabled.toString(),
    }));
  };

  const toggleSeventv = () => {
    const newEnabled = !seventvEnabled;
    setSeventvEnabled(newEnabled);
    localStorage.setItem('emotes_7tv', newEnabled.toString());

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'emotes_7tv',
      newValue: newEnabled.toString(),
    }));
  };

  const handleProxyChange = (proxyId: string) => {
    setSelectedProxy(proxyId);
    localStorage.setItem('proxy_selection', proxyId);

    // Trigger storage event for other components
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'proxy_selection',
      newValue: proxyId,
    }));
  };

  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  };

  const handleToggleDropdown = () => {
    if (!isOpen) {
      updateDropdownPosition();
    }
    setIsOpen(!isOpen);
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
        ref={buttonRef}
        onClick={handleToggleDropdown}
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

      {isOpen && dropdownPosition && mounted && createPortal(
        <div 
          className="fixed w-56 bg-surface border border-white/10 rounded-lg shadow-lg backdrop-blur-sm max-h-96 overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
            zIndex: 2147483647, // Maximum safe z-index value
            position: 'fixed',
            isolation: 'isolate',
          }}
          ref={dropdownRef}
        >
          <div className="py-1">
            <div className="px-3 py-2 border-b border-white/10">
              <div className="text-sm font-medium text-white">{user.display_name}</div>
              <div className="text-xs text-text-muted">Twitch User</div>
            </div>
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/5 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {isDarkMode ? 'Dark Mode' : 'Light Mode'}
              </span>
              <div className={`w-4 h-4 rounded border ${isDarkMode ? 'bg-purple-600 border-purple-600' : 'border-white/30'} flex items-center justify-center`}>
                {isDarkMode && (
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>

            {/* Chat Settings */}
            <div className="px-3 py-1 text-xs text-text-muted font-medium border-b border-white/5">
              Chat Settings
            </div>
            
            <button
              onClick={toggleBadges}
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/5 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Show Badges
              </span>
              <div className={`w-4 h-4 rounded border ${showBadges ? 'bg-purple-600 border-purple-600' : 'border-white/30'} flex items-center justify-center`}>
                {showBadges && (
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>

            {/* Emote Settings */}
            <div className="px-3 py-1 text-xs text-text-muted font-medium border-b border-white/5">
              Emote Providers
            </div>
            
            <button
              onClick={toggleBttv}
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/5 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 bg-green-500 rounded text-xs font-bold flex items-center justify-center text-black">B</span>
                BTTV Emotes
              </span>
              <div className={`w-4 h-4 rounded border ${bttvEnabled ? 'bg-purple-600 border-purple-600' : 'border-white/30'} flex items-center justify-center`}>
                {bttvEnabled && (
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
            
            <button
              onClick={toggleFfz}
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/5 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 bg-blue-500 rounded text-xs font-bold flex items-center justify-center text-white">F</span>
                FFZ Emotes
              </span>
              <div className={`w-4 h-4 rounded border ${ffzEnabled ? 'bg-purple-600 border-purple-600' : 'border-white/30'} flex items-center justify-center`}>
                {ffzEnabled && (
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
            
            <button
              onClick={toggleSeventv}
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/5 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 bg-purple-500 rounded text-xs font-bold flex items-center justify-center text-white">7</span>
                7TV Emotes
              </span>
              <div className={`w-4 h-4 rounded border ${seventvEnabled ? 'bg-purple-600 border-purple-600' : 'border-white/30'} flex items-center justify-center`}>
                {seventvEnabled && (
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>

            {/* Proxy Settings */}
            <div className="px-3 py-1 text-xs text-text-muted font-medium border-b border-white/5 mt-1">
              Stream Proxy
            </div>

            <div className="px-3 py-2">
              <select
                value={selectedProxy}
                onChange={(e) => handleProxyChange(e.target.value)}
                className="w-full bg-black/40 text-white text-sm px-3 py-2 rounded border border-white/20 hover:border-white/40 focus:border-purple-500 focus:outline-none cursor-pointer"
              >
                <option value="auto">Auto (Recommended)</option>
                {PROXY_ENDPOINTS.map((proxy) => (
                  <option key={proxy.name} value={proxy.name}>
                    {proxy.name} - {proxy.region}
                  </option>
                ))}
              </select>
              <div className="text-xs text-text-muted mt-2 opacity-75">
                <Wifi className="w-3 h-3 inline mr-1" />
                {selectedProxy === 'auto' ? 'Automatically selects fastest proxy' : 'Using selected proxy with auto-fallback'}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 border-t border-white/10 mt-1"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>,
        document.body
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
    // SECURITY: Check for auth data from secure cookie-based OAuth callback
    const handleAuthCallback = () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('auth') === 'success') {
        // Read user data from cookie (tokens are in HTTP-only cookie)
        const userCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('twitch_user='));
        
        if (userCookie) {
          try {
            const cookieValue = decodeURIComponent(userCookie.split('=')[1]);
            const decodedAuthData = JSON.parse(cookieValue);
            setAuthData(decodedAuthData);
            onAuthChange?.(true, decodedAuthData);
            localStorage.setItem('twitch_auth', JSON.stringify(decodedAuthData));
            
            // Store basic user info for chat (tokens are server-side only now)
            localStorage.setItem('twitch_username', decodedAuthData.user.login);
            
            // Fetch chat token from secure API endpoint
            fetch('/api/auth/chat-token')
              .then(res => res.json())
              .then(data => {
                console.log('Chat token response:', data);
                if (data.oauth) {
                  localStorage.setItem('twitch_oauth', data.oauth);
                  console.log('Chat token stored successfully');
                }
              })
              .catch(err => console.error('Failed to fetch chat token:', err));
            
            // Clean up URL
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('auth');
            window.history.replaceState({}, document.title, newUrl.toString());
            setLoading(false);
          } catch (e) {
            console.error('Failed to parse secure auth data');
            setLoading(false);
          }
        }
      } else if (urlParams.get('auth_error')) {
        const error = urlParams.get('auth_error');
        console.error('Authentication error:', error);
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
          
          // Fetch chat token from secure API endpoint
          fetch('/api/auth/chat-token')
            .then(res => res.json())
            .then(data => {
              console.log('Chat token response (stored auth):', data);
              if (data.oauth) {
                localStorage.setItem('twitch_oauth', data.oauth);
                console.log('Chat token stored successfully (stored auth)');
              }
            })
            .catch(err => console.error('Failed to fetch chat token (stored auth):', err));
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