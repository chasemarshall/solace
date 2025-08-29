"use client";

import { useState } from "react";

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

  return (
    <div className={`grid gap-6 ${isChatVisible ? 'xl:grid-cols-4 lg:grid-cols-3' : 'grid-cols-1'}`}>
      <div className={`${isChatVisible ? 'xl:col-span-3 lg:col-span-2' : 'col-span-1'} space-y-4`}>
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsChatVisible(!isChatVisible)}
              className="rounded-lg bg-surface border border-white/10 px-3 py-2 text-sm text-text hover:bg-white/5 transition-all duration-200"
              title={isChatVisible ? "Hide chat" : "Show chat"}
            >
              {isChatVisible ? "Hide chat" : "Show chat"}
            </button>
            <ErrorBoundary>
              <FavoriteButton channel={channel} />
            </ErrorBoundary>
          </div>
        </div>
      </div>
      
      {isChatVisible && (
        <aside className="xl:col-span-1 lg:col-span-1">
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