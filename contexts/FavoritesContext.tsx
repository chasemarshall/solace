"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface FavoritesContextType {
  favorites: Set<string>;
  addFavorite: (channelLogin: string) => Promise<void>;
  removeFavorite: (channelLogin: string) => Promise<void>;
  isFavorite: (channelLogin: string) => boolean;
  toggleFavorite: (channelLogin: string) => Promise<void>;
  isLoading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const FAVORITES_STORAGE_KEY = 'twitch-favorites';

// Helper to get localStorage favorites (for migration/fallback)
const getFavoritesFromStorage = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
};

// Helper to migrate localStorage favorites to database
const migrateFavoritesToDatabase = async (localFavorites: Set<string>) => {
  if (localFavorites.size === 0) return;

  try {
    // Add all local favorites to database
    await Promise.all(
      Array.from(localFavorites).map(channelLogin =>
        fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelLogin }),
        })
      )
    );

    // Clear localStorage after successful migration
    localStorage.removeItem(FAVORITES_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to migrate favorites:', error);
  }
};

interface FavoritesProviderProps {
  children: ReactNode;
}

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Initialize favorites from database
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        // First, check for localStorage favorites to migrate
        const localFavorites = getFavoritesFromStorage();
        if (localFavorites.size > 0) {
          await migrateFavoritesToDatabase(localFavorites);
        }

        // Fetch from database
        const response = await fetch('/api/favorites');
        if (!response.ok) {
          throw new Error(`Failed to fetch favorites: ${response.status}`);
        }
        const data = await response.json();
        setFavorites(new Set(data.favorites || []));
      } catch (error) {
        console.error('Failed to load favorites:', error);
        // Fallback to localStorage if API fails
        setFavorites(getFavoritesFromStorage());
      } finally {
        setIsLoading(false);
      }
    };

    loadFavorites();
  }, []);

  const addFavorite = async (channelLogin: string) => {
    const normalizedLogin = channelLogin.toLowerCase();

    // Optimistic update
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      newFavorites.add(normalizedLogin);
      return newFavorites;
    });

    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelLogin: normalizedLogin }),
      });

      if (!response.ok) {
        throw new Error('Failed to add favorite');
      }
    } catch (error) {
      console.error('Error adding favorite:', error);
      // Fallback to localStorage when API fails
      try {
        const currentFavorites = getFavoritesFromStorage();
        currentFavorites.add(normalizedLogin);
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...currentFavorites]));
        console.log('Favorite saved to localStorage as fallback');
      } catch (storageError) {
        console.error('Failed to save to localStorage:', storageError);
        // Only revert if both API and localStorage fail
        setFavorites(prev => {
          const newFavorites = new Set(prev);
          newFavorites.delete(normalizedLogin);
          return newFavorites;
        });
      }
    }
  };

  const removeFavorite = async (channelLogin: string) => {
    const normalizedLogin = channelLogin.toLowerCase();

    // Optimistic update
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      newFavorites.delete(normalizedLogin);
      return newFavorites;
    });

    try {
      const response = await fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelLogin: normalizedLogin }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove favorite');
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
      // Fallback to localStorage when API fails
      try {
        const currentFavorites = getFavoritesFromStorage();
        currentFavorites.delete(normalizedLogin);
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...currentFavorites]));
        console.log('Favorite removed from localStorage as fallback');
      } catch (storageError) {
        console.error('Failed to save to localStorage:', storageError);
        // Only revert if both API and localStorage fail
        setFavorites(prev => {
          const newFavorites = new Set(prev);
          newFavorites.add(normalizedLogin);
          return newFavorites;
        });
      }
    }
  };

  const isFavorite = (channelLogin: string): boolean => {
    return favorites.has(channelLogin.toLowerCase());
  };

  const toggleFavorite = async (channelLogin: string) => {
    if (isFavorite(channelLogin)) {
      await removeFavorite(channelLogin);
    } else {
      await addFavorite(channelLogin);
    }
  };

  const value: FavoritesContextType = {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    isLoading,
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