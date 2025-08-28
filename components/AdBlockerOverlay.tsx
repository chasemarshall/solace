"use client";

import { useEffect, useState, useCallback } from 'react';

interface AdBlockerOverlayProps {
  enabled: boolean;
  onAdBlocked?: (element: Element) => void;
  showDebugInfo?: boolean;
}

interface DetectionStats {
  totalBlocked: number;
  lastBlockedTime: Date | null;
  blockedElements: string[];
}

export function AdBlockerOverlay({ 
  enabled, 
  onAdBlocked,
  showDebugInfo = false 
}: AdBlockerOverlayProps) {
  const [stats, setStats] = useState<DetectionStats>({
    totalBlocked: 0,
    lastBlockedTime: null,
    blockedElements: []
  });
  const [isMinimized, setIsMinimized] = useState(false);

  const updateStats = useCallback((elementInfo: string) => {
    setStats(prev => ({
      totalBlocked: prev.totalBlocked + 1,
      lastBlockedTime: new Date(),
      blockedElements: [elementInfo, ...prev.blockedElements.slice(0, 4)]
    }));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    
    // Enhanced ad detection patterns for 2024-2025
    const adDetectionPatterns = [
      // Class-based detection
      { type: 'class', patterns: [
        'video-ads', 'ads-video-overlay', 'video-overlay-ad',
        'commercial-break-overlay', 'tw-ad-banner', 'tw-ad-countdown',
        'player-ad-notice', 'ad-notice', 'sponsored-shelf', 'promotion-shelf'
      ]},
      
      // Data attribute detection
      { type: 'data-attr', patterns: [
        'video-ad-countdown', 'video-ad-banner', 'video-ad', 'ad-banner',
        'ad-countdown', 'video-overlay-ad', 'video-player-ad', 'sponsored-label'
      ]},
      
      // ID-based detection
      { type: 'id', patterns: [
        'ad-banner', 'ad-overlay', 'commercial-overlay'
      ]},
      
      // Content-based detection
      { type: 'content', patterns: [
        'advertisement', 'sponsored', 'commercial break', 'ad will end in'
      ]}
    ];

    const isAdElement = (element: Element): { isAd: boolean; reason: string } => {
      // Check classes
      for (const className of element.classList) {
        if (adDetectionPatterns[0].patterns.some(pattern => 
          className.toLowerCase().includes(pattern.toLowerCase())
        )) {
          return { isAd: true, reason: `class: ${className}` };
        }
      }
      
      // Check data attributes
      for (const attr of element.attributes) {
        if (attr.name.startsWith('data-a-target') || attr.name.startsWith('data-test-selector')) {
          if (adDetectionPatterns[1].patterns.some(pattern => 
            attr.value.toLowerCase().includes(pattern.toLowerCase())
          )) {
            return { isAd: true, reason: `${attr.name}: ${attr.value}` };
          }
        }
      }
      
      // Check ID
      if (element.id) {
        if (adDetectionPatterns[2].patterns.some(pattern => 
          element.id.toLowerCase().includes(pattern.toLowerCase())
        )) {
          return { isAd: true, reason: `id: ${element.id}` };
        }
      }
      
      // Check text content
      const textContent = element.textContent?.toLowerCase() || '';
      if (adDetectionPatterns[3].patterns.some(pattern => 
        textContent.includes(pattern.toLowerCase())
      )) {
        return { isAd: true, reason: `content: ${textContent.substring(0, 50)}` };
      }
      
      return { isAd: false, reason: '' };
    };

    const removeAdElement = (element: Element, reason: string) => {
      console.log('🚫 DOM ad blocker removed element:', reason, element);
      
      // Hide instead of remove to avoid breaking layout
      if (element instanceof HTMLElement) {
        element.style.cssText = `
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          width: 0 !important;
          opacity: 0 !important;
          pointer-events: none !important;
          position: absolute !important;
          left: -9999px !important;
        `;
      }
      
      updateStats(reason);
      onAdBlocked?.(element);
    };

    // Enhanced MutationObserver for real-time ad detection
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Check added nodes
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            const detection = isAdElement(element);
            if (detection.isAd) {
              removeAdElement(element, detection.reason);
            }
            
            // Check child elements recursively
            const adChildren = element.querySelectorAll('*');
            adChildren.forEach(child => {
              const childDetection = isAdElement(child);
              if (childDetection.isAd) {
                removeAdElement(child, childDetection.reason);
              }
            });
          }
        });
        
        // Check attribute changes
        if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
          const element = mutation.target as Element;
          const detection = isAdElement(element);
          if (detection.isAd) {
            removeAdElement(element, detection.reason);
          }
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-a-target', 'data-test-selector', 'id']
    });
    
    // Initial scan for existing ad elements
    const existingAds = document.querySelectorAll('*');
    existingAds.forEach(element => {
      const detection = isAdElement(element);
      if (detection.isAd) {
        removeAdElement(element, detection.reason);
      }
    });
    
    return () => observer.disconnect();
  }, [enabled, onAdBlocked, updateStats]);
  
  if (!enabled) return null;
  
  return (
    <div className={`dev-mode-indicator ${isMinimized ? 'minimized' : ''}`}>
      <div 
        className="cursor-pointer flex items-center gap-2"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <span>🛡️</span>
        <span>Dev Mode</span>
        {!isMinimized && (
          <span className="opacity-75">
            ({stats.totalBlocked} blocked)
          </span>
        )}
        <span className="text-xs opacity-60">
          {isMinimized ? '▼' : '▲'}
        </span>
      </div>
      
      {!isMinimized && showDebugInfo && (
        <div className="mt-2 text-xs opacity-80 max-w-xs">
          <div>Total Blocked: {stats.totalBlocked}</div>
          {stats.lastBlockedTime && (
            <div>Last: {stats.lastBlockedTime.toLocaleTimeString()}</div>
          )}
          {stats.blockedElements.length > 0 && (
            <div className="mt-1 space-y-1">
              <div>Recent blocks:</div>
              {stats.blockedElements.slice(0, 3).map((element, idx) => (
                <div key={idx} className="text-[10px] opacity-60 truncate">
                  {element}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}