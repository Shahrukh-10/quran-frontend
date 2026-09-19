"use client";
// PinButton — toggle pin state for an ayah (verseKey "s:a"). Client component:
// reads localStorage on mount, mutates it on click, and syncs across tabs via
// the shared "iw:storage" custom event dispatched by lib/storage.ts helpers.
//
// Behaviour:
//  - Empty pinboard → click pins.
//  - Already pinned → click unpins.
//  - 5 pins in use and this ayah is NOT among them → button is disabled
//    (aria-disabled="true") with a title tooltip "Pinboard full (5)".
//
// Not wired into AyahCard yet — that's the integration step in a later slice.

import { getPinnedAyat, pinAyah, unpinAyah } from "@/lib/storage";
import { PinIcon, PinOffIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const MAX_PINNED = 5;

type Props = {
  verseKey: string; // "s:a"
  className?: string;
};

export function PinButton({ verseKey, className }: Props) {
  const [mounted, setMounted] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => {
      const list = getPinnedAyat();
      setPinned(list.includes(verseKey));
      setCount(list.length);
    };
    sync();
    setMounted(true);
    const onChange = () => sync();
    window.addEventListener("iw:storage", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("iw:storage", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [verseKey]);

  const full = !pinned && count >= MAX_PINNED;

  const onClick = useCallback(() => {
    if (full) return;
    if (pinned) {
      unpinAyah(verseKey);
    } else {
      pinAyah(verseKey);
    }
    // Optimistic local update — the storage event will also fire and confirm.
    const list = getPinnedAyat();
    setPinned(list.includes(verseKey));
    setCount(list.length);
  }, [full, pinned, verseKey]);

  // Pre-mount render: same shape as post-mount to avoid hydration jitter.
  // Renders a neutral "pin" icon; disabled until the client has read storage.
  const label = !mounted
    ? "Pin ayah"
    : pinned
      ? "Unpin ayah"
      : full
        ? `Pinboard full (${MAX_PINNED})`
        : "Pin ayah";

  const disabled = !mounted || full;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={mounted ? pinned : undefined}
      aria-disabled={disabled ? "true" : "false"}
      title={label}
      data-pinned={pinned ? "true" : "false"}
      data-full={full ? "true" : "false"}
      className={
        className ??
        "inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
      }
      disabled={disabled && !pinned}
    >
      {pinned ? (
        <PinOffIcon className="h-4 w-4" aria-hidden="true" />
      ) : (
        <PinIcon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
