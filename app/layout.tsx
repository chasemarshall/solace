import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Modern Twitch",
  description: "Cleaner, faster Twitch browsing UI"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-bg text-text">
        <header className="border-b border-white/5 bg-surface/60 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight">Modern Twitch</Link>
            <form action="/watch" className="hidden sm:block">
              <input
                name="channel"
                placeholder="Go to channel…"
                className="w-72 rounded-xl bg-bg px-3 py-2 text-sm outline-none ring-accent/30 focus:ring"
              />
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
