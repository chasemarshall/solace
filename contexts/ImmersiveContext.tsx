"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ImmersiveContextType {
  isImmersiveMode: boolean;
  setIsImmersiveMode: (value: boolean) => void;
}

const ImmersiveContext = createContext<ImmersiveContextType | undefined>(undefined);

export function ImmersiveProvider({ children }: { children: ReactNode }) {
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);

  return (
    <ImmersiveContext.Provider value={{ isImmersiveMode, setIsImmersiveMode }}>
      {children}
    </ImmersiveContext.Provider>
  );
}

export function useImmersive() {
  const context = useContext(ImmersiveContext);
  if (context === undefined) {
    throw new Error("useImmersive must be used within an ImmersiveProvider");
  }
  return context;
}