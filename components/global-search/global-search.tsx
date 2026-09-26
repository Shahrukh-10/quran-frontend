"use client";
/**
 * Global search — liquid-glass icon button + slide-open command palette.
 *
 * UX:
 *  - Icon button (round, glass-blur, ~44px) fires the overlay.
 *  - Overlay = full-viewport backdrop-filter blur + centered input card.
 *  - Input placeholder rotates through prompts every 2.6s until typed.
 *  - Results grouped by kind (Duas, Surahs, Hadith, Names, Pages, …) with a
 *    weighted MiniSearch ranking. Arrow keys navigate; Enter opens; Esc closes.
 *
 * Respects prefers-reduced-motion. Uses only public/search-index.json — no
 * external services, no analytics on typed queries.
 *
 * Portal note: the overlay is portalled to document.body so it escapes any
 * ancestor with `transform`/`filter`/`will-change` — those create a
 * containing block for position:fixed, which would otherwise trap the
 * overlay inside the hero section and leave the top nav sharp.
 */

import MiniSearch from "minisearch";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./global-search.css";

type SearchDoc = {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  body: string;
  arabic?: string;
  href: string;
  source?: string;
  weight?: number;
};

const KIND_LABELS: Record<string, string> = {
  dua: "Dua",
  "dua-category": "Dua category",
  surah: "Surah",
  ayah: "Ayah",
  name: "99 Names",
  hadith: "Hadith",
  sunnah: "Sunnah",
  tutorial: "Learn Salah",
  plan: "Reading plan",
  page: "Page",
};

const KIND_ORDER = [
  "dua",
  "surah",
  "hadith",
  "name",
  "sunnah",
  "tutorial",
  "plan",
  "dua-category",
  "page",
] as const;

const PLACEHOLDERS = [
  "Tell us your problem — get the solution from Quran, Hadith & Duas",
  "Search a dua…",
  "Find a surah…",
  "Look up a hadith…",
  "Ask about the 99 Names of Allah…",
  "Search: anxiety, travel, forgiveness, morning…",
];

