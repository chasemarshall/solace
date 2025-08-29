"use client";

import { ReactNode } from "react";
import Header from "@/components/Header";
import { useImmersive } from "@/contexts/ImmersiveContext";

interface LayoutContentProps {
  children: ReactNode;
}

export default function LayoutContent({ children }: LayoutContentProps) {
  const { isImmersiveMode } = useImmersive();

  if (isImmersiveMode) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 max-w-7xl">
        {children}
      </main>
    </>
  );
}