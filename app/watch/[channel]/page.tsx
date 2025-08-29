import type { Metadata } from "next";
import EnhancedWatchPlayer from "@/components/EnhancedWatchPlayer";
import TwitchChat from "@/components/TwitchChat";
import ErrorBoundary from "@/components/ErrorBoundary";
import FavoriteButton from "@/components/FavoriteButton";
import StreamStatus from "@/components/StreamStatus";
import WatchPageClient from "./WatchPageClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { channel: string } }): Promise<Metadata> {
  return { title: `${params.channel} • solace.` };
}

export default function Watch({ params }: { params: { channel: string } }) {
  const parent = process.env.NEXT_PUBLIC_TWITCH_PARENT || "localhost";
  const { channel } = params;

  return (
    <WatchPageClient 
      channel={channel}
      parent={parent}
      WatchPlayer={EnhancedWatchPlayer}
      TwitchChat={TwitchChat}
      ErrorBoundary={ErrorBoundary}
      FavoriteButton={FavoriteButton}
      StreamStatus={StreamStatus}
    />
  );
}

