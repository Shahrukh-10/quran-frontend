"use client";
// Masjid submission form. Posts directly to /api/qb/masjids which proxies to
// the Kotlin backend. Successful submissions land in the moderation queue
// (status=pending) — never immediately public.

import { useState } from "react";
import { useTranslations } from "next-intl";

type FieldValues = {
  name: string;
  city: string;
  country: string;
  address: string;
  timezone: string;
  iqamahFajr: string;
  iqamahDhuhr: string;
  iqamahAsr: string;
  iqamahMaghrib: string;
  iqamahIsha: string;
  iqamahJumuah: string;
  notes: string;
  submitterName: string;
  submitterEmail: string;
};

const empty: FieldValues = {
  name: "",
  city: "",
  country: "",
  address: "",
  timezone: "",
  iqamahFajr: "",
  iqamahDhuhr: "",
  iqamahAsr: "",
  iqamahMaghrib: "",
  iqamahIsha: "",
  iqamahJumuah: "",
  notes: "",
  submitterName: "",
  submitterEmail: "",
};

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; slug: string }
  | { kind: "error"; message: string };

export function SubmitForm() {
  const t = useTranslations("iqamah.submit");
  const [values, setValues] = useState<FieldValues>(empty);
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  const setField = (key: keyof FieldValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ kind: "submitting" });
    try {
      const payload: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(values)) {
        if (v.trim()) payload[k] = v.trim();
      }
      const res = await fetch("/api/qb/masjids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setState({ kind: "error", message: json.error ?? t("errorGeneric") });
        return;
      }
      setState({ kind: "success", slug: json.slug });
      setValues(empty);
    } catch {
      setState({ kind: "error", message: t("errorNetwork") });
    }
  };

  if (state.kind === "success") {
    return (
      <div className="rounded-2xl border border-accent bg-accent-muted p-6 text-center">
        <p className="text-lg font-semibold tracking-title text-accent">{t("successTitle")}</p>
        <p className="mt-2 text-sm text-muted-foreground max-w-prose mx-auto">
          {t("successBody", { slug: state.slug })}
        </p>
        <button
          type="button"
          onClick={() => setState({ kind: "idle" })}
          className="focus-ring mt-4 inline-flex items-center justify-center min-h-11 px-6 rounded-lg border border-separator hover:bg-muted"
        >
          {t("submitAnother")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("name")} required>
          <input required value={values.name} onChange={setField("name")} className={inputCls} />
        </Field>
        <Field label={t("city")} required>
          <input required value={values.city} onChange={setField("city")} className={inputCls} />
        </Field>
        <Field label={t("country")} help={t("countryHelp")} required>
          <input
            required
            value={values.country}
            onChange={setField("country")}
            className={inputCls}
            maxLength={4}
            placeholder="GB"
          />
        </Field>
        <Field label={t("timezone")} help={t("timezoneHelp")}>
          <input
            value={values.timezone}
            onChange={setField("timezone")}
            className={inputCls}
            placeholder="Europe/London"
          />
        </Field>
      </div>
      <Field label={t("address")}>
        <input value={values.address} onChange={setField("address")} className={inputCls} />
      </Field>

      <fieldset className="rounded-2xl border border-separator p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">{t("iqamahLegend")}</legend>
        <p className="text-xs text-muted-foreground">{t("iqamahHelp")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["iqamahFajr", "Fajr"],
            ["iqamahDhuhr", "Dhuhr"],
            ["iqamahAsr", "Asr"],
            ["iqamahMaghrib", "Maghrib"],
            ["iqamahIsha", "Isha"],
            ["iqamahJumuah", "Jumu'ah"],
          ].map(([k, label]) => (
            <Field key={k} label={label as string}>
              <input
                type="time"
                value={values[k as keyof FieldValues]}
                onChange={setField(k as keyof FieldValues)}
                className={inputCls}
              />
            </Field>
          ))}
        </div>
      </fieldset>

      <Field label={t("notes")}>
        <textarea
          value={values.notes}
          onChange={setField("notes")}
          className={`${inputCls} min-h-[80px]`}
          maxLength={512}
        />
      </Field>

      <fieldset className="rounded-2xl border border-separator p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">{t("submitterLegend")}</legend>
        <p className="text-xs text-muted-foreground">{t("submitterHelp")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("submitterName")}>
            <input
              value={values.submitterName}
              onChange={setField("submitterName")}
              className={inputCls}
            />
          </Field>
          <Field label={t("submitterEmail")}>
            <input
              type="email"
              value={values.submitterEmail}
              onChange={setField("submitterEmail")}
              className={inputCls}
            />
          </Field>
        </div>
      </fieldset>

      {state.kind === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={state.kind === "submitting"}
        className="focus-ring inline-flex items-center justify-center min-h-11 px-6 rounded-lg bg-accent text-[hsl(var(--accent-foreground))] font-medium disabled:opacity-60"
      >
        {state.kind === "submitting" ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}

const inputCls =
  "focus-ring w-full rounded-lg border border-separator bg-background px-3 py-2 text-sm";

function Field({
  label,
  help,
  required,
  children,
}: {
  label: string;
  help?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">
        {label}
        {required && <span aria-hidden className="text-red-500 ml-0.5">*</span>}
      </span>
      {help && <span className="mt-0.5 block text-xs text-muted-foreground">{help}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}
