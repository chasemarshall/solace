import type { Metadata } from "next";
import WatchPlayer from "@/components/WatchPlayer";
import TwitchChat from "@/components/TwitchChat";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { channel: string } }): Promise<Metadata> {
  return { title: `${params.channel} \u2022 Watch` };
}

export default async function Watch({ params }: { params: { channel: string } }) {
  const parent = process.env.NEXT_PUBLIC_TWITCH_PARENT || "localhost";
  const { channel } = params;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <WatchPlayer channel={channel} parent={parent} />
        <div className="mt-4 rounded-xl bg-surface p-4">
          <h2 className="font-semibold">About this stream</h2>
          <p className="mt-2 text-sm text-text-muted">Basic watch page. Tabs for Info / VODs / Clips can be added later.</p>
        </div>
      </div>
      <aside className="rounded-xl border border-white/5 bg-surface">
        <div className="h-[70vh]">
          <TwitchChat channel={channel} />
        </div>
      </aside>
    </div>
  );
}

