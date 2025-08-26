"use client";

import Link from "next/link";
import Image from "next/image";
import { fmtViewers, twitchThumb } from "@/lib/utils";

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
  const thumb = twitchThumb(s.thumbnail_url, 640, 360);
  return (
    <Link href={`/watch/${encodeURIComponent(s.user_login || s.user_name)}`} className="group block">
      <div className="aspect-video overflow-hidden rounded-xl bg-black/30">
        <Image
          src={thumb}
          alt={s.title}
          width={640}
          height={360}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="mt-2">
        <div className="line-clamp-1 font-medium">{s.title || s.user_name}</div>
        <div className="text-sm text-text-muted">{s.user_name} • {fmtViewers(s.viewer_count)} watching</div>
      </div>
    </Link>
  );
}
