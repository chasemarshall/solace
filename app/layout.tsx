import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "solace. - Clean Twitch Client",
  description: "A clean, modern Twitch web client for browsing live streams",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1a1a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg text-text min-h-screen">
        <Header />
        <main className="container mx-auto px-4 max-w-7xl">
          {children}
        </main>
      </body>
    </html>
  );
}
