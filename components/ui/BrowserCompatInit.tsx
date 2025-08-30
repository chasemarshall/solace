"use client";

import { useEffect } from "react";
import { initBrowserPolyfills, getBrowserClasses } from "@/lib/utils/browserCompat";

export default function BrowserCompatInit() {
  useEffect(() => {
    // Initialize polyfills and browser detection
    initBrowserPolyfills();
    
    // Add browser-specific classes to document
    const browserClasses = getBrowserClasses();
    if (browserClasses) {
      document.documentElement.className += ` ${browserClasses}`;
    }
    
    // Arc-specific optimizations
    if (browserClasses.includes('browser-arc')) {
      // Arc browser sometimes has issues with service workers
      console.log('Arc browser detected - applying optimizations');
      
      // Disable service worker registration in Arc if problematic
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          // Keep existing service workers but be more cautious with new ones
          console.log(`Found ${registrations.length} service workers`);
        });
      }
    }
  }, []);

  return null; // This component doesn't render anything
}