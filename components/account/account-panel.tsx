"use client";
// Account page — signed-out sees register + login forms; signed-in sees profile.
// Passphrase-only, no email, no recovery. Documented up front.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getAuth, login, logout, register, type AuthState } from "@/lib/auth-client";

type Mode = "signIn" | "signUp";

export function AccountPanel() {
  const t = useTranslations("account");
  const [auth, setAuthState] = useState<AuthState>(null);
  const [mode, setMode] = useState<Mode>("signUp");
  const [username, setUsername] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAuthState(getAuth());
    const listener = () => setAuthState(getAuth());
    window.addEventListener("iw:auth", listener);
    window.addEventListener("storage", listener);
    return () => {
      window.removeEventListener("iw:auth", listener);
      window.removeEventListener("storage", listener);
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fn = mode === "signIn" ? login : register;
    const res = await fn(username.trim().toLowerCase(), passphrase);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setUsername("");
    setPassphrase("");
    setAuthState(getAuth());
  };

  const onLogout = async () => {
    setBusy(true);
    await logout();
    setAuthState(null);
    setBusy(false);
  };

  if (auth) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-separator bg-surface p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("signedInAs")}
          </p>
          <p className="mt-2 text-xl font-semibold tracking-title">{auth.username}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("sessionExpires")}: {new Date(auth.expiresAt).toLocaleDateString()}
          </p>
        </div>

        <div className="rounded-2xl border border-accent bg-accent-muted p-6">
          <p className="text-sm font-semibold text-accent">{t("syncActive")}</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-prose">
            {t("syncActiveBody")}
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          disabled={busy}
          className="focus-ring inline-flex items-center justify-center min-h-11 px-6 rounded-lg border border-separator hover:bg-muted disabled:opacity-60"
        >
          {t("logout")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-separator bg-surface p-4">
        <div className="flex gap-2" role="tablist">
          <button
            role="tab"
            aria-selected={mode === "signUp"}
            onClick={() => {
              setMode("signUp");
              setError(null);
            }}
            className={`focus-ring flex-1 rounded-lg py-2 text-sm font-medium ${
              mode === "signUp" ? "bg-accent text-[hsl(var(--accent-foreground))]" : ""
            }`}
          >
            {t("signUp")}
          </button>
          <button
            role="tab"
            aria-selected={mode === "signIn"}
            onClick={() => {
              setMode("signIn");
              setError(null);
            }}
            className={`focus-ring flex-1 rounded-lg py-2 text-sm font-medium ${
              mode === "signIn" ? "bg-accent text-[hsl(var(--accent-foreground))]" : ""
            }`}
          >
            {t("signIn")}
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">{t("username")}</span>
          <input
            required
            autoComplete={mode === "signIn" ? "username" : "username"}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="focus-ring mt-1 w-full rounded-lg border border-separator bg-background px-3 py-2 text-sm"
            pattern="[a-zA-Z0-9_-]{3,64}"
            title={t("usernameHelp")}
          />
          <span className="mt-1 block text-xs text-muted-foreground">{t("usernameHelp")}</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium">{t("passphrase")}</span>
          <input
            required
            type="password"
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="focus-ring mt-1 w-full rounded-lg border border-separator bg-background px-3 py-2 text-sm"
            minLength={12}
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            {mode === "signUp" ? t("passphraseHelpSignUp") : t("passphraseHelpSignIn")}
          </span>
        </label>

        {mode === "signUp" && (
          <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4">
            <p className="text-sm font-semibold">⚠️ {t("noRecoveryTitle")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("noRecoveryBody")}</p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {mapError(error, t)}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="focus-ring w-full inline-flex items-center justify-center min-h-11 px-6 rounded-lg bg-accent text-[hsl(var(--accent-foreground))] font-medium disabled:opacity-60"
        >
          {busy ? t("submitting") : mode === "signUp" ? t("createAccount") : t("signIn")}
        </button>
      </form>
    </div>
  );
}

function mapError(
  raw: string,
  t: (k: string) => string,
): string {
  // Best-effort mapping of common backend errors to localized copy.
  const known: Record<string, string> = {
    "username taken": t("errorUsernameTaken"),
    "invalid credentials": t("errorInvalidCredentials"),
    "username required": t("errorUsernameRequired"),
    "passphrase required": t("errorPassphraseRequired"),
  };
  if (raw.includes("passphrase must be at least")) return t("errorPassphraseShort");
  if (raw.includes("username must be")) return t("errorUsernameShape");
  return known[raw] ?? raw;
}
