"use client";

import { useState } from "react";
import { useFavorites } from "@/contexts/FavoritesContext";

export default function FavoriteButton({ channel }: { channel: string }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isLoading, setIsLoading] = useState(false);

  const favorited = isFavorite(channel);

  const handleToggle = async () => {
    if (isLoading) return; // Prevent double clicks

    setIsLoading(true);

    try {
      await toggleFavorite(channel);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      // Small delay to prevent rapid clicking
      setTimeout(() => setIsLoading(false), 300);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`flex items-center justify-center px-3 py-2 bg-surface/80 hover:bg-surface border border-white/10 hover:border-white/20 rounded-xl backdrop-blur-sm transition-all duration-200 text-text hover:text-white group ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={isLoading ? "Loading..." : (favorited ? "Remove from favorites" : "Add to favorites")}
    >
      {isLoading ? (
        <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <svg 
          className="w-4 h-4 transition-colors" 
          fill={favorited ? "currentColor" : "none"} 
          stroke="currentColor" 
          strokeWidth="2" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      )}
    </button>
  );
}