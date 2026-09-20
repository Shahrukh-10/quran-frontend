"use client";
// Mounts once on the account page and installs the debounced sync listener.
// Kept as a separate component so it's easy to relocate to the root layout later
// (once we're comfortable with the sync-on-every-write pattern).

import { useEffect } from "react";
import { installAutoSync } from "@/lib/auth-client";

export function AutoSyncInstaller() {
  useEffect(() => installAutoSync(), []);
  return null;
}
