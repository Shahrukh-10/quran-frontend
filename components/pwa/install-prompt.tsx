"use client";
// Install prompt — floating banner that surfaces after the user has been on
// the site for a while. Dismissed state is stored in localStorage so we don't
// nag people who said no.
//
// Chromium browsers fire `beforeinstallprompt` — we intercept, save, and show
// our own button. Safari (iOS + macOS) has no programmatic install, so we
// detect that and show step-by-step "Share -> Add to Home Screen" instructions.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const DISMISS_KEY = "iw.v1.installDismissedAt";
const SHOW_DELAY_MS = 30_000; // wait 30s of engagement before nagging
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days between prompts

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type State =
  | { kind: "hidden" }
  | { kind: "chromium"; deferred: BeforeInstallPromptEvent }
  | { kind: "ios" }
  | { kind: "installed" };

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari-only property
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
}

function wasDismissedRecently(): boolean {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < DISMISS_TTL_MS;
}

function recordDismiss(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

export function InstallPrompt() {
  const t = useTranslations("install.prompt");
  const [state, setState] = useState<State>({ kind: "hidden" });

  useEffect(() => {
    if (isStandalone()) {
      setState({ kind: "installed" });
      return;
    }
    if (wasDismissedRecently()) return;

    let deferred: BeforeInstallPromptEvent | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const onBip = (e: Event) => {
      e.preventDefault();
      deferred = e as BeforeInstallPromptEvent;
    };

    const onInstalled = () => {
      setState({ kind: "installed" });
    };

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);

    timer = setTimeout(() => {
      if (deferred) {
        setState({ kind: "chromium", deferred });
      } else if (isIOS()) {
        setState({ kind: "ios" });
      }
      // On desktop Chrome without BIP, or FF/Safari-Mac: stay hidden. They
      // still see the install page linked from settings.
    }, SHOW_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    recordDismiss();
    setState({ kind: "hidden" });
  };

  const install = async () => {
    if (state.kind !== "chromium") return;
    try {
      await state.deferred.prompt();
      const choice = await state.deferred.userChoice;
      if (choice.outcome === "dismissed") recordDismiss();
    } catch {
      /* browser refused */
    }
    setState({ kind: "hidden" });
  };

  if (state.kind === "hidden" || state.kind === "installed") return null;

  return (
    <div
      role="dialog"
      aria-labelledby="install-title"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-lg rounded-2xl border border-separator bg-surface shadow-xl backdrop-blur-sm p-4 sm:inset-x-auto sm:right-4 sm:left-auto sm:bottom-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p id="install-title" className="text-sm font-semibold tracking-title">
            {t("title")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {state.kind === "ios" ? t("bodyIos") : t("body")}
          </p>
          {state.kind === "ios" && (
            <ol className="mt-2 space-y-1 text-xs text-muted-foreground list-decimal pl-4">
              <li>{t("iosStep1")}</li>
              <li>{t("iosStep2")}</li>
              <li>{t("iosStep3")}</li>
            </ol>
          )}
          <div className="mt-3 flex gap-2">
            {state.kind === "chromium" && (
              <button
                type="button"
                onClick={install}
                className="focus-ring inline-flex items-center justify-center min-h-9 px-4 rounded-lg bg-accent text-[hsl(var(--accent-foreground))] text-xs font-medium"
              >
                {t("installButton")}
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="focus-ring inline-flex items-center justify-center min-h-9 px-4 rounded-lg border border-separator text-xs"
            >
              {t("dismiss")}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("close")}
          className="focus-ring shrink-0 rounded-full w-8 h-8 flex items-center justify-center border border-separator text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
