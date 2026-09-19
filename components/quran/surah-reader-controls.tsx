"use client";
// Sticky-ish reader controls — reciter, translation, transliteration toggle, font size.
// Client-only because it reads/writes localStorage. Sits under the surah header,
// full-width on mobile, right-aligned on desktop.

import { RECITERS, TRANSLATIONS } from "@/lib/quran";
import { getStore, updateSettings } from "@/lib/storage";
import { Settings2Icon, TypeIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function SurahReaderControls({ surah: _surah }: { surah: number }) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState(() => getStore().settings);

  useEffect(() => {
    setS(getStore().settings);
    const onChange = () => setS(getStore().settings);
    window.addEventListener("iw:storage", onChange);
    return () => window.removeEventListener("iw:storage", onChange);
  }, []);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="reader-controls"
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-separator bg-surface px-3 h-11 text-sm hover:bg-muted transition-colors duration-micro ease-spring"
        >
          <Settings2Icon size={16} />
          Reading settings
        </button>
      </div>
      {open && (
        <div
          id="reader-controls"
          className="mt-3 rounded-2xl border border-separator bg-surface p-4 grid gap-4 sm:grid-cols-2"
        >
          <Field label="Reciter">
            <select
              className="focus-ring h-11 w-full rounded-lg border border-separator bg-background px-3 text-sm"
              value={s.reciter}
              onChange={(e) => updateSettings({ reciter: e.target.value })}
            >
              {RECITERS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Translation">
            <select
              className="focus-ring h-11 w-full rounded-lg border border-separator bg-background px-3 text-sm"
              value={s.translation}
              onChange={(e) => updateSettings({ translation: e.target.value })}
            >
              {TRANSLATIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.lang})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Arabic size">
            <div className="flex gap-2">
              {(["sm", "md", "lg", "xl"] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => updateSettings({ fontSize: size })}
                  aria-pressed={s.fontSize === size}
                  className={`focus-ring inline-flex h-11 flex-1 items-center justify-center rounded-lg border text-sm transition-colors duration-micro ease-spring ${
                    s.fontSize === size
                      ? "border-accent bg-accent-muted text-accent"
                      : "border-separator bg-background hover:bg-muted"
                  }`}
                >
                  <TypeIcon
                    size={size === "sm" ? 12 : size === "md" ? 14 : size === "lg" ? 16 : 20}
                  />
                </button>
              ))}
            </div>
          </Field>
          <Field label="Show transliteration">
            <Toggle
              checked={s.showTransliteration}
              onChange={(v) => updateSettings({ showTransliteration: v })}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="block mb-1 text-xs text-muted-foreground uppercase tracking-widest">
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`focus-ring relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-micro ease-spring ${
        checked ? "bg-accent" : "bg-muted"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-micro ease-spring ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
