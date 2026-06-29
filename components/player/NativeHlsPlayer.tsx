"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { usePreferNativeHLS } from '@/hooks/usePlatform';
import { initHlsPlayer, destroyHlsPlayer, getQualityLevels, setQualityLevel, type QualityLevel } from '@/lib/video/hlsPlayer';
import { fetchPlaybackToken } from '@/lib/video/twitchPlayback';
import { proxyUrl } from '@/lib/video/hlsPlaylist';
import VideoControls from './VideoControls';

interface NativeHlsPlayerProps {
  channel: string;
  onFallback: () => void;
  className?: string;
}

export default function NativeHlsPlayer({ channel, onFallback, className }: NativeHlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [streamTitle, setStreamTitle] = useState('');
  const [gameName, setGameName] = useState('');
  const preferNative = usePreferNativeHLS();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/channel/${encodeURIComponent(channel)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data?.liveStream) {
          if (data.liveStream.title) setStreamTitle(data.liveStream.title);
          if (data.liveStream.game_name) setGameName(data.liveStream.game_name);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [channel]);

  const handleQualityChange = useCallback((index: number) => {
    if (hlsRef.current) {
      setQualityLevel(hlsRef.current, index);
      setCurrentQuality(index);
    }
  }, []);

  useEffect(() => {
    // Wait for platform detection before choosing playback engine
    if (preferNative === null || !videoRef.current) return;

    let cancelled = false;
    let activeVideo: HTMLVideoElement | null = null;

    async function setup() {
      const el = videoRef.current;
      if (!el) return;
      activeVideo = el;

      try {
        // Fetch playback token directly from Twitch GQL (client-side)
        // Server-side API route gets blocked by Twitch on cloud provider IPs
        const { m3u8Url } = await fetchPlaybackToken(channel);
        if (cancelled) return;

        if (Hls.isSupported()) {
          // hls.js keeps HLS requests browser-side, which avoids routing live
          // media through Vercel serverless while still letting our loader
          // strip playlist ad markers.
          const hls = initHlsPlayer(el, m3u8Url, () => {
            if (!cancelled) onFallback();
          });
          hlsRef.current = hls;

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (cancelled) return;
            setLoading(false);
            setQualities(getQualityLevels(hls));
            el.play().catch(() => {});
          });

          hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
            if (!cancelled) setCurrentQuality(data.level);
          });
        } else if (preferNative && el.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS cannot intercept playlists, so it still uses the local
          // proxy as a best-effort fallback on platforms without hls.js.
          el.src = proxyUrl(m3u8Url);
          el.addEventListener('loadeddata', () => {
            if (!cancelled) setLoading(false);
          }, { once: true });
          el.addEventListener('error', () => {
            if (!cancelled) onFallback();
          }, { once: true });
          el.play().catch(() => {});
        } else {
          onFallback();
        }
      } catch (err) {
        console.error('[NativeHlsPlayer] Setup failed:', err);
        if (!cancelled) onFallback();
      }
    }

    setup();

    return () => {
      cancelled = true;
      destroyHlsPlayer(hlsRef.current);
      hlsRef.current = null;
      const el = activeVideo;
      if (el) {
        el.pause();
        el.removeAttribute('src');
        el.load();
      }
    };
  }, [channel, preferNative, onFallback]);

  return (
    <div className={className} data-player-root style={{ position: 'absolute', inset: 0 }}>
      <video
        ref={videoRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: 'black',
        }}
        playsInline
        autoPlay
      />
      <VideoControls
        videoRef={videoRef}
        streamTitle={streamTitle}
        gameName={gameName}
        qualityLevels={qualities}
        currentQuality={currentQuality}
        onQualityChange={handleQualityChange}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
