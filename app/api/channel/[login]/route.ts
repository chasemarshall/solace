import { NextResponse } from "next/server";
import { helix } from "@/lib/twitch";

export async function GET(_req: Request, { params }: { params: { login: string } }) {
  const login = params.login;
  const users = await helix("users", { login });
  if (!users.data || users.data.length === 0) {
    return new NextResponse("Not Found", { status: 404 });
  }
  const user = users.data[0];
  const [stream, videos, clips] = await Promise.all([
    helix("streams", { user_login: login }),
    helix("videos", { user_id: user.id, first: 12, type: "archive" }),
    helix("clips", { broadcaster_id: user.id, first: 12 }),
  ]);
  const liveStream = (stream.data && stream.data[0]) || null;
  return NextResponse.json({ user, liveStream, videos: videos.data ?? [], clips: clips.data ?? [] });
}
