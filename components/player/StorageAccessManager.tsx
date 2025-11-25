"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useStorageListener } from "@/hooks/useStorageListener";
import { STORAGE_KEYS } from "@/lib/constants/storage";

interface StorageAccessState {
  consentGiven: boolean;
  accessGranted: boolean | null; // null = not attempted, true/false = result
  requestAccess: () => Promise<boolean>;
  resetAccess: () => void;
}

const StorageAccessContext = createContext<StorageAccessState | undefined>(undefined);

export function useStorageAccess() {
  const context = useContext(StorageAccessContext);
  if (!context) {
    throw new Error('useStorageAccess must be used within StorageAccessProvider');
  }
  return context;
}

export function StorageAccessProvider({ children }: { children: ReactNode }) {
  const [consentGiven, setConsentGiven] = useState(false);
  const [accessGranted, setAccessGranted] = useState<boolean | null>(null);

  // Check if user has given consent
  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEYS.COOKIE_CONSENT);
    setConsentGiven(consent === 'accepted');
  }, []);

  // Listen for consent changes using custom hook
  useStorageListener(
    STORAGE_KEYS.COOKIE_CONSENT,
    useCallback((newValue) => {
      setConsentGiven(newValue === 'accepted');
      if (newValue !== 'accepted') {
        setAccessGranted(null); // Reset access state if consent withdrawn
      }
    }, [])
  );

  const requestAccess = async (): Promise<boolean> => {
    // Only attempt if consent was given
    if (!consentGiven) {
      setAccessGranted(false);
      return false;
    }

    // Enhanced browser compatibility check
    if (typeof document === 'undefined') {
      setAccessGranted(false);
      return false;
    }

    // Check if Storage Access API is supported (Safari 11.1+, Chrome 78+, Arc)
    if (!('requestStorageAccess' in document)) {
      console.warn('Storage Access API not supported in this browser');
      setAccessGranted(false);
      return false;
    }

    try {
      // First check if we already have access (with fallback for older implementations)
      let hasAccess = false;
      if ('hasStorageAccess' in document && typeof document.hasStorageAccess === 'function') {
        hasAccess = await document.hasStorageAccess();
      }
      
      if (hasAccess) {
        setAccessGranted(true);
        return true;
      }

      // Request storage access with enhanced error handling
      await (document as any).requestStorageAccess();
      setAccessGranted(true);
      
      // Store success state
      localStorage.setItem('storage-access-granted', 'true');
      
      return true;
    } catch (error) {
      console.warn('Storage access request failed:', error);
      setAccessGranted(false);
      localStorage.setItem('storage-access-granted', 'false');
      return false;
    }
  };

  const resetAccess = () => {
    setAccessGranted(null);
    localStorage.removeItem('storage-access-granted');
  };

  return (
    <StorageAccessContext.Provider 
      value={{ 
        consentGiven, 
        accessGranted, 
        requestAccess, 
        resetAccess 
      }}
    >
      {children}
    </StorageAccessContext.Provider>
  );
}