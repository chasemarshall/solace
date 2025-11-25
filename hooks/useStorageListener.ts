import { useEffect } from 'react';

/**
 * Custom hook to listen for localStorage changes across tabs/windows
 *
 * @param key - The localStorage key to listen for
 * @param callback - Function to call when the value changes
 *
 * @example
 * useStorageListener('theme', (newValue) => {
 *   setTheme(newValue || 'light');
 * });
 */
export function useStorageListener(
  key: string,
  callback: (newValue: string | null) => void
) {
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        callback(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, callback]);
}

/**
 * Custom hook to listen for multiple localStorage keys
 *
 * @param listeners - Object mapping keys to callback functions
 *
 * @example
 * useStorageListeners({
 *   'theme': (value) => setTheme(value || 'light'),
 *   'language': (value) => setLanguage(value || 'en'),
 * });
 */
export function useStorageListeners(
  listeners: Record<string, (newValue: string | null) => void>
) {
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && listeners[e.key]) {
        listeners[e.key](e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [listeners]);
}
