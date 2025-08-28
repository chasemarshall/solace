"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LiveCard from "@/components/LiveCard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { getFavorites } from "@/lib/favorites";

type Stream = {
  id: string;
  user_name: string;
  user_login: string;
  title: string;
  viewer_count: number;
  thumbnail_url: string;
  game_name?: string;
};

export default function Home() {
  const [items, setItems] = useState<Stream[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Update favorites when localStorage changes
  useEffect(() => {
    const updateFavorites = () => setFavorites(getFavorites());
    updateFavorites();
    
    // Listen for storage changes (favorites updated in other tabs)
    window.addEventListener('storage', updateFavorites);
    return () => window.removeEventListener('storage', updateFavorites);
  }, []);

  const load = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    
    try {
      const url = new URL("/api/streams", window.location.origin);
      url.searchParams.set("first", "24");
      if (cursor) url.searchParams.set("after", cursor);
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setItems((prev) => [...prev, ...(data.data || [])]);
      setCursor(data.pagination?.cursor ?? null);
    } catch (err) {
      console.error("Failed to load streams:", err);
      setError(err instanceof Error ? err.message : "Failed to load streams");
    } finally {
      setLoading(false);
    }
  }, [loading, cursor]);

  useEffect(() => { 
    load(); 
  }, [load]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) load();
    }, { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [load]);

  const retry = () => {
    setError(null);
    setItems([]);
    setCursor(null);
    load();
  };

  // Separate and sort streams
  const favoriteStreams = items.filter(s => favorites.has(s.user_login.toLowerCase()));
  const regularStreams = items.filter(s => !favorites.has(s.user_login.toLowerCase()));

  return (
    <ErrorBoundary>
      <div>
        <h1 className="text-3xl font-bold text-text mb-2">live now</h1>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-red-300 font-semibold text-base">failed to load streams</h3>
                <p className="text-red-400 text-sm mt-2 leading-relaxed">{error}</p>
                {error.includes("Twitch API not configured") && (
                  <p className="text-red-400 text-sm mt-2">
                    please set up your twitch api credentials in the .env file. see readme.md for instructions.
                  </p>
                )}
              </div>
              <button
                onClick={retry}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
              >
retry
              </button>
            </div>
          </div>
        )}

        {/* Streams Grid */}
        {items.length > 0 && (
          <div className="mt-6 space-y-8">
            {/* Favorite Streams */}
            {favoriteStreams.length > 0 && (
              <section>
                <h2 className="text-lg font-medium text-text mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.518 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.518-4.674z" />
                  </svg>
                  favorites
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {favoriteStreams.map((s) => (
                    <ErrorBoundary key={s.id}>
                      <LiveCard s={s} />
                    </ErrorBoundary>
                  ))}
                </div>
              </section>
            )}

            {/* Regular Streams */}
            {regularStreams.length > 0 && (
              <section>
                {favoriteStreams.length > 0 && (
                  <h2 className="text-lg font-medium text-text mb-4">all streams</h2>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {regularStreams.map((s) => (
                    <ErrorBoundary key={s.id}>
                      <LiveCard s={s} />
                    </ErrorBoundary>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && items.length === 0 && (
          <div className="mt-12 text-center py-16">
            <div className="text-5xl mb-6">📺</div>
            <h2 className="text-xl font-semibold text-text mb-3">no streams found</h2>
            <p className="text-text-muted text-base leading-relaxed">try refreshing the page or check your connection.</p>
          </div>
        )}

        <div ref={sentinelRef} className="h-16" />
        {loading && <p className="mt-4 text-center text-sm text-text-muted">loading…</p>}
      </div>
    </ErrorBoundary>
  );
}
