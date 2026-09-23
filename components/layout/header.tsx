"use client";
// Sticky Liquid-Glass header matching mockups/apple/*.html .nav pattern.
// Structure: brand · center links · icon buttons (theme toggle + mobile).
// Default light; toggle persists into localStorage under 'iw.v1'.
// Theme toggle uses View Transitions API for a radial reveal from
// the button — gracefully degrades to a smooth cross-fade otherwise.

import { Link } from "@/i18n/routing";
import { MenuIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const LINKS = [
  { href: "/quran", k: "quran" },
  { href: "/mushaf", k: "mushaf" },
  { href: "/duas", k: "duas" },
  { href: "/hadith", k: "hadith" },
  { href: "/seerah", k: "seerah" },
  { href: "/reverts", k: "reverts" },
  { href: "/ramadan", k: "ramadan" },
  { href: "/hajj", k: "hajj" },
  { href: "/memorize", k: "memorize" },
  { href: "/iqamah", k: "iqamah" },
  { href: "/account", k: "account" },
  { href: "/prayer-times", k: "prayerTimes" },
  { href: "/qibla", k: "qibla" },
  { href: "/learn-salah", k: "learnSalah" },
  { href: "/learn", k: "learn" },
  { href: "/names-of-allah", k: "names" },
  { href: "/tools", k: "tools" },
] as const;

// Grouped structure for the mobile drawer — same links, organised so a
// first-time visitor can see at a glance what the site offers.
// Categories match the mental model: read scripture, practice daily,
// learn deeper, self-track. Titles come from the i18n `nav.groups.*` keys.
const LINK_GROUPS = [
  {
    k: "read",
    items: [
      { href: "/quran", k: "quran" },
      { href: "/mushaf", k: "mushaf" },
      { href: "/hadith", k: "hadith" },
      { href: "/duas", k: "duas" },
    ],
  },
  {
    k: "practice",
    items: [
      { href: "/prayer-times", k: "prayerTimes" },
      { href: "/qibla", k: "qibla" },
      { href: "/iqamah", k: "iqamah" },
      { href: "/adhan", k: "adhan" },
      { href: "/calendar", k: "calendar" },
    ],
  },
  {
    k: "learn",
    items: [
      { href: "/learn-salah", k: "learnSalah" },
      { href: "/learn", k: "learn" },
      { href: "/names-of-allah", k: "names" },
      { href: "/seerah", k: "seerah" },
      { href: "/hajj", k: "hajj" },
      { href: "/ramadan", k: "ramadan" },
      { href: "/reverts", k: "reverts" },
    ],
  },
  {
    k: "you",
    items: [
      { href: "/memorize", k: "memorize" },
      { href: "/tools", k: "tools" },
      { href: "/account", k: "account" },
    ],
  },
] as const;

const STORAGE_KEY = "iw.v1";

function readTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.settings?.theme === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function writeTheme(theme: "light" | "dark") {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed.settings = { ...(parsed.settings ?? {}), theme };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

// Morphing sun/moon icon — a single SVG whose paths animate between
// states based on `data-theme`. Cheaper and smoother than swapping
// two separate <svg> elements.
function ThemeIcon({ theme }: { theme: "light" | "dark" }) {
  const dark = theme === "dark";
  return (
    <svg
      className="theme-icon"
      data-theme={theme}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* The core disc — sun body / moon body. Shifts + shrinks slightly. */}
      <circle
        className="theme-icon__disc"
        cx={dark ? 14 : 12}
        cy={dark ? 10 : 12}
        r={dark ? 8 : 5}
      />
      {/* The mask that "bites" the sun into a moon crescent.
          Grows from 0 → 7 on dark, shrinks on light. */}
      <circle
        className="theme-icon__mask"
        cx="18"
        cy="8"
        r={dark ? 7 : 0}
        fill="hsl(var(--background))"
        stroke="none"
      />
      {/* Sun rays — 8 lines around the disc, fade out on dark. */}
      <g className="theme-icon__rays" opacity={dark ? 0 : 1}>
        <line x1="12" y1="2" x2="12" y2="4" />
        <line x1="12" y1="20" x2="12" y2="22" />
        <line x1="2" y1="12" x2="4" y2="12" />
        <line x1="20" y1="12" x2="22" y2="12" />
        <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
        <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
        <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
        <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
      </g>
    </svg>
  );
}

export function Header() {
  const t = useTranslations("nav");
  const common = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const pathname = usePathname();
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);

  // Sync theme state from localStorage after mount.
  useEffect(() => {
    setTheme(readTheme());
  }, []);

  // When the mobile drawer is open, lock the page underneath from scrolling.
  // The drawer itself remains internally scrollable (overflow-y: auto).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close the drawer whenever the route changes (link tap fires navigation
  // via next-intl <Link>; without this hook, the drawer would stay open
  // over the new page).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Apply theme with a View-Transitions radial reveal from the button.
  // Falls back to a plain toggle on browsers without the API (Firefox).
  const applyTheme = (next: "light" | "dark") => {
    const doToggle = () => {
      setTheme(next);
      writeTheme(next);
      const html = document.documentElement;
      html.classList.toggle("dark", next === "dark");
      html.setAttribute("data-theme", next);
    };

    // View Transitions API — Chromium 111+, Safari 18+.
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    };
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!doc.startViewTransition || prefersReduced) {
      doToggle();
      return;
    }

    // Anchor the reveal to the toggle button's centre.
    const btn = toggleBtnRef.current;
    const rect = btn?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth - 40;
    const cy = rect ? rect.top + rect.height / 2 : 40;
    const maxRadius = Math.hypot(
      Math.max(cx, window.innerWidth - cx),
      Math.max(cy, window.innerHeight - cy),
    );

    const root = document.documentElement;
    root.style.setProperty("--vt-x", `${cx}px`);
    root.style.setProperty("--vt-y", `${cy}px`);
    root.style.setProperty("--vt-r", `${maxRadius}px`);
    root.setAttribute("data-vt-direction", next); // 'dark' expands, 'light' shrinks

    const transition = doc.startViewTransition(doToggle);
    transition.ready.finally(() => {
      // Clear the marker after the animation completes so subsequent
      // navigations don't accidentally inherit stale positioning.
      transition.ready
        .then(() => {
          root.removeAttribute("data-vt-direction");
        })
        .catch(() => {
          root.removeAttribute("data-vt-direction");
        });
    });
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    // pathname includes locale prefix (e.g. /en/quran); match by suffix
    const cleaned = pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?(?=\/|$)/, "") || "/";
    return cleaned === href || cleaned.startsWith(`${href}/`);
  };

  return (
    <header className="hig-nav" data-role="site-header">
      <div className="hig-nav__inner">
        <Link href="/" className="hig-nav__brand focus-ring">
          <span className="hig-nav__brand-mark" aria-hidden>
            ﷲ
          </span>
          <span>{common("siteName")}</span>
        </Link>

        <nav className="hig-nav__links" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`hig-nav__link focus-ring${isActive(l.href) ? " is-active" : ""}`}
              aria-current={isActive(l.href) ? "page" : undefined}
            >
              {t(l.k)}
            </Link>
          ))}
        </nav>

        <div className="hig-nav__right">
          <button
            ref={toggleBtnRef}
            type="button"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
            className="hig-icon-btn focus-ring theme-toggle"
          >
            <ThemeIcon theme={theme} />
          </button>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="hig-icon-btn focus-ring hig-nav__menu-btn"
          >
            {open ? <XIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <>
          {/* Backdrop scrim behind the drawer. Tap anywhere on it to close.
              Solves the reported bug where the homepage content bled
              through the drawer's low-opacity glass — the drawer alone
              was `background: hsl(var(--background) / 0.55)` which is
              45% see-through and let the ticker/cards behind it show up
              as visual noise. This dark blurred scrim covers the rest
              of the viewport so the drawer reads as a proper takeover. */}
          <button
            type="button"
            aria-label="Close menu"
            className="hig-nav__scrim"
            onClick={() => setOpen(false)}
          />
          <div id="mobile-menu" className="hig-nav__drawer">
            {LINK_GROUPS.map((group) => (
              <section key={group.k} className="hig-nav__drawer-group">
                <h3 className="hig-nav__drawer-title">{t(`groups.${group.k}`)}</h3>
                <ul>
                  {group.items.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className={`focus-ring${isActive(l.href) ? " is-active" : ""}`}
                      >
                        {t(l.k)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </header>
  );
}
