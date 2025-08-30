"use client";

import { useState, useEffect } from "react";
import { addFavorite, removeFavorite, isFavorite } from "@/lib/utils/favorites";

export default function FavoriteButton({ channel }: { channel: string }) {
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    setFavorited(isFavorite(channel));
  }, [channel]);

  const handleToggle = () => {
    if (favorited) {
      removeFavorite(channel);
      setFavorited(false);
    } else {
      addFavorite(channel);
      setFavorited(true);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="flex items-center justify-center px-3 py-2 bg-surface/80 hover:bg-surface border border-white/10 hover:border-white/20 rounded-lg backdrop-blur-sm transition-all duration-200 text-text hover:text-white group"
      title={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <svg 
        className="w-4 h-4 transition-colors" 
        fill={favorited ? "currentColor" : "none"} 
        stroke="currentColor" 
        strokeWidth="2" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    </button>
  );
}