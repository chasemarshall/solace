import { NextResponse } from "next/server";
import { helix } from "@/lib/twitch";

export async function GET(req: Request) {
  try {
    // Check if required environment variables are set
    if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
      console.error("Missing Twitch API credentials");
      return NextResponse.json(
        { error: "Twitch API not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const first = Number(searchParams.get("first") ?? "24");
    const after = searchParams.get("after") ?? undefined;
    const game_id = searchParams.get("game_id") ?? undefined;
    const language = searchParams.get("language") ?? "en";

    const data = await helix("streams", { first, after, game_id, language });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Streams API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch streams", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
