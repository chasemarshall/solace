"use client";

import { useEffect, useRef, useState } from "react";
import LiveCard from "@/components/LiveCard";

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
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    if (loading) return;
    setLoading(true);
    const url = new URL("/api/streams", window.location.origin);
    url.searchParams.set("first", "24");
    if (cursor) url.searchParams.set("after", cursor);
    const r = await fetch(url.toString());
    const j = await r.json();
    setItems((prev) => [...prev, ...(j.data || [])]);
    setCursor(j.pagination?.cursor ?? null);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) load();
    }, { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loading]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Now Live</h1>
      <p className="mt-1 text-sm text-text-muted">A cleaner Twitch browsing experience.</p>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((s) => <LiveCard key={s.id} s={s} />)}
      </section>

      <div ref={sentinelRef} className="h-16" />
      {loading && <p className="mt-4 text-center text-sm text-text-muted">Loading…</p>}
    </div>
  );
}
