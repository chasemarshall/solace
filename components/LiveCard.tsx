"use client";

import Link from "next/link";
import Image from "next/image";
import { fmtViewers, twitchThumb } from "@/lib/utils";
import { useState, useEffect } from "react";
import { addFavorite, removeFavorite, isFavorite } from "@/lib/favorites";

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
  const [favorited, setFavorited] = useState(false);
  const thumb = twitchThumb(s.thumbnail_url, 640, 360);
  
  useEffect(() => {
    setFavorited(isFavorite(s.user_login));
  }, [s.user_login]);
  
  const handleImageError = () => {
    setImageError(true);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (favorited) {
      removeFavorite(s.user_login);
      setFavorited(false);
    } else {
      addFavorite(s.user_login);
      setFavorited(true);
    }
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
            unoptimized={true} // Bypass Next.js image optimization for external images
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-blue-900/20">
            <div className="text-center text-text-muted">
              <div className="text-4xl mb-2">📺</div>
              <div className="text-sm font-medium">{s.user_name}</div>
              <div className="text-xs">live stream</div>
            </div>
          </div>
        )}
        
        
        {/* Star button - appears on hover */}
        <button
          onClick={handleFavorite}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-lg backdrop-blur-sm"
          title={favorited ? "Remove from favorites" : "Add to favorites"}
        >
          <svg className="w-4 h-4" fill={favorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>

        {/* Viewer count */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
          {fmtViewers(s.viewer_count)}
        </div>
      </div>
      <div className="mt-3">
        <h3 className="line-clamp-2 font-semibold text-base text-text leading-tight mb-1">{s.title || s.user_name}</h3>
        <div className="text-sm text-text-muted font-medium">{s.user_name}</div>
        {s.game_name && (
          <div className="text-xs text-text-muted mt-1 font-medium">{s.game_name}</div>
        )}
        <div className="text-xs text-text-muted mt-2 font-medium">{fmtViewers(s.viewer_count)} watching</div>
      </div>
    </Link>
  );
}
