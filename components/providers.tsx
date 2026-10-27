"use client";

import type { ReactNode } from "react";
import { ZikiProvider } from "@/lib/sim";
import { ToastHost } from "./ui";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ZikiProvider>
      {children}
      <ToastHost />
    </ZikiProvider>
  );
}
