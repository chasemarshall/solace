import { NextResponse } from "next/server";
import { helix } from "@/lib/twitch";

export async function GET() {
  try {
    // Check if required environment variables are set
    if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
      console.error("Missing Twitch API credentials");
      return NextResponse.json(
        { error: "Twitch API not configured" },
        { status: 500 }
      );
    }

    const data = await helix("games/top", { first: 24 });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Games API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch games", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
