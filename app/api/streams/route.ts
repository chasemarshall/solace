import { NextResponse } from "next/server";
import { helix } from "@/lib/twitch";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const first = Number(searchParams.get("first") ?? "24");
  const after = searchParams.get("after") ?? undefined;
  const game_id = searchParams.get("game_id") ?? undefined;
  const language = searchParams.get("language") ?? "en";

  const data = await helix("streams", { first, after, game_id, language });
  return NextResponse.json(data);
}
