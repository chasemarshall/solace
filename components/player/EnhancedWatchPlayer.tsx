"use client";

import TtvLolPlayer from "@/components/player/TtvLolPlayer";

interface EnhancedWatchPlayerProps {
  channel: string;
  parent: string;
}

export default function EnhancedWatchPlayer({ channel, parent }: EnhancedWatchPlayerProps) {
  return (
    <div className="relative w-full">
      {/* TTV LOL PRO Player - Ad-Free Twitch Streams */}
      <TtvLolPlayer channel={channel} />
    </div>
  );
}