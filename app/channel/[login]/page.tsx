export const dynamic = "force-dynamic";

type ChannelData = {
  user: any;
  liveStream: any | null;
  videos: any[];
  clips: any[];
};

export default async function ChannelPage({ params }: { params: { login: string } }) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const r = await fetch(`${base}/api/channel/${encodeURIComponent(params.login)}`, { cache: "no-store" });
  if (!r.ok) return <div>Channel not found.</div>;
  const data: ChannelData = await r.json();
  const user = data.user;

  return (
    <div>
      <h1 className="text-2xl font-semibold">{user.display_name}</h1>
      <p className="text-sm text-text-muted">@{user.login}</p>

      <section className="mt-6 space-y-6">
        <div>
          <h2 className="font-semibold">Status</h2>
          {data.liveStream ? (
            <p className="text-sm text-text-muted">Live: {data.liveStream.title}</p>
          ) : (
            <p className="text-sm text-text-muted">Currently offline.</p>
          )}
        </div>

        <div>
          <h2 className="font-semibold">Recent VODs</h2>
          <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.videos.map(v => (
              <li key={v.id} className="rounded-xl bg-surface p-3">
                <div className="line-clamp-2 text-sm">{v.title}</div>
                <div className="text-xs text-text-muted mt-1">{new Date(v.published_at).toLocaleDateString()}</div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-semibold">Top Clips</h2>
          <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.clips.map(c => (
              <li key={c.id} className="rounded-xl bg-surface p-3">
                <div className="line-clamp-2 text-sm">{c.title}</div>
                <div className="text-xs text-text-muted mt-1">{c.creator_name} • {c.view_count} views</div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
