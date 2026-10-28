"use client";

import type { ReactNode } from "react";
import { ZikiProvider } from "@/lib/sim";

export function Providers({ children }: { children: ReactNode }) {
  return <ZikiProvider>{children}</ZikiProvider>;
}
