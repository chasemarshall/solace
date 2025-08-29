import type { Metadata } from "next";
import { useState } from "react";
import WatchPlayer from "@/components/WatchPlayer";
import TwitchChat from "@/components/TwitchChat";
import ErrorBoundary from "@/components/ErrorBoundary";
import FavoriteButton from "@/components/FavoriteButton";
import StreamStatus from "@/components/StreamStatus";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { channel: string } }): Promise<Metadata> {
  return { title: `${params.channel} • solace.` };
}

export default function Watch({ params }: { params: { channel: string } }) {
  const parent = process.env.NEXT_PUBLIC_TWITCH_PARENT || "localhost";
  const { channel } = params;
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

