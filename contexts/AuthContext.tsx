"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { STORAGE_KEYS } from '@/lib/constants/storage';

export interface AuthUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url?: string | null;
}

export interface AuthData {
  user: AuthUser;
  expires_at: number;
}

interface AuthContextType {
  authData: AuthData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  syncSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', { credentials: 'include' });

      if (!response.ok) {
        if (response.status === 401) {
          setAuthData(null);
          localStorage.removeItem(STORAGE_KEYS.TWITCH_AUTH);
          localStorage.removeItem(STORAGE_KEYS.TWITCH_USERNAME);
          localStorage.removeItem(STORAGE_KEYS.TWITCH_OAUTH);
        }
        return false;
      }

      const session = await response.json();
      setAuthData(session);

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
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(() => {
    setIsLoading(true);
    window.location.href = '/api/auth/twitch';
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed', error);
    }

    setAuthData(null);
    localStorage.removeItem(STORAGE_KEYS.TWITCH_AUTH);
    localStorage.removeItem(STORAGE_KEYS.TWITCH_USERNAME);
    localStorage.removeItem(STORAGE_KEYS.TWITCH_OAUTH);
  }, []);

  // Initialize session on mount
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

  // Listen for storage changes (multi-tab sync)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.TWITCH_AUTH) {
        if (event.newValue) {
          try {
            const parsedAuth = JSON.parse(event.newValue);
            setAuthData(parsedAuth);
          } catch {
            // ignore malformed payloads
          }
        } else {
          setAuthData(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value: AuthContextType = {
    authData,
    isAuthenticated: !!authData,
    isLoading,
    login,
    logout,
    syncSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
