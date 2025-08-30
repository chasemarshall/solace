"use client";

import { useState, useEffect } from "react";

interface StreamStatusProps {
  channel: string;
}

interface StreamData {
  liveStream: {
    id: string;
    user_id: string;
    user_login: string;
    user_name: string;
    game_id: string;
    game_name: string;
    type: string;
    title: string;
    viewer_count: number;
    started_at: string;
    language: string;
    thumbnail_url: string;
    tag_ids: string[];
    is_mature: boolean;
  } | null;
}

export default function StreamStatus({ channel }: StreamStatusProps) {
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStreamStatus = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/channel/${channel}`);
        if (response.ok) {
          const data = await response.json();
          setStreamData(data);
        }
      } catch (error) {
        console.error("Failed to fetch stream status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStreamStatus();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchStreamStatus, 30000);
    return () => clearInterval(interval);
  }, [channel]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted mt-1">
        <div className="h-2 w-2 rounded-full bg-gray-500 animate-pulse"></div>
        <span>checking...</span>
      </div>
    );
  }

  const isLive = streamData?.liveStream !== null;

  return (
    <div className="flex items-center gap-2 text-sm text-text-muted mt-1">
      <div className={`h-2 w-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
      <span>{isLive ? 'live' : 'offline'}</span>
    </div>
  );
}