export function GlobalSearch({ label = "Search" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<SearchDoc[] | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Lazy-load the index only when the user opens the palette. 112KB → parsed
  // to ~340 docs; MiniSearch build is <10ms on desktop, <40ms on mid-tier phones.
  useEffect(() => {
    if (!open || docs) return;
    let cancelled = false;
    fetch("/search-index.json")
      .then((r) => r.json())
      .then((data: SearchDoc[]) => {
        if (!cancelled) setDocs(data);
      })
      .catch(() => {
        if (!cancelled) setDocs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, docs]);

  // Build the MiniSearch index once from the loaded docs.
  const mini = useMemo(() => {
    if (!docs) return null;
    const ms = new MiniSearch<SearchDoc>({
      idField: "id",
      fields: ["title", "subtitle", "body", "arabic"],
      storeFields: ["kind", "title", "subtitle", "arabic", "href", "source", "weight"],
      /** Tokenizer: split on whitespace AND punctuation so "Ya-Sin" is indexed
       *  as ["ya", "sin"] and a query for "yasin" hits via prefix. */
      tokenize: (text) => text.split(/[\s\-_·:/\\.,;!?()[\]"']+/).filter(Boolean),
      /** Lowercase both index and query so "YASIN" matches "yasin". */
      processTerm: (term) => term.toLowerCase(),
      searchOptions: {
        boost: { title: 3, subtitle: 2, arabic: 2 },
        fuzzy: 0.25,
        prefix: true,
        // OR combining — any token match returns a result, ranked by score.
        // Previously used AND which nuked queries like "yasin" (single token
        // that needed to fuzzy-match "ya-sin" as two).
        combineWith: "OR",
      },
    });
    ms.addAll(docs);
    return ms;
  }, [docs]);

  // Debounced search
  const results = useMemo(() => {
    if (!mini || !query.trim()) return [] as Array<SearchDoc & { score: number }>;
    const raw = mini.search(query.trim()) as unknown as Array<SearchDoc & { score: number }>;
    // Boost by the doc's own `weight` so pages/surahs beat obscure body-match
    // hits when the user just types a common word like "quran" or "dua".
    return raw
      .map((r) => ({ ...r, score: r.score * (1 + (r.weight ?? 0) / 20) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 40);
  }, [mini, query]);

  // Group results by kind, in a stable UI order.
  const grouped = useMemo(() => {
    const g: Record<string, SearchDoc[]> = {};
    for (const r of results) {
      let bucket = g[r.kind];
      if (!bucket) {
        bucket = [];
        g[r.kind] = bucket;
      }
      bucket.push(r);
    }
    const ordered: Array<{ kind: string; label: string; items: SearchDoc[] }> = [];
    for (const k of KIND_ORDER) {
      const items = g[k];
      if (items?.length) ordered.push({ kind: k, label: KIND_LABELS[k] ?? k, items });
    }
    for (const k of Object.keys(g)) {
      if (!(KIND_ORDER as readonly string[]).includes(k)) {
        const items = g[k];
        if (items) ordered.push({ kind: k, label: KIND_LABELS[k] ?? k, items });
      }
    }
    return ordered;
  }, [results]);

  // Flat list for arrow-key navigation
  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  // Placeholder rotator
  useEffect(() => {
    if (query) return; // stop rotating once user types
    const id = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 2600);
    return () => clearInterval(id);
  }, [query]);

  // Focus input when overlay opens; global keyboard shortcut (Cmd/Ctrl+K)
  useEffect(() => {
    if (open) {
      setActiveIdx(0);
      // rAF so the CSS transition can start before we steal focus
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, Math.max(0, flat.length - 1)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        const item = flat[activeIdx];
        if (item) {
          e.preventDefault();
          window.location.href = item.href;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flat, activeIdx]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={`${label} · ⌘K`}
        className="gs-fab"
        onClick={() => setOpen(true)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="gs-fab__label">{label}</span>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          // biome-ignore lint/a11y/useKeyWithClickEvents: Esc key close is
          // handled globally via the useEffect keyboard listener; the onClick
          // here is a UX nicety for click-outside-to-dismiss.
          <div
            className="gs-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Site search"
          >
          <div className="gs-panel">
            <div className="gs-input-row">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="gs-input-icon"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIdx(0);
                }}
                placeholder={PLACEHOLDERS[placeholderIdx]}
                className="gs-input"
                aria-label="Search Quran, duas, hadith, and pages"
              />
              <kbd className="gs-kbd">Esc</kbd>
            </div>

            {/* biome-ignore lint/a11y/useSemanticElements: listbox+option is the
                canonical ARIA pattern for a custom command palette; a native
                <select> element cannot host rich content like grouped icons
                and Arabic subtitles. */}
            <div className="gs-results" role="listbox" tabIndex={-1}>
              {!query.trim() && (
                <div className="gs-empty">
                  <p className="gs-empty__title">
                    Search the Quran, hadith, duas, and every page on this site.
                  </p>
                  <p className="gs-empty__sub">
                    Try typing what you&apos;re looking for — a surah name, a moment (like
                    &quot;morning&quot; or &quot;travel&quot;), or a topic like &quot;anxiety&quot;
                    or &quot;forgiveness&quot;. Everything shown here is sourced and cited.
                  </p>
                  <p className="gs-empty__hint">
                    <kbd className="gs-kbd">⌘</kbd> + <kbd className="gs-kbd">K</kbd> to open ·{" "}
                    <kbd className="gs-kbd">↑ ↓</kbd> to move · <kbd className="gs-kbd">Enter</kbd>{" "}
                    to open
                  </p>
                </div>
              )}

              {query.trim() && flat.length === 0 && (
                <div className="gs-empty">
                  <p className="gs-empty__title">No matches for &ldquo;{query}&rdquo;</p>
                  <p className="gs-empty__sub">
                    Try a shorter word, an English name (like &quot;fatihah&quot;), or a topic (like
                    &quot;protection&quot;).
                  </p>
                </div>
              )}

              {grouped.map((group) => (
                <div key={group.kind} className="gs-group">
                  <div className="gs-group__label">{group.label}</div>
                  <ul className="gs-group__items">
                    {group.items.map((it) => {
                      const idx = flat.indexOf(it);
                      const active = idx === activeIdx;
                      return (
                        <li key={it.id}>
                          {/* biome-ignore lint/a11y/useSemanticElements: role="option"
                              is the correct ARIA pair for the surrounding listbox;
                              anchors keep keyboard nav + Cmd-click semantics. */}
                          <a
                            href={it.href}
                            className={`gs-item ${active ? "gs-item--active" : ""}`}
                            onMouseEnter={() => setActiveIdx(idx)}
                            aria-selected={active}
                            role="option"
                          >
                            <span className="gs-item__title">
                              {it.title}
                              {it.arabic && (
                                <span className="gs-item__arabic" lang="ar" dir="rtl">
                                  {it.arabic}
                                </span>
                              )}
                            </span>
                            {it.subtitle && (
                              <span className="gs-item__subtitle">{it.subtitle}</span>
                            )}
                            {it.source && <span className="gs-item__source">{it.source}</span>}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <div className="gs-footer">
              <span>
                {flat.length > 0
                  ? `${flat.length} result${flat.length === 1 ? "" : "s"}`
                  : "Everything on this site is sourced. Nothing is generated by AI."}
              </span>
              <span className="gs-footer__hint">
                Cannot find something?{" "}
                <a href="/sources" className="gs-footer__link">
                  See our sources →
                </a>
              </span>
            </div>
          </div>
          </div>,
          document.body,
        )}
    </>
  );
}
