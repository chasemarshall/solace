import { NextResponse } from "next/server";
import { helix } from "@/lib/twitch";

export async function GET(_req: Request, { params }: { params: { login: string } }) {
  try {
    // Check if required environment variables are set
    if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
      console.error("Missing Twitch API credentials");
      return NextResponse.json(
        { error: "Twitch API not configured" },
        { status: 500 }
      );
    }

    const login = params.login;
    
    // Get user data
    const users = await helix("users", { login });
    if (!users.data || users.data.length === 0) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }
    
    const user = users.data[0];
    
    // Get additional data in parallel
    const [streamResult, videosResult, clipsResult] = await Promise.allSettled([
      helix("streams", { user_login: login }),
      helix("videos", { user_id: user.id, first: 12, type: "archive" }),
      helix("clips", { broadcaster_id: user.id, first: 12 }),
    ]);
    
    // Handle results with error handling
    const liveStream = streamResult.status === 'fulfilled' && streamResult.value.data && streamResult.value.data[0] ? streamResult.value.data[0] : null;
    const videos = videosResult.status === 'fulfilled' ? (videosResult.value.data ?? []) : [];
    const clips = clipsResult.status === 'fulfilled' ? (clipsResult.value.data ?? []) : [];
    
    return NextResponse.json({ 
      user, 
      liveStream, 
      videos, 
      clips 
    });
  } catch (error) {
    console.error("Channel API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch channel data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
