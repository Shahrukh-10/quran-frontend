"use client";
// Zakat calculator. Silver nisab (595g) is the default — safer for the poor.
// Inputs are amounts in the user's own currency (no FX assumed).

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

function fmt(n: number, code: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${code} ${Math.round(n).toLocaleString()}`;
  }
}

export function ZakatCalculator() {
  const t = useTranslations("tools.zakat");
  const [currency, setCurrency] = useState("USD");
  const [nisab, setNisab] = useState<number>(600); // approx silver-nisab USD; user overrides
  const [cash, setCash] = useState<number>(0);
  const [gold, setGold] = useState<number>(0);
  const [silver, setSilver] = useState<number>(0);
  const [business, setBusiness] = useState<number>(0);
  const [debts, setDebts] = useState<number>(0);

  const wealth = useMemo(
    () => cash + gold + silver + business - debts,
    [cash, gold, silver, business, debts],
  );
  const dueAmount = wealth * 0.025;
  const isDue = wealth >= nisab;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="rounded-2xl border border-separator bg-surface p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("currency")}>
            <input
              type="text"
              maxLength={3}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="focus-ring h-11 w-full rounded-lg border border-separator bg-background px-3 text-sm uppercase"
            />
          </Field>
          <Field label={t("nisabTitle")}>
            <input
              type="number"
              inputMode="decimal"
              value={nisab}
              onChange={(e) => setNisab(Number(e.target.value) || 0)}
              className="focus-ring h-11 w-full rounded-lg border border-separator bg-background px-3 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("nisabHelp")}</p>
          </Field>
          <Field label={t("cash")}>
            <NumberInput value={cash} onChange={setCash} />
          </Field>
          <Field label={t("gold")}>
            <NumberInput value={gold} onChange={setGold} />
          </Field>
          <Field label={t("silver")}>
            <NumberInput value={silver} onChange={setSilver} />
          </Field>
          <Field label={t("business")}>
            <NumberInput value={business} onChange={setBusiness} />
          </Field>
          <Field label={t("debts")}>
            <NumberInput value={debts} onChange={setDebts} />
          </Field>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{t("disclaimer")}</p>
      </section>

      <aside className="rounded-2xl border border-separator bg-surface p-6 h-fit">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("resultTitle")}
        </p>
        {isDue ? (
          <>
            <p className="mt-2 text-4xl font-bold tabular-nums text-accent">
              {fmt(dueAmount, currency)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t("aboveNisab")}</p>
          </>
        ) : (
          <p className="mt-2 text-sm leading-relaxed">{t("belowNisab")}</p>
        )}
      </aside>
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

function NumberInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value === 0 ? "" : value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="focus-ring h-11 w-full rounded-lg border border-separator bg-background px-3 text-sm"
    />
  );
}
