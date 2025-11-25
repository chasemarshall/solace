import React from 'react';
import { useImmersive } from '@/contexts/ImmersiveContext';
import type { ProxyEndpoint } from '@/lib/twitch/proxyConfig';

interface PlayerErrorProps {
  error: string;
  channel: string;
}

/**
 * Shared error display component for all players
 */
export function PlayerError({ error, channel }: PlayerErrorProps) {
  const { isImmersiveMode } = useImmersive();

  return (
    <div className={`relative w-full aspect-video bg-black flex items-center justify-center ${isImmersiveMode ? '' : 'rounded-xl'} overflow-hidden shadow-2xl`}>
      <div className="text-center text-white p-8">
        <div className="text-red-400 text-xl mb-3">⚠ stream error</div>
        <div className="text-sm opacity-75 mb-4">{error}</div>
        <div className="text-xs opacity-50">
          channel: {channel}
        </div>
      </div>
    </div>
  );
}

interface PlayerLoadingProps {
  currentProxy: ProxyEndpoint | null;
  failoverAttempts: number;
  playerType?: 'ad-free' | 'native';
}

/**
 * Shared loading display component for all players
 */
export function PlayerLoading({ currentProxy, failoverAttempts, playerType = 'ad-free' }: PlayerLoadingProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <div className="text-lg font-semibold">loading stream</div>
        <div className="text-sm opacity-75 mt-2">
          {currentProxy
            ? `${currentProxy.name.toLowerCase()} (${currentProxy.region.toLowerCase()})`
            : 'finding best proxy...'} • {playerType === 'native' ? 'native player' : 'ad-free'}
        </div>
        {failoverAttempts > 1 && (
          <div className="text-xs opacity-50 mt-1">
            tried {failoverAttempts} {failoverAttempts === 1 ? 'proxy' : 'proxies'}
          </div>
        )}
        {playerType === 'native' && (
          <div className="text-xs opacity-50 mt-1">
            optimized for safari
          </div>
        )}
      </div>
    </div>
  );
}

interface PlayerBadgeProps {
  currentProxy: ProxyEndpoint | null;
  badgeType: 'ad-free' | 'native';
}

/**
 * Shared badge component for all players
 */
export function PlayerBadge({ currentProxy, badgeType }: PlayerBadgeProps) {
  const bgColor = badgeType === 'ad-free' ? 'bg-green-600/90' : 'bg-blue-600/90';
  const label = badgeType === 'ad-free' ? 'ad-free' : 'native player';

  return (
    <div className={`absolute top-4 left-4 ${bgColor} backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg`}>
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {currentProxy && (
          <span className="opacity-75">• {currentProxy.name.toLowerCase()}</span>
        )}
      </div>
    </div>
  );
}

interface PlayerContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Shared container component for all players
 */
export function PlayerContainer({ children, className = '' }: PlayerContainerProps) {
  const { isImmersiveMode } = useImmersive();

  return (
    <div className={`relative w-full aspect-video bg-black ${isImmersiveMode ? '' : 'rounded-xl'} overflow-hidden shadow-2xl group ${className}`}>
      {children}
    </div>
  );
}
