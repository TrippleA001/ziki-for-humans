"use client";

import { useEffect, useState } from "react";

export function useNow(interval = 1000): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return now;
}

/**
 * False during server rendering and the first client render, true afterwards.
 * Use it to gate anything that reads the wall clock: seeded timestamps are
 * generated when the module loads, so the server and the browser disagree by a
 * few milliseconds — enough to cross a minute and break hydration.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
