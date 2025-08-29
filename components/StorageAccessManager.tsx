"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
    const consent = localStorage.getItem('cookie-consent');
    setConsentGiven(consent === 'accepted');
  }, []);

  // Listen for consent changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cookie-consent') {
        setConsentGiven(e.newValue === 'accepted');
        if (e.newValue !== 'accepted') {
          setAccessGranted(null); // Reset access state if consent withdrawn
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const requestAccess = async (): Promise<boolean> => {
    // Only attempt if consent was given
    if (!consentGiven) {
      setAccessGranted(false);
      return false;
    }

    // Check if Storage Access API is supported
    if (!document.requestStorageAccess) {
      console.warn('Storage Access API not supported in this browser');
      setAccessGranted(false);
      return false;
    }

    try {
      // First check if we already have access
      const hasAccess = await document.hasStorageAccess?.();
      if (hasAccess) {
        setAccessGranted(true);
        return true;
      }

      // Request storage access (must be called from user gesture)
      await document.requestStorageAccess();
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