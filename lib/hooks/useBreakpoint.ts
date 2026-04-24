"use client";

import { useEffect, useState } from "react";

/**
 * useBreakpoint — renvoie la taille d'écran courante.
 * Breakpoints : mobile <768, tablet <1024, desktop >=1024
 */
export type Breakpoint = "mobile" | "tablet" | "desktop";

function getBp(): Breakpoint {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => getBp());
  useEffect(() => {
    const onResize = () => setBp(getBp());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return bp;
}

export function useIsMobile(): boolean {
  return useBreakpoint() === "mobile";
}
