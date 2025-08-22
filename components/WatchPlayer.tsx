"use client";

import { useEffect, useRef, useState } from "react";

export default function WatchPlayer({ channel, parent }: { channel: string; parent: string }) {
  const [useIframe, setUseIframe] = useState(false);
  const [muted, setMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (useIframe) return;
    function createPlayer() {
      if (playerRef.current) playerRef.current.destroy();
      const Twitch = (window as any).Twitch;
      if (!containerRef.current || !Twitch) return;
      playerRef.current = new Twitch.Player(containerRef.current, {
        channel,
        parent: [parent],
        autoplay: true,
      });
      playerRef.current.setMuted(muted);
    }
    if (!(window as any).Twitch) {
      const script = document.createElement("script");
      script.src = "https://player.twitch.tv/js/embed/v1.js";
      script.onload = createPlayer;
      document.body.appendChild(script);
    } else {
      createPlayer();
    }
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [channel, parent, useIframe, muted]);

  useEffect(() => {
    if (!useIframe && playerRef.current) {
      playerRef.current.setMuted(muted);
    }
  }, [muted, useIframe]);

  const iframeSrc = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(parent)}&muted=false&autoplay=true`;

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
        <button
          onClick={() => setUseIframe((v) => !v)}
          className="rounded bg-surface px-2 py-1 text-sm"
        >
          Switch to {useIframe ? "JS" : "iframe"} player
        </button>
      </div>
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

