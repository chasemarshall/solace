"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAdBlocker } from '@/hooks/useAdBlocker';

interface AnalyticsData {
  session: {
    startTime: Date;
    totalRequests: number;
    blockedRequests: number;
    savedBandwidth: number;
    avgLoadTime: number;
  };
  realTime: {
    requestsPerMinute: number;
    blockedPerMinute: number;
    currentBandwidthSaved: number;
    activeBlocks: number;
  };
  breakdown: {
    networkBlocks: number;
    domBlocks: number;
    hlsBlocks: number;
    gqlBlocks: number;
    serviceWorkerBlocks: number;
  };
}

export function DevAnalytics({ channel }: { channel: string }) {
  const { stats, isActive } = useAdBlocker(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    session: {
      startTime: new Date(),
      totalRequests: 0,
      blockedRequests: stats.blockedRequests,
      savedBandwidth: stats.savedBandwidth,
      avgLoadTime: 0
    },
    realTime: {
      requestsPerMinute: 0,
      blockedPerMinute: 0,
      currentBandwidthSaved: 0,
      activeBlocks: 0
    },
    breakdown: {
      networkBlocks: 0,
      domBlocks: 0,
      hlsBlocks: stats.hlsInterceptions,
      gqlBlocks: stats.gqlBlocks,
      serviceWorkerBlocks: 0
    }
  });
  
  const [isExpanded, setIsExpanded] = useState(false);

  // Update analytics in real-time
  useEffect(() => {
    setAnalytics(prev => ({
      ...prev,
      session: {
        ...prev.session,
        blockedRequests: stats.blockedRequests,
        savedBandwidth: stats.savedBandwidth,
        avgLoadTime: stats.loadTimeImprovement
      },
      breakdown: {
        ...prev.breakdown,
        hlsBlocks: stats.hlsInterceptions,
        gqlBlocks: stats.gqlBlocks
      }
    }));
  }, [stats]);

  const getBlockingEffectiveness = (): number => {
    const total = analytics.session.totalRequests + analytics.session.blockedRequests;
    return total > 0 ? (analytics.session.blockedRequests / total) * 100 : 0;
  };

  const getSessionDuration = (): string => {
    const now = new Date();
    const diff = now.getTime() - analytics.session.startTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const exportAnalytics = () => {
    const data = JSON.stringify(analytics, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dev-analytics-${channel}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-4 bg-surface/80 backdrop-blur rounded-xl p-4 border border-white/10">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-bold text-text flex items-center gap-2">
          🛡️ Dev Analytics - {channel}
          <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
        </h3>
        <span className="text-text-muted text-xs">
          {isExpanded ? '▼ Hide' : '▶ Show'} • {getSessionDuration()}
        </span>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mt-4">
        <div className="text-center">
          <div className="text-2xl font-mono text-red-400">
            {analytics.session.blockedRequests}
          </div>
          <div className="text-xs text-text-muted">Ads Blocked</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono text-blue-400">
            {(analytics.session.savedBandwidth / 1024).toFixed(1)}KB
          </div>
          <div className="text-xs text-text-muted">Bandwidth Saved</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono text-green-400">
            {getBlockingEffectiveness().toFixed(1)}%
          </div>
          <div className="text-xs text-text-muted">Block Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono text-purple-400">
            {analytics.session.avgLoadTime.toFixed(0)}ms
          </div>
          <div className="text-xs text-text-muted">Avg Speed Up</div>
        </div>
      </div>

      {/* Expanded Analytics */}
      {isExpanded && (
        <div className="mt-6 space-y-4">
          {/* Blocking Breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-text mb-2">Block Type Breakdown</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex justify-between">
                <span>Network Blocks:</span>
                <span className="font-mono">{analytics.breakdown.networkBlocks}</span>
              </div>
              <div className="flex justify-between">
                <span>DOM Blocks:</span>
                <span className="font-mono">{analytics.breakdown.domBlocks}</span>
              </div>
              <div className="flex justify-between">
                <span>HLS Intercepts:</span>
                <span className="font-mono">{analytics.breakdown.hlsBlocks}</span>
              </div>
              <div className="flex justify-between">
                <span>GraphQL Blocks:</span>
                <span className="font-mono">{analytics.breakdown.gqlBlocks}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Worker:</span>
                <span className="font-mono">{analytics.breakdown.serviceWorkerBlocks}</span>
              </div>
            </div>
          </div>

          {/* Performance Impact */}
          <div>
            <h4 className="text-sm font-semibold text-text mb-2">Performance Impact</h4>
            <div className="space-y-2 text-xs">
              <div className="bg-green-500/20 rounded p-2">
                <div className="text-green-300">✅ Reduced load time by ~{analytics.session.avgLoadTime.toFixed(0)}ms</div>
              </div>
              <div className="bg-blue-500/20 rounded p-2">
                <div className="text-blue-300">💾 Saved {(analytics.session.savedBandwidth / 1024).toFixed(2)}KB bandwidth</div>
              </div>
              <div className="bg-purple-500/20 rounded p-2">
                <div className="text-purple-300">🚀 Blocked {analytics.session.blockedRequests} potential interruptions</div>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div>
            <h4 className="text-sm font-semibold text-text mb-2">Technical Details</h4>
            <div className="text-xs text-text-muted space-y-1 font-mono">
              <div>Session Start: {analytics.session.startTime.toLocaleTimeString()}</div>
              <div>Service Worker: {isActive ? 'Active' : 'Inactive'}</div>
              <div>Channel: {channel}</div>
              <div>Mode: Development/Research</div>
            </div>
          </div>

          {/* Real-time Metrics */}
          <div>
            <h4 className="text-sm font-semibold text-text mb-2">Real-time Metrics</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white/5 rounded p-2 text-center">
                <div className="font-mono text-yellow-400">{analytics.realTime.requestsPerMinute}</div>
                <div className="text-text-muted">Req/min</div>
              </div>
              <div className="bg-white/5 rounded p-2 text-center">
                <div className="font-mono text-red-400">{analytics.realTime.blockedPerMinute}</div>
                <div className="text-text-muted">Blocked/min</div>
              </div>
              <div className="bg-white/5 rounded p-2 text-center">
                <div className="font-mono text-green-400">{analytics.realTime.activeBlocks}</div>
                <div className="text-text-muted">Active</div>
              </div>
            </div>
          </div>

          {/* Export Data Button */}
          <div className="pt-2 border-t border-white/10">
            <button 
              onClick={exportAnalytics}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs py-2 px-3 rounded transition-colors"
            >
              📊 Export Analytics Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}