let twitchSDKPromise: Promise<any> | null = null;
let twitchSDK: any = null;
let loadAttempts = 0;
const MAX_ATTEMPTS = 3;

// Enhanced SDK loading with proxy support
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
  
  // Start loading the SDK via proxy
  twitchSDKPromise = new Promise<any>((resolve, reject) => {
    const script = document.createElement("script");
    // Use proxy instead of direct Twitch URL
    const proxyUrl = `/api/proxy?url=${encodeURIComponent('https://embed.twitch.tv/embed/v1.js')}`;
    script.src = proxyUrl;
    script.async = true;
    script.id = "twitch-embed-script";
    
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
      
      // Give the SDK time to initialize and check multiple times
      const checkSDK = (attempts = 0) => {
        if ((window as any).Twitch) {
          twitchSDK = (window as any).Twitch;
          console.log("Twitch SDK loaded successfully via proxy");
          resolve(twitchSDK);
        } else if (attempts < 10) {
          // Retry checking for SDK up to 10 times with 100ms intervals
          setTimeout(() => checkSDK(attempts + 1), 100);
        } else {
          const error = new Error("Twitch SDK loaded but not available on window after multiple checks");
          console.error(error);
          reject(error);
        }
      };
      
      checkSDK();
    };
    
    const handleError = (event: Event) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      
      const error = new Error(`Failed to load Twitch SDK via proxy: ${event.type}`);
      console.error(error);
      reject(error);
    };
    
    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);
    
    // Enforce singleton - if script already exists, reuse the existing promise
    const existingScript = document.getElementById('twitch-embed-script');
    if (existingScript) {
      // Script already loading/loaded, wait for current promise
      cleanup();
      return twitchSDKPromise;
    }
    
    // Add to head
    document.head.appendChild(script);
    
    // Timeout after 20 seconds
    timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        const error = new Error("Twitch SDK loading timeout after 20 seconds");
        console.error(error);
        reject(error);
      }
    }, 20000);
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
      console.log(`Twitch SDK load attempt ${loadAttempts} failed, retrying in ${loadAttempts * 2} seconds...`);
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 2000 * loadAttempts));
      return loadTwitchSDK();
    } else {
      console.error(`Twitch SDK failed to load after ${loadAttempts} attempts:`, error);
      throw error;
    }
  }
}

// Enhanced embed creation with better error handling
export async function createTwitchEmbed(
  container: HTMLElement, 
  options: {
    channel: string;
    parent: string | string[];
    width?: string | number;
    height?: string | number;
    autoplay?: boolean;
    muted?: boolean;
    layout?: string;
    theme?: string;
  }
) {
  const Twitch = await loadTwitchSDK();
  
  if (!Twitch || !Twitch.Embed) {
    throw new Error("Twitch SDK not properly loaded");
  }
  
  // Normalize parent domains
  const parentDomains = Array.isArray(options.parent) 
    ? options.parent 
    : options.parent.split(",").map(p => p.trim()).filter(Boolean);
  
  // Add current domain and common variations
  const currentHost = window.location.hostname;
  const domainsToAdd = [currentHost, 'localhost', '127.0.0.1'];
  
  domainsToAdd.forEach(domain => {
    if (!parentDomains.includes(domain)) {
      parentDomains.push(domain);
    }
  });
  
  console.log("Creating Twitch embed with parent domains:", parentDomains);
  
  // Clear container
  container.innerHTML = '';
  
  try {
    const embed = new Twitch.Embed(container, {
      channel: options.channel.toLowerCase(),
      parent: parentDomains,
      width: options.width || "100%",
      height: options.height || "100%",
      autoplay: options.autoplay !== false,
      muted: options.muted !== false,
      layout: options.layout || "video",
      theme: options.theme || "dark"
    });
    
    return embed;
  } catch (error) {
    console.error("Failed to create Twitch embed:", error);
    throw new Error(`Failed to create Twitch embed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to reset the SDK state (useful for testing or manual reloads)
export function resetTwitchSDK() {
  twitchSDK = null;
  twitchSDKPromise = null;
  loadAttempts = 0;
  
  // Remove script from DOM
  const script = document.getElementById('twitch-embed-script');
  if (script) {
    script.remove();
  }
}

// Utility function to check if SDK is available
export function isTwitchSDKAvailable(): boolean {
  return typeof window !== "undefined" && !!(window as any).Twitch;
}
