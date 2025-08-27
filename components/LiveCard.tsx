"use client";

import Link from "next/link";
import Image from "next/image";
import { fmtViewers, twitchThumb } from "@/lib/utils";
import { useState } from "react";

type Stream = {
  id: string;
  user_name: string;
  user_login: string;
  title: string;
  viewer_count: number;
  thumbnail_url: string;
  game_name?: string;
};

export default function LiveCard({ s }: { s: Stream }) {
  const [imageError, setImageError] = useState(false);
  const thumb = twitchThumb(s.thumbnail_url, 640, 360);
  
  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <Link href={`/watch/${encodeURIComponent(s.user_login || s.user_name)}`} className="group block">
      <div className="aspect-video overflow-hidden rounded-xl bg-black/30 relative">
        {!imageError ? (
          <Image
            src={thumb}
            alt={s.title || `${s.user_name} stream`}
            width={640}
            height={360}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={handleImageError}
            unoptimized={thumb.includes('via.placeholder.com')}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-blue-900/20">
            <div className="text-center text-text-muted">
              <div className="text-4xl mb-2">📺</div>
              <div className="text-sm font-medium">{s.user_name}</div>
              <div className="text-xs">Live Stream</div>
            </div>
          </div>
        )}
        
        {/* Live indicator */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          LIVE
        </div>
        
        {/* Viewer count */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
          {fmtViewers(s.viewer_count)}
        </div>
      </div>
      <div className="mt-2">
        <div className="line-clamp-1 font-medium text-text">{s.title || s.user_name}</div>
        <div className="text-sm text-text-muted">{s.user_name} • {fmtViewers(s.viewer_count)} watching</div>
        {s.game_name && (
          <div className="text-xs text-text-muted mt-1">{s.game_name}</div>
        )}
      </div>
    </Link>
  );
}
