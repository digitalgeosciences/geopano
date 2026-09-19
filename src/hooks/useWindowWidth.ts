import { useEffect, useState } from "react";

export function useWindowWidth() {
  const [width, setWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  useEffect(() => {
    const fn = () => setWidth(window.innerWidth);
    window.addEventListener("resize", fn, { passive: true });
    return () => window.removeEventListener("resize", fn);
  }, []);
  return width;
}

/**
 * Single source of truth for the mobile breakpoint. Must stay in sync with the
 * `@media (max-width: 768px)` blocks in index.css — JS and CSS disagreeing is
 * what produced the broken 640–767px band (mobile header, desktop panels).
 */
export const MOBILE_BREAKPOINT = 768;

export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  return useWindowWidth() < breakpoint;
}
