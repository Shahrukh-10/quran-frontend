"use client";
// Sticky Liquid-Glass header. Desktop uses grouped hover menus (5 top-level
// items → dropdowns exposing 17 destinations), so nothing overflows and every
// section is discoverable in one hover. Mobile keeps the drawer.
// Default light; theme toggle uses View Transitions API for a radial reveal.

import { Link } from "@/i18n/routing";
import { MenuIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Desktop: 5 top-level groups. Each expands into a hover/click flyout.
// Every destination on the site is reachable through one of these groups.
type NavGroup = {
  key: string; // i18n key under nav.groups.*
  label: string; // fallback label if translation is missing
  items: ReadonlyArray<{ href: string; k: string; description?: string }>;
};

const NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    key: "read",
    label: "Read",
    items: [
      { href: "/quran", k: "quran", description: "Full Mushaf, 114 surahs" },
      { href: "/mushaf", k: "mushaf", description: "Page-by-page Madinah script" },
      { href: "/hadith", k: "hadith", description: "The Six Books" },
      { href: "/duas", k: "duas", description: "Authentic supplications" },
      { href: "/names-of-allah", k: "names", description: "99 Names of Allah" },
      { href: "/seerah", k: "seerah", description: "Life of the Prophet ﷺ" },
    ],
  },
  {
    key: "practice",
    label: "Practice",
    items: [
      { href: "/prayer-times", k: "prayerTimes", description: "Times for your city" },
      { href: "/qibla", k: "qibla", description: "Direction to Makkah" },
      { href: "/iqamah", k: "iqamah", description: "Iqamah schedule" },
      { href: "/adhan", k: "adhan", description: "Adhan player" },
      { href: "/calendar", k: "calendar", description: "Hijri calendar" },
    ],
  },
  {
    key: "learn",
    label: "Learn",
    items: [
      { href: "/learn-salah", k: "learnSalah", description: "Step-by-step guide" },
      { href: "/learn", k: "learn", description: "Islamic knowledge library" },
      { href: "/ramadan", k: "ramadan", description: "Ramadan long-reads" },
      { href: "/hajj", k: "hajj", description: "Hajj & Umrah guide" },
      { href: "/reverts", k: "reverts", description: "Convert stories" },
    ],
  },
  {
    key: "you",
    label: "You",
    items: [
      { href: "/memorize", k: "memorize", description: "Memorize the Quran" },
      { href: "/tools", k: "tools", description: "Tasbih, adhkar, tracker" },
      { href: "/account", k: "account", description: "Bookmarks & progress" },
    ],
  },
];

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
      <circle
        className="theme-icon__disc"
        cx={dark ? 14 : 12}
        cy={dark ? 10 : 12}
        r={dark ? 8 : 5}
      />
      <circle
        className="theme-icon__mask"
        cx="18"
        cy="8"
        r={dark ? 7 : 0}
        fill="hsl(var(--background))"
        stroke="none"
      />
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

// Chevron used on desktop group triggers
function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="hig-nav__chevron"
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function Header() {
  const t = useTranslations("nav");
  const common = useTranslations("common");
  const [open, setOpen] = useState(false); // mobile drawer
  const [openGroup, setOpenGroup] = useState<string | null>(null); // desktop dropdown
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const pathname = usePathname();
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);
  const hoverTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close menus on route change
  useEffect(() => {
    setOpen(false);
    setOpenGroup(null);
  }, [pathname]);

  // Close desktop dropdown on outside click / Escape
  useEffect(() => {
    if (!openGroup) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".hig-nav__group")) setOpenGroup(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenGroup(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openGroup]);

  const applyTheme = (next: "light" | "dark") => {
    const doToggle = () => {
      setTheme(next);
      writeTheme(next);
      const html = document.documentElement;
      html.classList.toggle("dark", next === "dark");
      html.setAttribute("data-theme", next);
    };
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
    root.setAttribute("data-vt-direction", next);
    const transition = doc.startViewTransition(doToggle);
    transition.ready.finally(() => {
      transition.ready
        .then(() => root.removeAttribute("data-vt-direction"))
        .catch(() => root.removeAttribute("data-vt-direction"));
    });
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    const cleaned = pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?(?=\/|$)/, "") || "/";
    return cleaned === href || cleaned.startsWith(`${href}/`);
  };

  const groupIsActive = (g: NavGroup) => g.items.some((i) => isActive(i.href));

  // Hover intent — open on hover after 60ms; close after 180ms so cursor
  // travel through the gap doesn't blink the menu shut.
  const handleGroupEnter = (key: string) => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => setOpenGroup(key), 60);
  };
  const handleGroupLeave = () => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => setOpenGroup(null), 180);
  };

  const tSafe = (key: string, fallback: string) => {
    try {
      return t(key);
    } catch {
      return fallback;
    }
  };
  const tGroupSafe = (key: string, fallback: string) => {
    try {
      return t(`groups.${key}`);
    } catch {
      return fallback;
    }
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
          {NAV_GROUPS.map((g) => {
            const isOpen = openGroup === g.key;
            const active = groupIsActive(g);
            return (
              <div
                key={g.key}
                className={`hig-nav__group${isOpen ? " is-open" : ""}${active ? " is-active" : ""}`}
                onMouseEnter={() => handleGroupEnter(g.key)}
                onMouseLeave={handleGroupLeave}
              >
                <button
                  type="button"
                  className="hig-nav__link hig-nav__group-trigger focus-ring"
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                  onClick={() => setOpenGroup(isOpen ? null : g.key)}
                >
                  {tGroupSafe(g.key, g.label)}
                  <Chevron />
                </button>
                {isOpen && (
                  <div
                    className="hig-nav__flyout"
                    role="menu"
                    aria-label={tGroupSafe(g.key, g.label)}
                    onMouseEnter={() => handleGroupEnter(g.key)}
                    onMouseLeave={handleGroupLeave}
                  >
                    {g.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setOpenGroup(null)}
                        className={`hig-nav__flyout-item focus-ring${
                          isActive(item.href) ? " is-active" : ""
                        }`}
                      >
                        <span className="hig-nav__flyout-title">
                          {tSafe(item.k, item.k)}
                        </span>
                        {item.description && (
                          <span className="hig-nav__flyout-desc">
                            {item.description}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
          <button
            type="button"
            aria-label="Close menu"
            className="hig-nav__scrim"
            onClick={() => setOpen(false)}
          />
          <div id="mobile-menu" className="hig-nav__drawer">
            {NAV_GROUPS.map((group) => (
              <section key={group.key} className="hig-nav__drawer-group">
                <h3 className="hig-nav__drawer-title">
                  {tGroupSafe(group.key, group.label)}
                </h3>
                <ul>
                  {group.items.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className={`focus-ring${isActive(l.href) ? " is-active" : ""}`}
                      >
                        {tSafe(l.k, l.k)}
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
