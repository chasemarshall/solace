import { NextResponse } from "next/server";

let cached: { token: string; expiresAt: number } | null = null;

export async function GET() {
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return NextResponse.json({ access_token: cached.token, cached: true });
  }
  const body = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID!,
    client_secret: process.env.TWITCH_CLIENT_SECRET!,
    grant_type: "client_credentials",
  });
  const r = await fetch("https://id.twitch.tv/oauth2/token", { method: "POST", body });
  const j = await r.json();
  cached = { token: j.access_token, expiresAt: Date.now() + j.expires_in * 1000 };
  return NextResponse.json({ access_token: cached.token, cached: false });
}
