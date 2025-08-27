import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Modern Twitch - Clean Twitch Client",
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
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {children}
        </div>
      </body>
    </html>
  );
}
