"use client";
// Register the service worker in the browser. Runs once on client mount.
// Kept in its own component so the layout stays a server component.

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* Registration failed — no offline mode this session. */
    });
  }, []);
  return null;
}
