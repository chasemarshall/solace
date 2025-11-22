"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface FavoritesContextType {
  favorites: Set<string>;
  addFavorite: (channelLogin: string) => void;
  removeFavorite: (channelLogin: string) => void;
  isFavorite: (channelLogin: string) => boolean;
  toggleFavorite: (channelLogin: string) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const FAVORITES_STORAGE_KEY = 'twitch-favorites';

const getFavoritesFromStorage = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
};

const saveFavoritesToStorage = (favorites: Set<string>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favorites]));
  } catch (e) {
    console.error('Failed to save favorites:', e);
  }
};

interface FavoritesProviderProps {
  children: ReactNode;
}

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Initialize favorites from localStorage
  useEffect(() => {
    setFavorites(getFavoritesFromStorage());
  }, []);

  // Listen for storage changes (from other tabs/windows)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === FAVORITES_STORAGE_KEY) {
        setFavorites(getFavoritesFromStorage());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addFavorite = (channelLogin: string) => {
    const normalizedLogin = channelLogin.toLowerCase();
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      newFavorites.add(normalizedLogin);
      saveFavoritesToStorage(newFavorites);
      return newFavorites;
    });
  };

  const removeFavorite = (channelLogin: string) => {
    const normalizedLogin = channelLogin.toLowerCase();
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      newFavorites.delete(normalizedLogin);
      saveFavoritesToStorage(newFavorites);
      return newFavorites;
    });
  };

  const isFavorite = (channelLogin: string): boolean => {
    return favorites.has(channelLogin.toLowerCase());
  };

  const toggleFavorite = (channelLogin: string) => {
    if (isFavorite(channelLogin)) {
      removeFavorite(channelLogin);
    } else {
      addFavorite(channelLogin);
    }
  };

  const value: FavoritesContextType = {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}