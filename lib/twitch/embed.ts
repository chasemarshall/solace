let twitchSDKPromise: Promise<any> | null = null;
let twitchSDK: any = null;

export async function loadTwitchSDK(): Promise<any> {
  if (typeof window === "undefined") return null;
  
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
    
    const cleanup = () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
    
    const handleLoad = () => {
      cleanup();
      // Give a small delay for the SDK to initialize
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
      }, 100);
    };
    
    const handleError = () => {
      cleanup();
      const error = new Error("Failed to load Twitch SDK");
      console.error(error);
      reject(error);
    };
    
    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);
    
    // Add to head
    document.head.appendChild(script);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (!twitchSDK) {
        cleanup();
        const error = new Error("Twitch SDK loading timeout");
        console.error(error);
        reject(error);
      }
    }, 10000);
  });
  
  try {
    const result = await twitchSDKPromise;
    return result;
  } catch (error) {
    // Reset promise on error so we can retry
    twitchSDKPromise = null;
    throw error;
  }
}
