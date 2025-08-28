import type { Metadata } from "next";
import WatchPlayer from "@/components/WatchPlayer";
import TwitchChat from "@/components/TwitchChat";
import ErrorBoundary from "@/components/ErrorBoundary";
import FavoriteButton from "@/components/FavoriteButton";
import StreamStatus from "@/components/StreamStatus";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { channel: string } }): Promise<Metadata> {
  return { title: `${params.channel} • solace.` };
}

export default async function Watch({ params }: { params: { channel: string } }) {
  const parent = process.env.NEXT_PUBLIC_TWITCH_PARENT || "localhost";
  const { channel } = params;

  return (
    <div className="grid gap-6 xl:grid-cols-4 lg:grid-cols-3">
      <div className="xl:col-span-3 lg:col-span-2 space-y-4">
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
          <ErrorBoundary>
            <FavoriteButton channel={channel} />
          </ErrorBoundary>
        </div>
      </div>
      
      <aside className="xl:col-span-1 lg:col-span-1">
        <div className="rounded-xl border border-white/5 bg-surface h-[75vh]">
          <ErrorBoundary>
            <TwitchChat channel={channel} playerMode="enhanced" />
          </ErrorBoundary>
        </div>
      </aside>
    </div>
  );
}

