let twitchSDKPromise: Promise<any> | null = null;
let twitchSDK: any = null;
let loadAttempts = 0;
const MAX_ATTEMPTS = 3;

export async function loadTwitchSDK(): Promise<any> {
  if (typeof window === "undefined") {
    throw new Error("Twitch SDK can only be loaded in browser environment");
  }
  
  // Return cached SDK if available
  if (twitchSDK) {
    return twitchSDK;
  }
  
  // Return existing promise if loading is in progress
  if (twitchSDKPromise) {
    return await twitchSDKPromise;
  }
  
  // Check if SDK is already loaded
  if ((window as any).Twitch) {
    twitchSDK = (window as any).Twitch;
    return twitchSDK;
  }
  
  // Start loading the SDK
  twitchSDKPromise = new Promise<any>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://embed.twitch.tv/embed/v1.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    
    let timeoutId: NodeJS.Timeout;
    let isResolved = false;
    
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
    
    const handleLoad = () => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      
      // Give the SDK time to initialize
      setTimeout(() => {
        if ((window as any).Twitch) {
          twitchSDK = (window as any).Twitch;
          console.log("Twitch SDK loaded successfully");
          resolve(twitchSDK);
        } else {
          const error = new Error("Twitch SDK loaded but not available on window");
          console.error(error);
          reject(error);
        }
      }, 200);
    };
    
    const handleError = (event: Event) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      
      const error = new Error(`Failed to load Twitch SDK: ${event.type}`);
      console.error(error);
      reject(error);
    };
    
    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);
    
    // Add to head
    document.head.appendChild(script);
    
    // Timeout after 15 seconds
    timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        const error = new Error("Twitch SDK loading timeout");
        console.error(error);
        reject(error);
      }
    }, 15000);
  });
  
  try {
    const result = await twitchSDKPromise;
    loadAttempts = 0; // Reset attempts on success
    return result;
  } catch (error) {
    // Reset promise on error so we can retry
    twitchSDKPromise = null;
    loadAttempts++;
    
    if (loadAttempts < MAX_ATTEMPTS) {
      console.log(`Twitch SDK load attempt ${loadAttempts} failed, retrying...`);
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * loadAttempts));
      return loadTwitchSDK();
    } else {
      console.error(`Twitch SDK failed to load after ${MAX_ATTEMPTS} attempts`);
      throw error;
    }
  }
}

// Function to reset the SDK state (useful for testing or manual reloads)
export function resetTwitchSDK() {
  twitchSDK = null;
  twitchSDKPromise = null;
  loadAttempts = 0;
}
