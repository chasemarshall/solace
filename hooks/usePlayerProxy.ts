import { useState, useEffect, useCallback } from 'react';
import { useStorageListener } from '@/hooks/useStorageListener';
import { STORAGE_KEYS } from '@/lib/constants/storage';
import type { ProxyEndpoint } from '@/lib/twitch/proxyConfig';

/**
 * Shared hook for managing player proxy selection and state
 *
 * This hook encapsulates the common logic used by both TtvLolPlayer and SafariNativePlayer
 * for handling proxy selection, loading states, and errors.
 */
export function usePlayerProxy(channel: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentProxy, setCurrentProxy] = useState<ProxyEndpoint | null>(null);
  const [preferredProxy, setPreferredProxy] = useState<string>('auto');
  const [failoverAttempts, setFailoverAttempts] = useState(0);

  // Load proxy preference from localStorage on mount
  useEffect(() => {
    const savedProxy = localStorage.getItem(STORAGE_KEYS.PROXY_SELECTION);
    if (savedProxy) {
      setPreferredProxy(savedProxy);
    }
  }, []);

  // Listen for changes to proxy selection using custom hook
  useStorageListener(
    STORAGE_KEYS.PROXY_SELECTION,
    useCallback((newValue) => {
      if (newValue) {
        setPreferredProxy(newValue);
      }
    }, [])
  );

  return {
    // State
    isLoading,
    loadError,
    currentProxy,
    preferredProxy,
    failoverAttempts,

    // Setters
    setIsLoading,
    setLoadError,
    setCurrentProxy,
    setFailoverAttempts,
  };
}
