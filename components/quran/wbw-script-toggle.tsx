"use client";
// Uthmani ↔ Indopak script toggle for the word-by-word Quran view.
// Reads/writes ?script=uthmani|indopak in the URL so the choice is
// bookmarkable and shareable. When the toggle flips, we push a new URL
// (soft nav, no page reload) and the parent server component re-renders
// with the new prop.
//
// Uthmani is the classical mushaf script used across the Arab world.
// Indopak is the reading script used in Pakistan, India, Bangladesh —
// a large share of Muslim readers, so this affects real discoverability.

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

type Script = "uthmani" | "indopak";
type Props = {
  current: Script;
  labels: { uthmani: string; indopak: string; groupLabel: string };
};

export function WbwScriptToggle({ current, labels }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setScript = useCallback(
    (next: Script) => {
      if (next === current) return;
      const params = new URLSearchParams(searchParams);
      if (next === "uthmani") {
        // Uthmani is the default — omit the param to keep URLs clean.
        params.delete("script");
      } else {
        params.set("script", next);
      }
      const qs = params.toString();
      const href = qs ? `?${qs}` : window.location.pathname;
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [current, router, searchParams],
  );

  return (
    <fieldset
      className="inline-flex items-center rounded-lg border border-separator bg-background p-0.5"
      aria-busy={pending}
    >
      <legend className="sr-only">{labels.groupLabel}</legend>
      {(
        [
          { id: "uthmani", label: labels.uthmani },
          { id: "indopak", label: labels.indopak },
        ] as const
      ).map((opt) => {
        const active = current === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setScript(opt.id)}
            aria-pressed={active}
            className={`focus-ring inline-flex h-9 min-w-[92px] items-center justify-center rounded-md px-3 text-xs font-medium transition-colors ${
              active
                ? "bg-accent text-[hsl(var(--accent-foreground))]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </fieldset>
  );
}
