import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { channel: string } }): Promise<Metadata> {
  return { title: `${params.channel} • Watch` };
}

export default async function Watch({ params }: { params: { channel: string } }) {
  const parent = process.env.NEXT_PUBLIC_TWITCH_PARENT || "localhost";
  const { channel } = params;
  const playerSrc = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(parent)}&muted=false&autoplay=true`;
  const chatSrc = `https://www.twitch.tv/embed/${encodeURIComponent(channel)}/chat?parent=${encodeURIComponent(parent)}`;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="aspect-video overflow-hidden rounded-xl border border-white/5 bg-black">
          <iframe src={playerSrc} allowFullScreen scrolling="no" className="h-full w-full" />
        </div>
        <div className="mt-4 rounded-xl bg-surface p-4">
          <h2 className="font-semibold">About this stream</h2>
          <p className="mt-2 text-sm text-text-muted">Basic watch page. Tabs for Info / VODs / Clips can be added later.</p>
        </div>
      </div>
      <aside className="rounded-xl border border-white/5 bg-surface">
        <div className="h-[70vh]">
          <iframe src={chatSrc} scrolling="no" className="h-full w-full rounded-xl" />
        </div>
      </aside>
    </div>
  );
}
