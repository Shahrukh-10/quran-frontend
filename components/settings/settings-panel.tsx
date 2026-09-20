"use client";
// User-facing settings for appearance, accessibility, and on-device data export/delete.
// Everything reads/writes localStorage via lib/storage.ts.

import { locales } from "@/i18n/config";
import { usePathname, useRouter } from "@/i18n/routing";
import { deleteAll, exportAll, getStore, updateSettings } from "@/lib/storage";
import { DownloadIcon, Trash2Icon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  root.classList.toggle("dark", dark);
}

/**
 * Toggle theme with a View Transitions API radial reveal from the click point.
 * Graceful-degrades to instant toggle on Firefox/Safari where the API isn't yet
 * available. `reducedMotion` bypasses the animation for accessibility.
 */
function applyThemeAnimated(theme: Theme, event?: React.MouseEvent) {
  if (typeof document === "undefined") return;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const startViewTransition = (document as Document & {
    startViewTransition?: (cb: () => void) => { ready: Promise<void> };
  }).startViewTransition;
  if (!startViewTransition || reducedMotion) {
    applyTheme(theme);
    return;
  }
  // Compute the click origin — if no event, fall back to top-right corner.
  const x = event?.clientX ?? window.innerWidth - 32;
  const y = event?.clientY ?? 32;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  const transition = startViewTransition(() => {
    applyTheme(theme);
  });
  transition.ready
    .then(() => {
      // Animate the NEW layer (which shows the incoming theme) as a growing
      // circle from the click point. The OLD layer stays as a static backdrop
      // underneath, so the new theme visibly sweeps over the old.
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0 at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 380,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {
      // View transitions fell through — theme has already applied via callback.
    });
}

export function SettingsPanel() {
  const t = useTranslations("settings");
  const activeLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  // `mounted` gates any state that comes from localStorage. SSR always renders
  // with the default settings shape (so aria-pressed and class names are stable),
  // then on client mount we swap in the real user settings. This avoids
  // "A tree hydrated but some attributes ... didn't match" console errors.
  const [mounted, setMounted] = useState(false);
  const [s, setS] = useState(() => getStore().settings);

  const LOCALE_LABELS: Record<string, string> = {
    en: "English",
    id: "Bahasa Indonesia",
    ar: "العربية",
    ur: "اردو",
    tr: "Türkçe",
    fr: "Français",
  };

  useEffect(() => {
    setMounted(true);
    setS(getStore().settings);
    applyTheme(getStore().settings.theme);
    const listen = () => {
      const st = getStore().settings;
      setS(st);
      applyTheme(st.theme);
    };
    window.addEventListener("iw:storage", listen);
    return () => window.removeEventListener("iw:storage", listen);
  }, []);

  const handleExport = useCallback(() => {
    const data = JSON.stringify(exportAll(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "islamic-website-data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleDelete = useCallback(() => {
    if (window.confirm("Delete all bookmarks, history, and preferences from this device?")) {
      deleteAll();
    }
  }, []);

  return (
    <div className="space-y-6">
      <Section title={t("theme")}>
        <div className="flex gap-2">
          {(["system", "light", "dark"] as const).map((v) => {
            // Suppress mismatch during hydration: server always renders the
            // default theme selected; client shows the real value only after
            // useEffect swaps in `mounted`.
            const isSelected = mounted && s.theme === v;
            return (
              <button
                key={v}
                type="button"
                onClick={(e) => {
                  updateSettings({ theme: v });
                  applyThemeAnimated(v, e);
                }}
                aria-pressed={isSelected}
                suppressHydrationWarning
                className={`focus-ring inline-flex h-11 flex-1 items-center justify-center rounded-lg border text-sm transition-colors duration-micro ease-spring ${
                  isSelected
                    ? "border-accent bg-accent-muted text-accent"
                    : "border-separator bg-background hover:bg-muted"
                }`}
              >
                {v === "system"
                  ? t("themeSystem")
                  : v === "light"
                    ? t("themeLight")
                    : t("themeDark")}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={t("language")}>
        {/* Language switcher — navigates to the same path in the chosen locale.
           useRouter().replace with { locale } is next-intl's canonical pattern:
           it also writes the NEXT_LOCALE cookie so subsequent server renders
           use the new locale. */}
        <div className="flex gap-2">
          {locales.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => router.replace(pathname, { locale: code })}
              aria-pressed={activeLocale === code}
              lang={code}
              className={`focus-ring inline-flex h-11 flex-1 items-center justify-center rounded-lg border text-sm transition-colors duration-micro ease-spring ${
                activeLocale === code
                  ? "border-accent bg-accent-muted text-accent"
                  : "border-separator bg-background hover:bg-muted"
              }`}
            >
              {LOCALE_LABELS[code] ?? code}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("dyslexia")}>
        <Toggle
          checked={mounted && s.dyslexiaMode}
          onChange={(v) => updateSettings({ dyslexiaMode: v })}
          label={t("dyslexia")}
        />
      </Section>

      <Section title={t("lowBandwidth")}>
        <Toggle
          checked={mounted && s.lowBandwidth}
          onChange={(v) => updateSettings({ lowBandwidth: v })}
          label={t("lowBandwidth")}
        />
      </Section>

      <Section title={t("exportTitle")}>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("exportBody")}</p>
        <button
          type="button"
          onClick={handleExport}
          className="focus-ring mt-3 inline-flex items-center gap-2 rounded-lg border border-separator bg-surface px-4 h-11 text-sm hover:bg-muted transition-colors duration-micro ease-spring"
        >
          <DownloadIcon size={16} />
          {t("exportButton")}
        </button>
      </Section>

      <Section title={t("deleteTitle")}>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("deleteBody")}</p>
        <button
          type="button"
          onClick={handleDelete}
          className="focus-ring mt-3 inline-flex items-center gap-2 rounded-lg border border-separator bg-surface px-4 h-11 text-sm text-[#dc2626] hover:bg-muted transition-colors duration-micro ease-spring"
        >
          <Trash2Icon size={16} />
          {t("deleteButton")}
        </button>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-separator bg-surface p-5">
      <h2 className="text-xs uppercase tracking-widest text-muted-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      suppressHydrationWarning
      className={`focus-ring relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-micro ease-spring ${
        checked ? "bg-accent" : "bg-muted"
      }`}
    >
      <span
        suppressHydrationWarning
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-micro ease-spring ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
