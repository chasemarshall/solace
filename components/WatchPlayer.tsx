"use client";

import { useEffect, useRef, useState } from "react";
import { loadTwitchSDK } from "@/lib/twitch/embed";

export default function WatchPlayer({ channel, parent }: { channel: string; parent: string }) {
  const [useIframe, setUseIframe] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("player-mode") === "iframe";
  });
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (useIframe) return;
    let disposed = false;
    async function createPlayer() {
      try {
        const Twitch = await loadTwitchSDK();
        if (disposed || !containerRef.current || !Twitch) return;
        const parents = parent.split(",").map((p) => p.trim()).filter(Boolean);
        const host = window.location.hostname;
        if (!parents.includes(host)) parents.push(host);
        const embed = new Twitch.Embed(containerRef.current, {
          channel,
          parent: parents,
          width: "100%",
          height: "100%",
          autoplay: true,
          muted: true,
        });
        embed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
          const p = embed.getPlayer();
          playerRef.current = p;
          p.setMuted(muted);
          p.play().catch(() => {});
        });
      } catch (e) {
        console.error(e);
        setError("JS player failed, using iframe.");
        setUseIframe(true);
      }
    }
    createPlayer();
    return () => {
      disposed = true;
      playerRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [channel, parent, useIframe]);

  useEffect(() => {
    if (!useIframe && playerRef.current) {
      playerRef.current.setMuted(muted);
      if (!muted) playerRef.current.play().catch(() => {});
    }
  }, [muted, useIframe]);

  const iframeParent = parent.split(",")[0];
  const iframeSrc = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(iframeParent)}&muted=false&autoplay=true`;

  const toggleMode = () => {
    setUseIframe((v) => {
      const next = !v;
      if (typeof window !== "undefined") {
        localStorage.setItem("player-mode", next ? "iframe" : "js");
      }
      return next;
    });
  };

  return (
    <div>
      <div className="mb-2 flex justify-end gap-2">
        {!useIframe && (
          <button
            onClick={() => setMuted((m) => !m)}
            className="rounded bg-surface px-2 py-1 text-sm"
          >
            {muted ? "Unmute" : "Mute"}
          </button>
        )}
        <button onClick={toggleMode} className="rounded bg-surface px-2 py-1 text-sm">
          Switch to {useIframe ? "JS" : "iframe"} player
        </button>
      </div>
      {error && <div className="mb-2 rounded bg-red-500/20 p-2 text-sm text-red-500">{error}</div>}
      <div className="aspect-video overflow-hidden rounded-xl border border-white/5 bg-black">
        {useIframe ? (
          <iframe src={iframeSrc} allowFullScreen scrolling="no" className="h-full w-full" />
        ) : (
          <div ref={containerRef} className="h-full w-full" />
        )}
      </div>
    </div>
  );
}

