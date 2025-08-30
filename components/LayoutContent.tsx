"use client";

import { ReactNode } from "react";
import Header from "@/components/Header";
import { useImmersive } from "@/contexts/ImmersiveContext";
import CookieConsent from "@/components/CookieConsent";

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
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 max-w-7xl">
        {children}
      </main>
      <CookieConsent />
    </>
  );
}