"use client";
// Client-side filter for the Quran index. Filters .row nodes in-place based on
// their data-search attribute. Zero JS on first paint if you don't type.

import { useEffect, useRef } from "react";

export function QuranIndexSearch() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const onInput = () => {
      const q = el.value.trim().toLowerCase();
      const rows = document.querySelectorAll<HTMLLIElement>("[data-search]");
      const visibleGroups = new Set<HTMLElement>();
      rows.forEach((row) => {
        const hay = row.dataset.search ?? "";
        const show = !q || hay.includes(q);
        row.style.display = show ? "" : "none";
        if (show) {
          const g = row.closest<HTMLElement>(".group");
          if (g) visibleGroups.add(g);
        }
      });
      // hide empty groups
      document.querySelectorAll<HTMLElement>(".group").forEach((g) => {
        g.style.display = q && !visibleGroups.has(g) ? "none" : "";
      });
    };
    el.addEventListener("input", onInput);
    return () => el.removeEventListener("input", onInput);
  }, []);

  return (
    <div className="search-field">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        placeholder="Search 114 surahs — by name, meaning, or number…"
        aria-label="Search surahs"
        autoComplete="off"
      />
    </div>
  );
}
