"use client";
// Two-way Hijri ⇄ Gregorian converter, plus today's date and upcoming Islamic events.

import { HIJRI_MONTHS, ISLAMIC_EVENTS, gregorianToHijri, hijriToGregorian } from "@/lib/hijri";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

export function CalendarView({ locale }: { locale: "en" | "id" }) {
  const t = useTranslations("calendar");

  // This is prerendered statically, so `new Date()` on the server is the BUILD
  // date, not the visitor's. Rendering it directly causes a hydration mismatch
  // (React #418). Gate all "today"-derived output behind `mounted` so SSR and
  // first client paint are identical, then fill in the real date on mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const today = new Date();
  const hToday = gregorianToHijri(today);

  const [gDate, setGDate] = useState<string>(() => today.toISOString().slice(0, 10));
  const [hy, setHy] = useState<number>(hToday.hy);
  const [hm, setHm] = useState<number>(hToday.hm);
  const [hd, setHd] = useState<number>(hToday.hd);

  const gAsHijri = useMemo(() => {
    const [y, m, d] = gDate.split("-").map((x) => Number.parseInt(x, 10));
    if (!y || !m || !d) return null;
    try {
      return gregorianToHijri(new Date(y, m - 1, d));
    } catch {
      return null;
    }
  }, [gDate]);

  const hAsGreg = useMemo(() => {
    try {
      return hijriToGregorian(hy, hm, hd);
    } catch {
      return null;
    }
  }, [hy, hm, hd]);

  const eventsThisMonth = ISLAMIC_EVENTS.filter((e) => e.hm === hToday.hm);

  return (
    <div className="grid gap-8">
      <section className="rounded-2xl border border-separator bg-surface p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("todayIs")}</p>
        <p className="mt-2 text-2xl font-bold tracking-title">
          {mounted ? `${hToday.hd} ${HIJRI_MONTHS[hToday.hm - 1]} ${hToday.hy} AH` : "—"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {mounted ? new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(today) : " "}
        </p>
      </section>

      <section className="rounded-2xl border border-separator bg-surface p-6">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("convertTitle")}
        </h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold">{t("gregToHij")}</p>
            <input
              type="date"
              value={mounted ? gDate : ""}
              onChange={(e) => setGDate(e.target.value)}
              className="focus-ring mt-2 h-11 w-full rounded-lg border border-separator bg-background px-3 text-sm"
            />
            {mounted && gAsHijri && (
              <p className="mt-3 text-lg">
                = {gAsHijri.hd} {HIJRI_MONTHS[gAsHijri.hm - 1]} {gAsHijri.hy} AH
              </p>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold">{t("hijToGreg")}</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <input
                type="number"
                inputMode="numeric"
                aria-label="Hijri year"
                value={mounted ? hy : ""}
                onChange={(e) => setHy(Number.parseInt(e.target.value, 10) || hToday.hy)}
                className="focus-ring h-11 rounded-lg border border-separator bg-background px-3 text-sm"
              />
              <select
                aria-label="Hijri month"
                value={mounted ? hm : 1}
                onChange={(e) => setHm(Number.parseInt(e.target.value, 10))}
                className="focus-ring h-11 rounded-lg border border-separator bg-background px-2 text-sm"
              >
                {HIJRI_MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                type="number"
                inputMode="numeric"
                aria-label="Hijri day"
                value={mounted ? hd : ""}
                min={1}
                max={30}
                onChange={(e) => setHd(Number.parseInt(e.target.value, 10) || 1)}
                className="focus-ring h-11 rounded-lg border border-separator bg-background px-3 text-sm"
              />
            </div>
            {mounted && hAsGreg && (
              <p className="mt-3 text-lg">
                ={" "}
                {new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
                  new Date(hAsGreg.gy, hAsGreg.gm - 1, hAsGreg.gd),
                )}
              </p>
            )}
          </div>
        </div>
      </section>

      {mounted && eventsThisMonth.length > 0 && (
        <section className="rounded-2xl border border-separator bg-surface p-6">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("importantTitle")} — {HIJRI_MONTHS[hToday.hm - 1]}
          </h2>
          <ul className="mt-4 space-y-2">
            {eventsThisMonth.map((e) => (
              <li key={e.slug} className="flex items-center justify-between">
                <span>{locale === "id" ? e.id : e.en}</span>
                <span className="text-sm text-muted-foreground">
                  {e.hd} {HIJRI_MONTHS[e.hm - 1]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
