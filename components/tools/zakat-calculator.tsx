"use client";
// Zakat calculator. Silver nisab is the default — safer for the poor.
// Inputs are amounts in the user's chosen currency (no live FX; user picks
// currency + we suggest a nisab starting value they can override).

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

// Approximate silver-nisab (595g / 21oz) in various currencies. Silver-nisab
// is used because it's more inclusive (a lower threshold, more people owe
// zakat = more benefit for the poor — the majority contemporary opinion).
// These are STATIC ESTIMATES for a starting point; users can override the
// nisab input with their locale's current silver-market rate.
const CURRENCIES: Record<string, { name: string; silverNisab: number; goldNisab: number }> = {
  INR: { name: "Indian Rupee",          silverNisab: 55000,  goldNisab: 620000 },
  USD: { name: "US Dollar",             silverNisab: 650,    goldNisab: 7400 },
  EUR: { name: "Euro",                  silverNisab: 600,    goldNisab: 6800 },
  GBP: { name: "British Pound",         silverNisab: 520,    goldNisab: 5900 },
  SAR: { name: "Saudi Riyal",           silverNisab: 2450,   goldNisab: 27750 },
  AED: { name: "UAE Dirham",            silverNisab: 2400,   goldNisab: 27200 },
  MYR: { name: "Malaysian Ringgit",     silverNisab: 3050,   goldNisab: 34700 },
  IDR: { name: "Indonesian Rupiah",     silverNisab: 10250000, goldNisab: 116000000 },
  PKR: { name: "Pakistani Rupee",       silverNisab: 182000, goldNisab: 2060000 },
  BDT: { name: "Bangladeshi Taka",      silverNisab: 78000,  goldNisab: 880000 },
  TRY: { name: "Turkish Lira",          silverNisab: 22200,  goldNisab: 252000 },
  CAD: { name: "Canadian Dollar",       silverNisab: 890,    goldNisab: 10100 },
};

function fmt(n: number, code: string): string {
  try {
    // Use a fixed locale so SSR matches client output (avoids hydration
    // mismatch that Intl.NumberFormat causes with `undefined` locale).
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${code} ${Math.round(n).toLocaleString("en-US")}`;
  }
}

export function ZakatCalculator() {
  const t = useTranslations("tools.zakat");
  const [currency, setCurrency] = useState("INR");
  const [nisab, setNisab] = useState<number>(CURRENCIES.INR?.silverNisab ?? 55000);
  const [cash, setCash] = useState<number>(0);
  const [gold, setGold] = useState<number>(0);
  const [silver, setSilver] = useState<number>(0);
  const [business, setBusiness] = useState<number>(0);
  const [debts, setDebts] = useState<number>(0);

  function handleCurrencyChange(next: string) {
    setCurrency(next);
    const preset = CURRENCIES[next];
    if (preset) setNisab(preset.silverNisab);
  }

  const wealth = useMemo(
    () => cash + gold + silver + business - debts,
    [cash, gold, silver, business, debts],
  );
  const dueAmount = wealth * 0.025;
  const isDue = wealth >= nisab;
  const preset = CURRENCIES[currency];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="rounded-2xl border border-separator bg-surface p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("currency")}>
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="focus-ring h-11 w-full rounded-lg border border-separator bg-background px-3 text-sm"
            >
              {Object.entries(CURRENCIES).map(([code, info]) => (
                <option key={code} value={code}>
                  {code} — {info.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("nisabTitle")}>
            <input
              type="number"
              inputMode="decimal"
              value={nisab}
              onChange={(e) => setNisab(Number(e.target.value) || 0)}
              className="focus-ring h-11 w-full rounded-lg border border-separator bg-background px-3 text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("nisabHelp")}
              {preset ? ` Silver-nisab suggestion: ${fmt(preset.silverNisab, currency)}. Gold-nisab: ${fmt(preset.goldNisab, currency)}.` : ""}
            </p>
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

        {/* Real, cite-able facts panel — safe to trust because they're
            timeless (weights & rate) rather than volatile (prices). */}
        <div className="mt-6 rounded-xl border border-separator bg-muted/30 p-4 text-sm leading-relaxed">
          <p className="font-semibold">About Zakat &amp; Nisab</p>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-muted-foreground">
            <li><strong>Rate:</strong> Zakat is 2.5% of zakatable wealth held for one full lunar year (ḥawl).</li>
            <li><strong>Silver-nisab:</strong> 595 grams of silver (≈ 21 oz). Chosen by most modern scholars because it's a lower threshold — more people pay = more relief for the poor.</li>
            <li><strong>Gold-nisab:</strong> 87.48 grams of gold (≈ 3.08 oz). Alternative threshold.</li>
            <li><strong>Debts:</strong> subtract short-term / immediately-payable debts from your zakatable wealth before applying 2.5%.</li>
            <li><strong>Sources:</strong> Sahih al-Bukhari 1454, Sahih Muslim 979, Quran 9:60 (who receives it), 2:110, 24:56 (obligation).</li>
          </ul>
          <p className="mt-3 text-xs">
            Silver-nisab &amp; gold-nisab values shown above are static estimates. For a live calculation, check the current silver/gold price in your local market and override the Nisab field.
          </p>
        </div>
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
