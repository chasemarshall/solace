export async function loadTwitchSDK() {
  if (typeof window === "undefined") return null as any;
  if ((window as any).Twitch) return (window as any).Twitch;
  await new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://embed.twitch.tv/embed/v1.js";
    s.onload = () => res();
    s.onerror = () => rej(new Error("Twitch SDK failed to load"));
    document.head.appendChild(s);
  });
  return (window as any).Twitch;
}
