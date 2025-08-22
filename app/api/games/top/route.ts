import { NextResponse } from "next/server";
import { helix } from "@/lib/twitch";

export async function GET() {
  const data = await helix("games/top", { first: 24 });
  return NextResponse.json(data);
}
