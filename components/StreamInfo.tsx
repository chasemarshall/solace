"use client";

import { useState } from "react";

interface StreamInfoProps {
  channel: string;
}

export default function StreamInfo({ channel }: StreamInfoProps) {
  // For now, we'll show placeholder data since backend API will be added later
  const [isLoading] = useState(false);
  
  if (isLoading) {
    return (
      <div className="mt-6 rounded-xl bg-surface border border-white/5 p-6">
        <div className="space-y-3">
          <div className="h-5 bg-white/10 rounded animate-pulse"></div>
          <div className="h-4 bg-white/5 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-white/5 rounded animate-pulse w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl bg-surface border border-white/5 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">About this stream</h2>
      
      <div className="space-y-4">
        {/* Channel info */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            <span className="text-sm font-bold text-white">
              {channel.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-white">{channel}</h3>
            <p className="text-sm text-text-muted">Twitch Streamer</p>
          </div>
        </div>

        {/* Stream status */}
        <div className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 rounded-full bg-gray-500"></div>
          <span className="text-text-muted">Currently offline</span>
        </div>

        {/* Placeholder info */}
        <div className="text-sm text-text-muted space-y-2">
          <p>Stream information will be loaded dynamically when the backend API is connected.</p>
          <div className="pt-2 text-xs space-y-1 opacity-75">
            <p>• Live status and viewer count</p>
            <p>• Current game/category</p>
            <p>• Stream title and description</p>
            <p>• Stream uptime when live</p>
          </div>
        </div>
      </div>
    </div>
  );
}