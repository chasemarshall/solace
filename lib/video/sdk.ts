interface EmbedOptions {
  channel: string;
  parent: string | string[];
  width?: string | number;
  height?: string | number;
  autoplay?: boolean;
  muted?: boolean;
  layout?: string;
  theme?: string;
}

let sdkPromise: Promise<any> | null = null;

export async function loadTwitchSDKReliable(): Promise<any> {
  // Return cached promise if exists
  if (sdkPromise) return sdkPromise;
  
  // Check if already loaded
  if ((window as any).Twitch?.Embed) return (window as any).Twitch;
  
  // Create promise ONCE
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/api/dev-proxy?url=' + encodeURIComponent('https://embed.twitch.tv/embed/v1.js');
    script.id = 'twitch-sdk-dev';
    
    // Success handler
    script.onload = () => {
      const checkSDK = (attempts = 0) => {
        if ((window as any).Twitch?.Embed) {
          resolve((window as any).Twitch);
        } else if (attempts < 20) {
          setTimeout(() => checkSDK(attempts + 1), 50);
        } else {
          reject(new Error('SDK loaded but Twitch.Embed not available'));
        }
      };
      checkSDK();
    };
    
    script.onerror = () => reject(new Error('Script failed to load'));
    
    // Only append if not already exists
    if (!document.getElementById('twitch-sdk-dev')) {
      document.head.appendChild(script);
    }
    
    // 15 second timeout
    setTimeout(() => reject(new Error('SDK load timeout')), 15000);
  });
  
  return sdkPromise;
}

async function ensureContainerReady(container: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      const rect = container.getBoundingClientRect();
      const style = getComputedStyle(container);
      
      if (rect.width > 0 && rect.height > 0 && 
          style.visibility === 'visible' && 
          style.display !== 'none') {
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });
}

function getParentDomains(): string[] {
  const current = window.location.hostname;
  const domains = [current];
  
  // Add common dev variants
  if (current === 'localhost') domains.push('127.0.0.1');
  if (current === '127.0.0.1') domains.push('localhost');
  
  // Add known deployment patterns
  if (current.includes('vercel.app')) domains.push('localhost', '127.0.0.1');
  if (current.includes('solace.heysonder.xyz')) domains.push('solace.heysonder.xyz');
  
  // Remove duplicates
  return [...new Set(domains)];
}

export async function createTwitchEmbedReliable(
  container: HTMLElement,
  options: EmbedOptions
): Promise<any> {
  // 1. Ensure container is ready
  await ensureContainerReady(container);
  
  // 2. Load SDK
  const Twitch = await loadTwitchSDKReliable();
  
  // 3. Get runtime parent domains
  const parentDomains = getParentDomains();
  
  // 4. Clear container
  container.innerHTML = '';
  
  // 5. Create embed with proper config
  const embed = new Twitch.Embed(container, {
    ...options,
    parent: parentDomains,
    width: '100%',
    height: '100%'
  });
  
  // 6. Return embed with timeout promise
  return new Promise((resolve, reject) => {
    let resolved = false;
    
    const onReady = () => {
      if (!resolved) {
        resolved = true;
        resolve(embed);
      }
    };
    
    embed.addEventListener('VIDEO_READY', onReady);
    
    // Fallback timeout (success assumed)
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(embed);
      }
    }, 8000);
  });
}