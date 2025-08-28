const TOK_URL = "https://id.twitch.tv/oauth2/token";
const HELIX_BASE = "https://api.twitch.tv/helix";

type Cached = { token: string; expiresAt: number } | null;
let cache: Cached = null;

async function getAppToken(): Promise<string> {
  if (cache && Date.now() < cache.expiresAt - 60_000) return cache.token;
  
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error("Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET environment variables");
  }
  
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });
  
  const r = await fetch(TOK_URL, { method: "POST", body });
  if (!r.ok) {
    const errorText = await r.text();
    console.error(`Twitch token fetch failed: ${r.status}`, errorText);
    throw new Error(`Token fetch failed: ${r.status} ${errorText}`);
  }
  
  const j: any = await r.json();
  cache = { token: j.access_token, expiresAt: Date.now() + j.expires_in * 1000 };
  return cache.token;
}

export async function helix(path: string, params: Record<string, string | number | boolean | undefined> = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
  const url = `${HELIX_BASE}/${path}?${qs.toString()}`;

  const token = await getAppToken();
  let r = await fetch(url, {
    headers: {
      "Client-ID": process.env.TWITCH_CLIENT_ID!,
      "Authorization": `Bearer ${token}`,
    },
    next: { revalidate: 30 },
  });

  if (r.status === 401) {
    cache = null;
    const t2 = await getAppToken();
    r = await fetch(url, {
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID!,
        "Authorization": `Bearer ${t2}`,
      },
      next: { revalidate: 30 },
    });
  }

  if (!r.ok) throw new Error(`Helix ${path} failed: ${r.status} ${await r.text()}`);
  return r.json();
}
