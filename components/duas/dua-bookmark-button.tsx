"use client";
// Small client-only bookmark button for a dua page. Reads/writes localStorage.

import { getStore, toggleDuaBookmark } from "@/lib/storage";
import { BookmarkIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function DuaBookmarkButton({ slug }: { slug: string }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(getStore().duaBookmarks.includes(slug));
    const listen = () => setOn(getStore().duaBookmarks.includes(slug));
    window.addEventListener("iw:storage", listen);
    return () => window.removeEventListener("iw:storage", listen);
  }, [slug]);

  const toggle = useCallback(() => {
    setOn(toggleDuaBookmark(slug));
  }, [slug]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Remove bookmark" : "Bookmark this dua"}
      className={`focus-ring inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-micro ease-spring ${
        on ? "text-accent bg-accent-muted" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      <BookmarkIcon size={18} fill={on ? "currentColor" : "none"} strokeWidth={1.5} />
    </button>
  );
}
