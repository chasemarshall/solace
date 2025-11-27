"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { User, Settings, LogOut, Sun, Moon, Wifi } from "lucide-react";
import { PROXY_ENDPOINTS } from "@/lib/twitch/proxyConfig";
import { STORAGE_KEYS } from "@/lib/constants/storage";

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
  const [useNativePlayer, setUseNativePlayer] = useState(true);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Load preferences
    const savedShowBadges = localStorage.getItem(STORAGE_KEYS.CHAT_SHOW_BADGES);
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    const savedBttv = localStorage.getItem(STORAGE_KEYS.EMOTES_BTTV);
    const savedFfz = localStorage.getItem(STORAGE_KEYS.EMOTES_FFZ);
    const savedSeventv = localStorage.getItem(STORAGE_KEYS.EMOTES_7TV);
    const savedProxy = localStorage.getItem(STORAGE_KEYS.PROXY_SELECTION);
    const savedNativePlayer = localStorage.getItem(STORAGE_KEYS.DISABLE_NATIVE_PLAYER);

    setShowBadges(savedShowBadges !== 'false');
    setIsDarkMode(savedTheme !== 'light');
    setBttvEnabled(savedBttv !== 'false');
    setFfzEnabled(savedFfz !== 'false');
    setSeventvEnabled(savedSeventv !== 'false');
    setUseNativePlayer(savedNativePlayer !== 'true'); // Inverted logic: disable_native_player

    // Default to iframe player if no preference set
    if (!savedProxy) {
      localStorage.setItem(STORAGE_KEYS.PROXY_SELECTION, 'iframe');
      setSelectedProxy('iframe');
    } else {
      setSelectedProxy(savedProxy);
    }
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
    localStorage.setItem(STORAGE_KEYS.CHAT_SHOW_BADGES, newShowBadges.toString());

    // Trigger storage event for other components
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEYS.CHAT_SHOW_BADGES,
      newValue: newShowBadges.toString(),
    }));
  };

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    
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
    localStorage.setItem(STORAGE_KEYS.EMOTES_BTTV, newEnabled.toString());

    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEYS.EMOTES_BTTV,
      newValue: newEnabled.toString(),
    }));
  };

  const toggleFfz = () => {
    const newEnabled = !ffzEnabled;
    setFfzEnabled(newEnabled);
    localStorage.setItem(STORAGE_KEYS.EMOTES_FFZ, newEnabled.toString());

    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEYS.EMOTES_FFZ,
      newValue: newEnabled.toString(),
    }));
  };

  const toggleSeventv = () => {
    const newEnabled = !seventvEnabled;
    setSeventvEnabled(newEnabled);
    localStorage.setItem(STORAGE_KEYS.EMOTES_7TV, newEnabled.toString());

    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEYS.EMOTES_7TV,
      newValue: newEnabled.toString(),
    }));
  };

  const handleProxyChange = (proxyId: string) => {
    setSelectedProxy(proxyId);
    localStorage.setItem(STORAGE_KEYS.PROXY_SELECTION, proxyId);

    // Trigger storage event for other components
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEYS.PROXY_SELECTION,
      newValue: proxyId,
    }));
  };

  const toggleNativePlayer = () => {
    const newEnabled = !useNativePlayer;
    setUseNativePlayer(newEnabled);
    // Inverted logic: store "disable_native_player"
    localStorage.setItem(STORAGE_KEYS.DISABLE_NATIVE_PLAYER, (!newEnabled).toString());

    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEYS.DISABLE_NATIVE_PLAYER,
      newValue: (!newEnabled).toString(),
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
          className="fixed w-56 bg-surface border border-white/10 rounded-xl shadow-lg backdrop-blur-sm max-h-96 overflow-y-auto"
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
                <option value="iframe">Default Twitch Player (iframe)</option>
                <option value="auto">Auto Proxy (Ad-Free)</option>
                {PROXY_ENDPOINTS.map((proxy) => (
                  <option key={proxy.name} value={proxy.name}>
                    {proxy.name} - {proxy.region}
                  </option>
                ))}
              </select>
              <div className="text-xs text-text-muted mt-2 opacity-75">
                <Wifi className="w-3 h-3 inline mr-1" />
                {selectedProxy === 'iframe'
                  ? 'Using standard Twitch player (with ads)'
                  : selectedProxy === 'auto'
                    ? 'Automatically selects fastest ad-free proxy'
                    : 'Using selected proxy with auto-fallback'}
              </div>
            </div>

            {/* Native Player Toggle (Safari only) */}
            {selectedProxy !== 'iframe' && (
              <button
                onClick={toggleNativePlayer}
                className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/5 flex items-center justify-between border-t border-white/5"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                  Native Player (Safari)
                </span>
                <div className={`w-4 h-4 rounded border ${useNativePlayer ? 'bg-purple-600 border-purple-600' : 'border-white/30'} flex items-center justify-center`}>
                  {useNativePlayer && (
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            )}
            {selectedProxy !== 'iframe' && (
              <div className="px-3 py-2 text-xs text-text-muted opacity-75">
                {useNativePlayer
                  ? '⚡ Optimized for Safari/macOS (better performance)'
                  : '🎛️ Using HLS.js player (manual quality control)'}
              </div>
            )}

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

  const syncSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', { credentials: 'include' });

      if (!response.ok) {
        if (response.status === 401) {
          setAuthData(null);
          onAuthChange?.(false);
          localStorage.removeItem(STORAGE_KEYS.TWITCH_AUTH);
          localStorage.removeItem(STORAGE_KEYS.TWITCH_USERNAME);
          localStorage.removeItem(STORAGE_KEYS.TWITCH_OAUTH);
        }
        return false;
      }

      const session = await response.json();
      setAuthData(session);
      onAuthChange?.(true, session);

      localStorage.setItem(STORAGE_KEYS.TWITCH_AUTH, JSON.stringify(session));
      localStorage.setItem(STORAGE_KEYS.TWITCH_USERNAME, session.user.login);

      try {
        const chatResponse = await fetch('/api/auth/chat-token');
        if (chatResponse.ok) {
          const chatData = await chatResponse.json();
          if (chatData.oauth) {
            localStorage.setItem(STORAGE_KEYS.TWITCH_OAUTH, chatData.oauth);
          }
        }
      } catch (chatError) {
        console.error('Failed to fetch chat token:', chatError);
      }

      return true;
    } catch (error) {
      console.error('Failed to sync auth session:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [onAuthChange]);

  const handleLogin = () => {
    setLoading(true);
    window.location.href = '/api/auth/twitch';
  };

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(error => {
      console.error('Logout failed', error);
    });

    setAuthData(null);
    onAuthChange?.(false);
    localStorage.removeItem(STORAGE_KEYS.TWITCH_AUTH);
    localStorage.removeItem(STORAGE_KEYS.TWITCH_USERNAME);
    localStorage.removeItem(STORAGE_KEYS.TWITCH_OAUTH);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const hadAuthSuccess = params.get('auth') === 'success';
    const authError = params.get('auth_error');

    const updateUrl = () => {
      const paramString = params.toString();
      const nextUrl = `${window.location.pathname}${paramString ? `?${paramString}` : ''}${window.location.hash}`;
      window.history.replaceState({}, document.title, nextUrl);
    };

    if (authError) {
      console.error('Authentication error:', authError);
      params.delete('auth_error');
      updateUrl();
    }

    if (hadAuthSuccess) {
      params.delete('auth');
      syncSession().finally(updateUrl);
    } else {
      syncSession();
    }
  }, [syncSession]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.TWITCH_AUTH) {
        if (event.newValue) {
          try {
            const parsedAuth = JSON.parse(event.newValue);
            setAuthData(parsedAuth);
            onAuthChange?.(true, parsedAuth);
          } catch {
            // ignore malformed payloads
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
      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-surface hover:bg-white/5 transition-colors disabled:opacity-50"
    >
      <User className="w-4 h-4" />
      <span className="text-sm">{loading ? "connecting..." : "sign in"}</span>
    </button>
  );
}
