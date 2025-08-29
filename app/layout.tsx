import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import { ImmersiveProvider } from "@/contexts/ImmersiveContext";
import { StorageAccessProvider } from "@/components/StorageAccessManager";
import LayoutContent from "@/components/LayoutContent";

export const metadata: Metadata = {
  title: "solace. - home",
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
        <ImmersiveProvider>
          <StorageAccessProvider>
            <LayoutContent>
              {children}
            </LayoutContent>
          </StorageAccessProvider>
        </ImmersiveProvider>
      </body>
    </html>
  );
}
