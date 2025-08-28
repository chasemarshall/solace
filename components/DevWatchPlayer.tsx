"use client";

import { useState, useCallback, useEffect } from 'react';
import { useAdBlocker } from '@/hooks/useAdBlocker';
import { AdBlockerOverlay } from './AdBlockerOverlay';
import { createTwitchEmbedReliable } from '@/lib/sdk/reliableLoader';

interface PlayerProps {
  channel: string;
  parent: string;
}

export function DevWatchPlayer({ channel, parent }: PlayerProps) {
  const [adBlockEnabled, setAdBlockEnabled] = useState(true);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [embedStatus, setEmbedStatus] = useState<'loading' | 'success' | 'error'>('loading');
  
  const { stats, isActive, errors } = useAdBlocker(adBlockEnabled);
  
  const handleAdBlocked = useCallback((element: Element) => {
    console.log('🚫 Dev Player: Ad blocked', element);
  }, []);

  const handleEmbedSuccess = useCallback(() => {
    setEmbedStatus('success');
    setEmbedError(null);
  }, []);

  const handleEmbedError = useCallback((error: string) => {
    setEmbedStatus('error');
    setEmbedError(error);
  }, []);

  return (
    <div className="relative dev-mode">
      {/* Dev Controls Panel */}
      <div className="absolute top-2 left-2 z-50 bg-black/90 backdrop-blur rounded-lg p-3 text-xs border border-white/20">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-yellow-300 font-bold">🔧 DEV CONTROLS</span>
            <button 
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className="text-white/60 hover:text-white text-xs"
            >
              {showDebugPanel ? '▼' : '▶'}
            </button>
          </div>
          
          <label className="flex items-center gap-2 text-white">
            <input 
              type="checkbox" 
              checked={adBlockEnabled}
              onChange={(e) => setAdBlockEnabled(e.target.checked)}
              className="rounded"
            />
            🛡️ Ad Blocker ({stats.blockedRequests} blocked)
          </label>
          
          <div className="text-white/70 space-y-1">
            <div>Status: <span className={embedStatus === 'success' ? 'text-green-400' : embedStatus === 'error' ? 'text-red-400' : 'text-yellow-400'}>{embedStatus}</span></div>
            <div>SW Active: <span className={isActive ? 'text-green-400' : 'text-red-400'}>{isActive ? 'Yes' : 'No'}</span></div>
            <div>HLS Intercepts: {stats.hlsInterceptions}</div>
            <div>GraphQL Blocks: {stats.gqlBlocks}</div>
            <div>Bandwidth Saved: {(stats.savedBandwidth / 1024).toFixed(1)}KB</div>
          </div>
          
          {showDebugPanel && (
            <div className="mt-2 pt-2 border-t border-white/20 space-y-1 text-[10px]">
              <div className="text-white/50">Recent Errors:</div>
              {errors.slice(0, 3).map((error, idx) => (
                <div key={idx} className="text-red-300 break-all">{error}</div>
              ))}
              {embedError && (
                <div className="text-red-400 break-all">Embed: {embedError}</div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Enhanced Twitch Player */}
      <DevTwitchEmbed 
        channel={channel} 
        parent={parent}
        adBlockEnabled={adBlockEnabled}
        onSuccess={handleEmbedSuccess}
        onError={handleEmbedError}
      />
      
      {/* Ad Blocker Overlay */}
      <AdBlockerOverlay 
        enabled={adBlockEnabled} 
        onAdBlocked={handleAdBlocked}
        showDebugInfo={showDebugPanel}
      />
      
      {/* Performance Metrics */}
      {showDebugPanel && stats.loadTimeImprovement > 0 && (
        <div className="absolute bottom-2 left-2 z-50 bg-green-500/90 text-white px-3 py-1 rounded text-xs">
          ⚡ {stats.loadTimeImprovement.toFixed(0)}ms faster
        </div>
      )}
    </div>
  );
}

// Enhanced Twitch Embed Component for Dev Mode
function DevTwitchEmbed({ 
  channel, 
  parent, 
  adBlockEnabled,
  onSuccess,
  onError 
}: {
  channel: string;
  parent: string;
  adBlockEnabled: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [embed, setEmbed] = useState<any>(null);

  useEffect(() => {
    if (!containerRef) return;

    const initializeEmbed = async () => {
      try {
        console.log('🚀 Dev Player: Initializing enhanced Twitch embed');
        
        const twitchEmbed = await createTwitchEmbedReliable(containerRef, {
          channel,
          parent: [parent, 'localhost', '127.0.0.1'],
          width: '100%',
          height: '100%',
          theme: 'dark',
          layout: 'video',
          autoplay: true,
          muted: false,
        });
        
        setEmbed(twitchEmbed);
        onSuccess?.();
        
        // Add ad blocking hooks to the embed
        if (adBlockEnabled) {
          twitchEmbed.addEventListener('VIDEO_PLAY', () => {
            console.log('🎬 Dev Player: Video started playing');
          });
          
          twitchEmbed.addEventListener('VIDEO_PAUSE', () => {
            console.log('⏸️ Dev Player: Video paused');
          });
        }
        
      } catch (error) {
        console.error('❌ Dev Player: Embed initialization failed:', error);
        onError?.(error instanceof Error ? error.message : 'Unknown embed error');
      }
    };

    initializeEmbed();

    return () => {
      if (embed) {
        try {
          embed.destroy?.();
        } catch (error) {
          console.warn('Dev Player: Embed cleanup error:', error);
        }
      }
    };
  }, [containerRef, channel, parent, adBlockEnabled, onSuccess, onError]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
      <div 
        ref={setContainerRef}
        className="w-full h-full"
        id={`twitch-embed-dev-${channel}`}
      />
      
      {!embed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <div className="text-lg font-semibold">Loading Dev Player</div>
            <div className="text-sm opacity-75">Initializing enhanced embed with ad blocking</div>
          </div>
        </div>
      )}
    </div>
  );
}