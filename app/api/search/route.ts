import { NextResponse } from "next/server";
import { helix } from "@/lib/twitch/api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  if (!q) return NextResponse.json({ channels: [] });
  const channels = await helix("search/channels", { query: q, first: 20 });
  return NextResponse.json({ channels: channels.data ?? [] });
}
