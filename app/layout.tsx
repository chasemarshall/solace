import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import { ImmersiveProvider } from "@/contexts/ImmersiveContext";
import { StorageAccessProvider } from "@/components/player/StorageAccessManager";
import LayoutContent from "@/components/layout/LayoutContent";
import { Analytics } from "@vercel/analytics/next";
import BrowserCompatInit from "@/components/ui/BrowserCompatInit";

export const metadata: Metadata = {
  title: "solace. - home",
  description: "A clean, modern Twitch web client for browsing live streams",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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
        <BrowserCompatInit />
        <ImmersiveProvider>
          <StorageAccessProvider>
            <LayoutContent>
              {children}
            </LayoutContent>
          </StorageAccessProvider>
        </ImmersiveProvider>
        <Analytics />
      </body>
    </html>
  );
}
