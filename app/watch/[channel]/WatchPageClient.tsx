"use client";

import { useState } from "react";
import { MessageSquare, MessageSquareOff, Maximize } from "lucide-react";
import { useImmersive } from "@/contexts/ImmersiveContext";

interface WatchPageClientProps {
  channel: string;
  parent: string;
  WatchPlayer: React.ComponentType<{ channel: string; parent: string }>;
  TwitchChat: React.ComponentType<{ channel: string; playerMode: "enhanced" }>;
  ErrorBoundary: React.ComponentType<{ children: React.ReactNode }>;
  FavoriteButton: React.ComponentType<{ channel: string }>;
  StreamStatus: React.ComponentType<{ channel: string }>;
}

export default function WatchPageClient({
  channel,
  parent,
  WatchPlayer,
  TwitchChat,
  ErrorBoundary,
  FavoriteButton,
  StreamStatus
}: WatchPageClientProps) {
  const [isChatVisible, setIsChatVisible] = useState(true);
  const { isImmersiveMode, setIsImmersiveMode } = useImmersive();

  if (isImmersiveMode) {
    return (
      <div className="w-full" onClick={() => setIsImmersiveMode(false)}>
        <div className="w-full space-y-4">
          <ErrorBoundary>
            <WatchPlayer channel={channel} parent={parent} />
          </ErrorBoundary>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isChatVisible ? 'grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 gap-6' : 'w-full'}`}>
      <div className={`${isChatVisible ? 'xl:col-span-3 lg:col-span-2' : 'w-full'} space-y-4`}>
        <ErrorBoundary>
          <WatchPlayer channel={channel} parent={parent} />
        </ErrorBoundary>
        
        {/* Stream info and controls */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text">{channel}</h1>
            <ErrorBoundary>
              <StreamStatus channel={channel} />
            </ErrorBoundary>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsChatVisible(!isChatVisible)}
              className="w-8 h-8 rounded-md bg-surface border border-white/10 text-text hover:bg-white/5 transition-all duration-200 flex items-center justify-center"
              title={isChatVisible ? "hide chat" : "show chat"}
            >
              {isChatVisible ? (
                <MessageSquareOff className="h-4 w-4" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setIsImmersiveMode(true)}
              className="w-8 h-8 rounded-md bg-surface border border-white/10 text-text hover:bg-white/5 transition-all duration-200 flex items-center justify-center"
              title="immersive mode"
            >
              <Maximize className="h-4 w-4" />
            </button>
            <ErrorBoundary>
              <FavoriteButton channel={channel} />
            </ErrorBoundary>
          </div>
        </div>
      </div>
      
      {isChatVisible && (
        <aside className="xl:col-span-1 lg:col-span-1 col-span-1">
          <div className="rounded-xl border border-white/5 bg-surface h-[75vh]">
            <ErrorBoundary>
              <TwitchChat channel={channel} playerMode="enhanced" />
            </ErrorBoundary>
          </div>
        </aside>
      )}
    </div>
  );
}