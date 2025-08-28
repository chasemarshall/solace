"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LiveCard from "@/components/LiveCard";
import ErrorBoundary from "@/components/ErrorBoundary";

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
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((s) => (
              <ErrorBoundary key={s.id}>
                <LiveCard s={s} />
              </ErrorBoundary>
            ))}
          </section>
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
