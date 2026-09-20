"use client";
// Top navigation progress bar that appears the instant a Link is clicked
// and stays until the destination route's loading.tsx / page.tsx starts
// streaming. Uses Next 15's `useLinkStatus` hook or a router-events poll.
//
// Design: 2px fixed bar at top: 0 with a gradient sweep. Zero layout
// impact; matches app accent color so it feels native.

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show the bar briefly on every route change. In App Router this fires
    // AFTER the transition completes (Next commits pathname on completion),
    // which is exactly when we want to hide it. To also show it DURING the
    // transition, we hook Link clicks via a global click handler.
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 350);
    return () => clearTimeout(t);
  }, [pathname, search]);

  useEffect(() => {
    // Hook every same-origin Link click to show the bar immediately.
    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement)?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      // External links: skip.
      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return;
      } catch {
        return;
      }
      setVisible(true);
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true } as EventListenerOptions);
  }, []);

  if (!visible) return null;
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 9999,
        pointerEvents: "none",
        background: "linear-gradient(90deg, transparent 0%, hsl(var(--accent) / 0.9) 50%, transparent 100%)",
        backgroundSize: "50% 100%",
        animation: "nav-progress 1.1s linear infinite",
      }}
    />
  );
}
