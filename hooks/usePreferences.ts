"use client";

import { useState, useEffect, useCallback } from 'react';

interface UserPreferences {
  proxySelection?: string;
  chatFontSize?: number;
  showTimestamps?: boolean;
}

const PROXY_SELECTION_KEY = 'proxy_selection';

// Helper to get localStorage preferences (for migration/fallback)
const getPreferencesFromStorage = (): UserPreferences => {
  if (typeof window === 'undefined') return {};
  try {
    const proxySelection = localStorage.getItem(PROXY_SELECTION_KEY);
    return {
      proxySelection: proxySelection || undefined,
    };
  } catch (error) {
    console.error('Error loading preferences from localStorage:', error);
  }
  return {};
};

// Helper to migrate localStorage preferences to database
const migratePreferencesToDatabase = async (localPrefs: UserPreferences) => {
  if (!localPrefs.proxySelection) return;

  try {
    await fetch('/api/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localPrefs),
    });

    // Clear localStorage after successful migration
    if (localPrefs.proxySelection) {
      localStorage.removeItem(PROXY_SELECTION_KEY);
    }
  } catch (error) {
    console.error('Failed to migrate preferences:', error);
  }
};

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from database on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        // First, check for localStorage preferences to migrate
        const localPrefs = getPreferencesFromStorage();
        if (localPrefs.proxySelection) {
          await migratePreferencesToDatabase(localPrefs);
        }

        // Fetch from database
        const response = await fetch('/api/preferences');
        if (response.ok) {
          const data = await response.json();
          setPreferences(data.preferences || {});
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
        // Fallback to localStorage if API fails
        setPreferences(getPreferencesFromStorage());
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    // Optimistic update
    setPreferences(prev => ({ ...prev, ...updates }));

    try {
      const response = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences || {});
    } catch (error) {
      console.error('Error updating preferences:', error);
      // Could revert optimistic update here if needed
    }
  }, []);

  return {
    preferences,
    isLoading,
    updatePreferences,
  };
}
