"use client";
// /[locale]/compare — side-by-side view of the user's pinned ayat.
// Client component (mounted-guard): reads getPinnedAyat() from localStorage,
// fetches each ayah via /api/ayah/{s}/{a}, and shows up to 5 columns with
// Arabic + all three English translations. Empty state, unpin, and clear-all.
//
// Kept client-side (no SSR) because the pin list lives entirely in localStorage.
// The API route is separately cacheable so each fetch is served from the edge.

import { PinButton } from "@/components/quran/pin-button";
import { cleanArabicForDisplay } from "@/lib/arabic-text";
import type { Ayah } from "@/lib/quran";
import { getPinnedAyat, unpinAyah } from "@/lib/storage";
import { XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// Local mirror of the three English translations we render. Keep in sync
// with lib/quran.ts TRANSLATIONS — duplicated here to avoid coupling this
// UI to any change in the registry order.
const TRANSLATIONS: ReadonlyArray<{ id: string; short: string; author: string }> = [
  { id: "en.sahih", short: "Sahih", author: "Saheeh International" },
  { id: "en.yusufali", short: "Yusuf Ali", author: "Yusuf Ali" },
  { id: "en.pickthall", short: "Pickthall", author: "Pickthall" },
];

type CacheState = Record<
  string,
  { status: "loading" } | { status: "ok"; ayah: Ayah } | { status: "error"; message: string }
>;

function parseKey(key: string): { s: number; a: number } | null {
  const [sStr, aStr] = key.split(":");
  if (!sStr || !aStr) return null;
  const s = Number.parseInt(sStr, 10);
  const a = Number.parseInt(aStr, 10);
  if (!Number.isInteger(s) || !Number.isInteger(a)) return null;
  return { s, a };
}

export default function ComparePage() {
  const [mounted, setMounted] = useState(false);
  const [pinned, setPinned] = useState<string[]>([]);
  const [cache, setCache] = useState<CacheState>({});

  // Read pins on mount and on cross-tab storage changes.
  useEffect(() => {
    const sync = () => setPinned(getPinnedAyat());
    sync();
    setMounted(true);
    const onChange = () => sync();
    window.addEventListener("iw:storage", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("iw:storage", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  // Fetch each pinned ayah lazily, once. We read the current cache via the
  // functional setter so this effect can honestly depend on [pinned, mounted]
  // without refetching on every cache write.
  useEffect(() => {
    if (!mounted) return;
    const controllers: AbortController[] = [];
    for (const key of pinned) {
      const parsed = parseKey(key);
      if (!parsed) {
        setCache((c) =>
          c[key] ? c : { ...c, [key]: { status: "error", message: "Bad verse key" } },
        );
        continue;
      }
      const ctrl = new AbortController();
      let started = false;
      setCache((c) => {
        if (c[key]) return c;
        started = true;
        return { ...c, [key]: { status: "loading" } };
      });
      if (!started) continue;
      controllers.push(ctrl);
      fetch(`/api/ayah/${parsed.s}/${parsed.a}`, { signal: ctrl.signal })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = (await res.json()) as Ayah;
          setCache((c) => ({ ...c, [key]: { status: "ok", ayah: data } }));
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          const message = err instanceof Error ? err.message : "Failed to load";
          setCache((c) => ({ ...c, [key]: { status: "error", message } }));
        });
    }
    return () => {
      for (const c of controllers) c.abort();
    };
  }, [pinned, mounted]);

  const onUnpin = useCallback((key: string) => {
    unpinAyah(key);
    setPinned(getPinnedAyat());
  }, []);

  const onClearAll = useCallback(() => {
    for (const key of getPinnedAyat()) unpinAyah(key);
    setPinned(getPinnedAyat());
    setCache({});
  }, []);

  // Pre-mount: render an accessible skeleton with the same page chrome so
  // the SSR HTML and first client paint match. Text "Loading" makes the
  // hydration state legible to curl-based checks and to screen readers.
  if (!mounted) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Compare</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Side-by-side view of your pinned ayat.
          </p>
        </header>
        <p className="text-sm text-neutral-500">Loading…</p>
      </main>
    );
  }

  const empty = pinned.length === 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Compare</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Side-by-side view of your pinned ayat.
            {!empty && <span className="ml-1 text-neutral-500">{pinned.length} of 5 pinned.</span>}
          </p>
        </div>
      </header>

      {empty ? (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Nothing pinned. Pin up to 5 ayat from any page to compare them side-by-side.
          </p>
        </div>
      ) : (
        <>
          <div
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible xl:grid-cols-5"
            role="list"
          >
            {pinned.map((key) => {
              const parsed = parseKey(key);
              const entry = cache[key];
              return (
                <article
                  key={key}
                  role="listitem"
                  className="flex w-[85vw] shrink-0 snap-start flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:w-[60vw] md:w-[380px] lg:w-auto dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <header className="mb-3 flex items-center justify-between">
                    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 font-mono text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                      {key}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUnpin(key)}
                      aria-label={`Unpin ${key}`}
                      title="Unpin"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
                    >
                      <XIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </header>

                  {!parsed || entry?.status === "error" ? (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Couldn't load {key}
                      {entry && entry.status === "error" ? ` — ${entry.message}` : ""}
                    </p>
                  ) : !entry || entry.status === "loading" ? (
                    <p className="text-sm text-neutral-500">Loading {key}…</p>
                  ) : (
                    <div className="flex flex-1 flex-col gap-4">
                      <p
                        dir="rtl"
                        lang="ar"
                        className="font-quran text-right text-2xl leading-loose text-neutral-900 dark:text-neutral-50"
                      >
                        {cleanArabicForDisplay(entry.ayah.arabic)}
                      </p>
                      <dl className="flex flex-col gap-3 text-sm">
                        {TRANSLATIONS.map((t) => {
                          const text = entry.ayah.translations[t.id];
                          if (!text) return null;
                          return (
                            <div key={t.id}>
                              <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                                {t.short}
                              </dt>
                              <dd className="mt-1 text-neutral-800 dark:text-neutral-200">
                                {text}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Clear all
            </button>
          </div>
        </>
      )}

      {/* Rendered but hidden — keeps PinButton in the client bundle for this
          route so future integration points (e.g. quick-pin from empty state)
          can drop it in without a fresh chunk. */}
      <div className="sr-only" aria-hidden="true">
        <PinButton verseKey="0:0" />
      </div>
    </main>
  );
}
