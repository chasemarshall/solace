"use client";

import { ReactNode } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useImmersive } from "@/contexts/ImmersiveContext";
import CookieConsent from "@/components/ui/CookieConsent";

interface LayoutContentProps {
  children: ReactNode;
}

export default function LayoutContent({ children }: LayoutContentProps) {
  const { isImmersiveMode } = useImmersive();

  if (isImmersiveMode) {
    return (
      <>
        <Header />
        <main className="w-full">
          {children}
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 max-w-7xl">
        {children}
      </main>
      <Footer />
      <CookieConsent />
    </>
  );
}