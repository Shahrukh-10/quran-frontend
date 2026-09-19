"use client";
// MushafReader — full 604-page Madinah muṣḥaf, page-fold animation, resumes
// where the reader left off.
//
// Architecture:
//   • All pages come in as props from the Server Component (built once at
//     server-start via lib/mushaf.ts). No client-side fetching.
//   • StPageFlip is script-loaded from CDN on mount (adds ~44KB) — the only
//     library capable of a true 3D page-turn with paper curl.
//   • The mount div is imperatively populated. React NEVER diffs its children
//     (suppressHydrationWarning + ref-based DOM writes) to avoid the classic
//     "removeChild not a child" hydration crash.
//   • Current page is persisted to localStorage (key: `iw.v1.mushaf.page`).
//     On next visit we auto-flip to it (silent, no animation) so we open
//     exactly where the reader stopped.
//   • For 120fps: transform-only animation surface, will-change hints,
//     backface-visibility hidden. StPageFlip already animates on the
//     compositor thread; we just avoid layout thrash around it.

import type { MushafPage } from "@/lib/mushaf";
import { ExpandIcon, MinimizeIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = { pages: MushafPage[] };

const STORAGE_KEY = "iw.v1.mushaf.page";
const FOCUS_STORAGE_KEY = "iw.v1.mushaf.focus";

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"] as const;
function toArabicNumeral(n: number): string {
  return String(n)
    .split("")
    .map((d) => ARABIC_DIGITS[Number(d)] ?? d)
    .join("");
}

type PageFlipInstance = {
  loadFromHTML: (pages: NodeListOf<Element> | Element[]) => void;
  flipNext: (corner?: "top" | "bottom") => void;
  flipPrev: (corner?: "top" | "bottom") => void;
  flip: (n: number, corner?: "top" | "bottom") => void;
  turnToPage: (n: number) => void;
  on: (event: string, cb: (e: { data: number }) => void) => void;
  destroy?: () => void;
};
type PageFlipConstructor = new (el: HTMLElement, opts: Record<string, unknown>) => PageFlipInstance;
type StPageFlipGlobal = { PageFlip: PageFlipConstructor };
declare global {
  interface Window {
    St?: StPageFlipGlobal;
  }
}

function renderPage(p: MushafPage, side: "left" | "right"): HTMLDivElement {
  const pg = document.createElement("div");
  pg.className = `mushaf-page ${side}`;
  pg.setAttribute("role", "article");
  const firstName = p.surahNames[0] ?? "";
  pg.setAttribute("aria-label", `${firstName} muṣḥaf page ${p.page} of 604, juz ${p.juz}`);
  pg.setAttribute("lang", "ar");
  pg.setAttribute("dir", "rtl");

  const header = document.createElement("div");
  header.className = "page-header";
  header.innerHTML = `
    <span class="juz-label">Juz ${toArabicNumeral(p.juz)}</span>
    <span class="surah-label">${p.surahNames.join(" · ")}</span>
    <span>﴿ ${toArabicNumeral(p.page)} ﴾</span>
  `;
  pg.appendChild(header);

  const body = document.createElement("div");
  body.className = "page-body";

  if (p.surahHeader) {
    const sh = document.createElement("div");
    sh.className = "surah-header";
    sh.innerHTML = `
      <div class="surah-name-ar">سُورَة ${p.surahHeader.nameAr}</div>
      <div class="surah-caption">${p.surahHeader.name} · ${
        p.surahHeader.meccan ? "Meccan" : "Medinan"
      } · ${p.surahHeader.ayat} āyāt</div>
    `;
    body.appendChild(sh);
  }
  if (p.bismillah) {
    const b = document.createElement("div");
    b.className = "bismillah";
    b.textContent = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
    body.appendChild(b);
  }

  // Ayat rendered as an inline flowing paragraph — classic muṣḥaf feel.
  const flow = document.createElement("p");
  flow.className = "ayah-flow";
  for (const a of p.ayat) {
    const span = document.createElement("span");
    span.className = "ayah";
    // Each ayah followed by an ornate ayah-marker with its number in-surah.
    span.innerHTML = `${a.text} <span class="ayah-marker">${toArabicNumeral(a.a)}</span> `;
    flow.appendChild(span);
  }
  body.appendChild(flow);

  pg.appendChild(body);

  const footer = document.createElement("div");
  footer.className = "page-footer";
  footer.textContent = toArabicNumeral(p.page);
  pg.appendChild(footer);

  return pg;
}

export function MushafReader({ pages }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const flipRef = useRef<PageFlipInstance | null>(null);
  const initializedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [current, setCurrent] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [focus, setFocus] = useState(false);

  const total = pages.length;

  const initialize = useCallback(() => {
    if (initializedRef.current) return;
    const container = mountRef.current;
    if (!container || !window.St) return;
    initializedRef.current = true;
    container.innerHTML = "";

    const built = pages.map((p, i) => renderPage(p, i % 2 === 0 ? "right" : "left"));
    for (const pg of built) container.appendChild(pg);

    // Sizing: fit inside the viewport WITHOUT clipping the page footer. We
    // measure the space between the top of the stage and the top of the
    // controls row, subtract padding, and derive the tallest book we can show.
    // Falls back to a sensible min so tiny viewports still render usefully.
    // In focus mode we ignore stageRect.top (chrome is hidden) and let the
    // book fill nearly the whole viewport, minus room for the floating
    // controls pill at the bottom.
    const stageRect = container.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const isFocus = document.documentElement.classList.contains("mushaf-focus");
    const usableH = isFocus
      ? Math.max(400, viewportH - 100) // room for floating controls
      : Math.max(400, viewportH - stageRect.top - 140);
    const heightCap = Math.min(usableH, isFocus ? 1000 : 780);
    const widthFromH = Math.round(heightCap / 1.4);
    // On desktop, two-page spread — so the flipper is 2× the single-page width.
    const isPortrait = window.innerWidth < 768;
    const singleW = isPortrait
      ? Math.min(window.innerWidth - 20, isFocus ? 520 : 460)
      : Math.min((window.innerWidth - 40) / 2, widthFromH, isFocus ? 560 : 460);
    const width = singleW;
    const height = Math.round(width * 1.4);

    flipRef.current = new window.St.PageFlip(container, {
      width,
      height,
      // "fixed" — respect the computed width/height rather than stretching to
      // parent width (which was making the book taller than the viewport).
      size: "fixed",
      minWidth: 220,
      maxWidth: 600,
      minHeight: 308,
      maxHeight: 1000,
      drawShadow: true,
      // 500ms feels closest to real paper on 120Hz displays — 900ms felt heavy.
      flippingTime: 520,
      usePortrait: isPortrait,
      autoSize: false,
      startZIndex: 5,
      maxShadowOpacity: 0.5,
      showCover: false,
      mobileScrollSupport: true,
      swipeDistance: 30,
      clickEventForward: true,
      useMouseEvents: true,
    });

    flipRef.current.loadFromHTML(built);

    // Auto-fit each page's ayah-flow so no content overflows the fixed page
    // height. StPageFlip clones nodes into .stf__item; we run on those (the
    // originals in `built` are hidden). Runs once after loadFromHTML settles
    // and again on every flip so newly-shown pages get sized too.
    const fitAllPages = () => {
      // StPageFlip puts BOTH .mushaf-page and .stf__item on the SAME element,
      // so descendant-combinator would miss them. Use compound-class instead.
      const items = container.querySelectorAll<HTMLElement>(".mushaf-page.stf__item");
      // In focus mode the page is much larger, so we can afford a higher
      // minimum readable size. Non-focus keeps the tight 9px floor so busy
      // pages still fit within the inline book.
      const inFocus = document.documentElement.classList.contains("mushaf-focus");
      const minSize = inFocus ? 16 : 9;
      for (const el of items) {
        const flow = el.querySelector<HTMLElement>(".ayah-flow");
        if (!flow) continue;
        flow.style.fontSize = "";
        let size = Number.parseFloat(getComputedStyle(flow).fontSize) || 15;
        let attempts = 40;
        while (el.scrollHeight > el.clientHeight + 1 && attempts-- > 0 && size > minSize) {
          size -= 0.5;
          flow.style.fontSize = `${size}px`;
        }
      }
    };
    // Initial fit after the flip lib has cloned nodes
    requestAnimationFrame(() => requestAnimationFrame(fitAllPages));

    // Resume: read saved page BEFORE wiring the flip listener so the initial
    // jump doesn't persist page-1 over the user's saved position.
    let resumeTo = 1;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const n = Number.parseInt(saved, 10);
        if (Number.isFinite(n) && n >= 1 && n <= total) resumeTo = n;
      }
    } catch {
      /* no localStorage — fine */
    }

    flipRef.current.on("flip", (e: { data: number }) => {
      const idx = e.data + 1;
      setCurrent(idx);
      setPageInput(String(idx));
      try {
        localStorage.setItem(STORAGE_KEY, String(idx));
      } catch {
        /* private mode etc. */
      }
      // Re-fit newly-shown pages (StPageFlip lazy-mounts adjacent items)
      requestAnimationFrame(() => requestAnimationFrame(fitAllPages));
    });

    if (resumeTo !== 1) {
      // turnToPage is instant (no animation) — perfect for a silent resume.
      flipRef.current.turnToPage(resumeTo - 1);
      setCurrent(resumeTo);
      setPageInput(String(resumeTo));
    }

    setReady(true);
  }, [pages, total]);

  useEffect(() => {
    if (window.St) {
      initialize();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.js";
    s.async = true;
    s.onload = () => initialize();
    s.onerror = () => {
      if (mountRef.current) {
        mountRef.current.innerHTML =
          '<p class="text-muted-foreground p-8 text-center">Could not load the page-flip library. Try refreshing.</p>';
      }
    };
    document.body.appendChild(s);

    const onKey = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
      // Arabic reads right-to-left, so "next" means turning to a HIGHER page
      // number which visually goes to the LEFT. Reflect that in the keybinding.
      if (ev.key === "ArrowRight") flipRef.current?.flipPrev();
      if (ev.key === "ArrowLeft") flipRef.current?.flipNext();
      if (ev.key === "Home") flipRef.current?.turnToPage(0);
      if (ev.key === "End") flipRef.current?.turnToPage(total - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (mountRef.current) mountRef.current.innerHTML = "";
      flipRef.current = null;
      initializedRef.current = false;
    };
  }, [initialize, total]);

  const goto = (n: number) => {
    const idx = Math.max(0, Math.min(n - 1, total - 1));
    flipRef.current?.flip(idx);
  };

  const clearResume = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* no-op */
    }
    flipRef.current?.turnToPage(0);
  };

  // Focus mode: hide site chrome (header, footer, hero, page controls) and
  // expand the book to fill the viewport. State persists in localStorage so
  // the user's preferred reading mode carries across visits.
  const toggleFocus = useCallback(() => {
    setFocus((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(FOCUS_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* private mode etc. */
      }
      return next;
    });
  }, []);

  // Hydrate focus state from localStorage on mount (SSR-safe: default false)
  useEffect(() => {
    try {
      if (localStorage.getItem(FOCUS_STORAGE_KEY) === "1") setFocus(true);
    } catch {
      /* no-op */
    }
  }, []);

  // Sync <html class="mushaf-focus"> for global CSS to hide header/footer.
  // Also lock body scroll so the book fully occupies the viewport.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    if (focus) {
      html.classList.add("mushaf-focus");
      const prevOverflow = body.style.overflow;
      body.style.overflow = "hidden";
      return () => {
        html.classList.remove("mushaf-focus");
        body.style.overflow = prevOverflow;
      };
    }
    html.classList.remove("mushaf-focus");
  }, [focus]);

  // ESC key to exit focus mode
  useEffect(() => {
    if (!focus) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setFocus(false);
        try {
          localStorage.setItem(FOCUS_STORAGE_KEY, "0");
        } catch {
          /* no-op */
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus]);

  // When focus mode changes size the viewport, StPageFlip needs to re-measure.
  // Its own resize handler doesn't fire on class-only viewport changes with
  // size:"fixed", so we destroy and re-create the flipper with new dimensions.
  // Skip on the initial mount (focus === false, ready === false → not ready
  // yet; ready becomes true only after first init).
  //
  // NOTE: we intentionally do NOT list `current` in deps — that would
  // destroy/re-init on every page flip. We read the latest page from a ref
  // so the effect only fires when focus actually toggles.
  const currentRef = useRef(current);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);
  const prevFocusRef = useRef(focus);
  useEffect(() => {
    if (!ready) return;
    if (prevFocusRef.current === focus) return;
    prevFocusRef.current = focus;
    const resumePage = currentRef.current;
    // Note: StPageFlip's `destroy()` empties the container aggressively —
    // it can also clobber the ref div itself in some versions. So we clear
    // by hand and drop our own state, then re-init on the next frame.
    if (mountRef.current) mountRef.current.innerHTML = "";
    flipRef.current = null;
    initializedRef.current = false;
    // Do NOT call setReady(false) — that would toggle React's conditional
    // "Preparing the muṣḥaf…" back on and cause an extra re-render before
    // the re-init lands. The container is imperative anyway; we just
    // repopulate it in place.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        initialize();
        if (resumePage > 1) {
          setTimeout(() => {
            flipRef.current?.turnToPage(resumePage - 1);
            setCurrent(resumePage);
            setPageInput(String(resumePage));
          }, 50);
        }
      });
    });
  }, [focus, ready, initialize]);

  return (
    <>
      <style>{`
        /* Stage: soft radial to lift the book off the page background.
           overflow: hidden clips any StPageFlip "paper curl" pixel that
           tries to render outside the book bounds during a page turn —
           without it, mid-flip the animating page bleeds into the empty
           space below, showing a duplicate ghost of the animation. */
        .mushaf-stage {
          background: radial-gradient(ellipse at center, hsl(var(--foreground) / 0.06), transparent 65%);
          padding: 12px 0 24px;
          border-radius: 1.5rem;
          transform: translateZ(0);
          will-change: transform;
          perspective: 2400px;
          overflow: hidden;
          position: relative;
        }
        .dark .mushaf-stage { background: radial-gradient(ellipse at center, rgba(0,0,0,.55), transparent 65%); }

        .mushaf-page {
          background: radial-gradient(circle at 15% 15%, rgba(255,255,255,.4), transparent 40%),
                      linear-gradient(135deg, #faf6ec, #f2ebd5);
          color: #2b241b;
          padding: 24px 22px 30px;
          border-radius: 4px;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 0 0 1px rgba(168,135,74,.15), inset 0 0 40px rgba(168,135,74,.06);
          font-family: var(--font-amiri-quran), "Amiri", serif;
          /* GPU compositor hints — critical for 120fps folding */
          transform: translateZ(0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          contain: layout paint;
        }
        .dark .mushaf-page {
          background: radial-gradient(circle at 15% 15%, rgba(255,255,255,.05), transparent 40%),
                      linear-gradient(135deg, #1a1712, #221d15);
          color: #e8dcc0;
        }
        .mushaf-page::before { content:""; position:absolute; inset:14px; border:1px solid rgba(168,135,74,.35); border-radius:2px; pointer-events:none; }
        .mushaf-page::after  { content:""; position:absolute; inset:20px; border:.5px solid rgba(168,135,74,.2); border-radius:1px; pointer-events:none; }

        .mushaf-page .page-header {
          display:flex; justify-content:space-between; align-items:center; gap:12px;
          font-family: -apple-system, sans-serif;
          font-size:11px; color:rgba(168,135,74,.75); letter-spacing:.06em; text-transform:uppercase;
          padding:0 8px 12px; margin-bottom:8px; border-bottom:.5px solid rgba(168,135,74,.25);
        }
        .mushaf-page .surah-label { font-weight:600; color:currentColor; max-width:65%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:center; }

        .mushaf-page .page-body {
          text-align: justify;
          direction: rtl;
          overflow: hidden;
          /* Reserve room for the pinned footer so text never overlaps it */
          padding-bottom: 28px;
        }
        .mushaf-page .ayah-flow {
          font-size: clamp(13px, 1.15vw, 17px);
          line-height: 1.85;
          margin: 0;
          text-align: justify;
          text-align-last: center;
          word-spacing: .04em;
        }
        .mushaf-page .ayah { display:inline; }
        .mushaf-page .ayah-marker {
          display:inline-flex; align-items:center; justify-content:center;
          min-width:1.9em; height:1.9em; border-radius:99px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.7), transparent 50%),
                      radial-gradient(circle, #c9a961, #a8874a);
          color:#fff; font-family:-apple-system,sans-serif; font-size:.5em; font-weight:600;
          margin:0 .35em; vertical-align:middle;
          box-shadow: 0 1px 2px rgba(168,135,74,.4); direction:ltr;
        }
        .mushaf-page .surah-header {
          margin: 4px 0 10px; padding: 8px 10px; text-align: center;
          background: linear-gradient(180deg, rgba(168,135,74,.1), rgba(168,135,74,.02));
          border-top: 1px solid rgba(168,135,74,.4); border-bottom: 1px solid rgba(168,135,74,.4);
        }
        .mushaf-page .surah-name-ar { font-family: var(--font-amiri-quran); font-size: 1.2em; color: #a8874a; direction: rtl; }
        .mushaf-page .surah-caption { font-family: -apple-system,sans-serif; font-size: 9px; color: rgba(168,135,74,.9); letter-spacing: .08em; text-transform: uppercase; margin-top: 3px; }
        .mushaf-page .bismillah { text-align: center; font-size: 1.15em; color: #a8874a; margin: 4px 0 10px; }

        .mushaf-page .page-footer {
          position: absolute;
          bottom: 12px;
          left: 0;
          right: 0;
          text-align: center;
          font-family: -apple-system,sans-serif; font-size: 10px; color: rgba(168,135,74,.65);
        }

        /* Reduce motion: honor the OS preference — StPageFlip already respects
           flippingTime but we further shorten and drop shadows. */
        @media (prefers-reduced-motion: reduce) {
          .mushaf-page { transition: none !important; }
        }

        /* Focus-mode typography: give the Arabic room to breathe. We upscale
           the ayah-flow directly on the enlarged pages so verses fill the
           enlarged book, and let the auto-fit loop shrink only if the page
           overflows. Ornaments (ayah markers, headers) scale proportionally.
           Applied to BOTH the source .mushaf-page nodes AND their .stf__item
           clones so it hits after StPageFlip's DOM shuffle. */
        html.mushaf-focus .mushaf-page .ayah-flow {
          font-size: clamp(22px, 2.6vw, 34px);
          line-height: 2.05;
          word-spacing: 0.06em;
        }
        html.mushaf-focus .mushaf-page .ayah-marker {
          min-width: 1.9em;
          height: 1.9em;
          font-size: 0.42em;
        }
        html.mushaf-focus .mushaf-page .page-header {
          font-size: 13px;
          padding-bottom: 14px;
        }
        html.mushaf-focus .mushaf-page .surah-name-ar { font-size: 1.5em; }
        html.mushaf-focus .mushaf-page .surah-caption { font-size: 11px; }
        html.mushaf-focus .mushaf-page .bismillah { font-size: 1.4em; margin: 6px 0 14px; }
        html.mushaf-focus .mushaf-page { padding: 32px 28px 40px; }
        html.mushaf-focus .mushaf-page .page-body { padding-bottom: 34px; }
        html.mushaf-focus .mushaf-page .page-footer { font-size: 12px; bottom: 14px; }
        /* Phones: still big, but not overflow-big — keeps the auto-fit
           shrinker from thrashing on the narrower pages. */
        @media (max-width: 767px) {
          html.mushaf-focus .mushaf-page .ayah-flow {
            font-size: clamp(19px, 5vw, 24px);
            line-height: 1.95;
          }
          html.mushaf-focus .mushaf-page { padding: 20px 18px 28px; }
        }

        /* -----------------------------------------------------------
           Focus mode — distraction-free full-viewport reading.
           When html.mushaf-focus is on, we hide site chrome (header,
           footer, hero, breadcrumbs) and page-level padding so the
           book fills the viewport. Applied globally via class selector
           on <html> because Header/Footer live in the root layout,
           outside this component tree.
           ----------------------------------------------------------- */
        html.mushaf-focus header,
        html.mushaf-focus footer,
        html.mushaf-focus .section--hero,
        html.mushaf-focus [data-mushaf-hero],
        html.mushaf-focus .mushaf-page-hero {
          display: none !important;
        }
        html.mushaf-focus body { background: hsl(var(--background)); }
        html.mushaf-focus main { padding: 0 !important; }
        html.mushaf-focus .section { padding: 0 !important; }
        html.mushaf-focus .container { max-width: none !important; padding: 0 !important; }
        html.mushaf-focus .mushaf-stage {
          padding: 0 !important;
          border-radius: 0 !important;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        /* On phones the fixed-height book leaves a big void above when
           vertically centered. Nudge it up so the reading surface starts
           near the top and controls sit clear at the bottom. */
        @media (max-width: 767px) {
          html.mushaf-focus .mushaf-stage {
            align-items: flex-start;
            padding-top: max(16px, env(safe-area-inset-top)) !important;
            padding-bottom: 80px !important;
          }
        }
        html.mushaf-focus .mushaf-controls {
          position: fixed;
          bottom: max(12px, env(safe-area-inset-bottom));
          left: 50%;
          transform: translateX(-50%);
          z-index: 60;
          background: hsl(var(--background) / 0.85);
          -webkit-backdrop-filter: saturate(180%) blur(24px);
          backdrop-filter: saturate(180%) blur(24px);
          border: 1px solid hsl(var(--separator));
          border-radius: 999px;
          padding: 6px 10px;
          box-shadow: 0 8px 24px -8px hsl(0 0% 0% / 0.25);
          margin: 0 !important;
          max-width: calc(100vw - 24px);
          /* Horizontal scroll instead of wrapping — a scrolling toolbar is
             far friendlier on mobile than a 4-row stack that overlaps the
             book. */
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          flex-wrap: nowrap !important;
          justify-content: flex-start !important;
        }
        html.mushaf-focus .mushaf-controls::-webkit-scrollbar { display: none; }
        html.mushaf-focus .mushaf-controls > div {
          flex-wrap: nowrap !important;
          flex-shrink: 0 !important;
        }
        html.mushaf-focus .mushaf-controls button,
        html.mushaf-focus .mushaf-controls .mushaf-controls > div > div {
          flex-shrink: 0;
          white-space: nowrap;
        }
        html.mushaf-focus .mushaf-controls .mushaf-status { display: none; }
      `}</style>

      <div className="mushaf-stage">
        <div
          ref={mountRef}
          className="mx-auto"
          role="region"
          aria-label="Qur'ān page-fold reader — use ← and → arrow keys to turn pages, Home and End to jump to start or end"
          aria-live="polite"
          suppressHydrationWarning
        />
        {!ready && <p className="text-center text-muted-foreground py-20">Preparing the muṣḥaf…</p>}
      </div>

      <div className="mushaf-controls mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 items-center flex-wrap">
          <button
            type="button"
            aria-label="Previous page"
            className="focus-ring inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-separator bg-surface hover:bg-muted text-sm font-medium"
            onClick={() => flipRef.current?.flipPrev()}
          >
            ← Previous
          </button>
          <button
            type="button"
            aria-label="Next page"
            className="focus-ring inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-separator bg-surface hover:bg-muted text-sm font-medium"
            onClick={() => flipRef.current?.flipNext()}
          >
            Next →
          </button>
          <div className="inline-flex items-center gap-2 rounded-lg border border-separator bg-surface px-3 py-2">
            <label htmlFor="mushaf-page-input" className="sr-only">
              Jump to page number
            </label>
            <input
              id="mushaf-page-input"
              type="number"
              min={1}
              max={total}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goto(Number.parseInt(pageInput, 10) || 1);
              }}
              className="w-16 text-center bg-transparent outline-none text-sm font-medium"
              aria-label="Page number"
            />
            <span className="text-xs text-muted-foreground">/ {total}</span>
          </div>
          <button
            type="button"
            aria-label={`Go to page ${pageInput}`}
            className="focus-ring inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-[hsl(var(--accent-foreground))] hover:opacity-90 text-sm font-medium"
            onClick={() => goto(Number.parseInt(pageInput, 10) || 1)}
          >
            Go
          </button>
          <button
            type="button"
            aria-label={focus ? "Exit focus mode (Esc)" : "Enter focus mode"}
            title={focus ? "Exit focus mode (Esc)" : "Focus mode — hide site chrome"}
            aria-pressed={focus}
            className={`focus-ring inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              focus
                ? "border-accent bg-accent text-[hsl(var(--accent-foreground))] hover:opacity-90"
                : "border-separator bg-surface hover:bg-muted"
            }`}
            onClick={toggleFocus}
          >
            {focus ? (
              <>
                <MinimizeIcon size={14} />
                Exit focus
              </>
            ) : (
              <>
                <ExpandIcon size={14} />
                Focus mode
              </>
            )}
          </button>
          <button
            type="button"
            aria-label="Clear saved reading position"
            className="focus-ring inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-separator bg-surface hover:bg-muted text-xs text-muted-foreground"
            onClick={clearResume}
            title="Clear saved reading position and go to page 1"
          >
            Reset
          </button>
        </div>
        <p className="mushaf-status text-xs text-muted-foreground">
          Page {current} of {total} · Auto-saves your place
        </p>
      </div>
    </>
  );
}
