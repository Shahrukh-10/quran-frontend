// Sunnah of the day — a small hero-adjacent widget for the homepage.
// Server-rendered, deterministic by UTC date. Recomputed each request
// (Next.js dynamic rendering); once the UTC date rolls over, a new Sunnah
// appears without any client-side JavaScript.

import { getSunnahOfTheDay } from "@/lib/sunnah";
import { getTranslations } from "next-intl/server";

type Props = { locale: string };

export async function SunnahOfTheDay({ locale }: Props) {
  const s = getSunnahOfTheDay();
  const t = await getTranslations({ locale, namespace: "home.sunnahOfDay" });
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";

  return (
    <section
      aria-labelledby="sunnah-of-day-heading"
      className="sunnah-widget rounded-2xl border border-accent bg-accent-muted p-5 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p
          id="sunnah-of-day-heading"
          className="text-xs font-semibold uppercase tracking-widest text-accent"
        >
          {t("eyebrow")}
        </p>
        <p className="text-xs text-muted-foreground capitalize">{s.category}</p>
      </div>

      <h2 className="mt-2 text-xl sm:text-2xl font-bold tracking-title leading-snug">
        {s.title[lang]}
      </h2>

      {s.arabic && (
        <p
          className="mt-3 font-quran text-2xl sm:text-3xl leading-[1.9] text-right"
          lang="ar"
          dir="rtl"
        >
          {s.arabic}
        </p>
      )}

      {s.transliteration && (
        <p className="mt-1 text-sm italic text-muted-foreground">{s.transliteration}</p>
      )}

      {s.translation && (
        <p className="mt-1 text-sm text-muted-foreground">
          &ldquo;{s.translation[lang]}&rdquo;
        </p>
      )}

      <p className="mt-4 text-sm leading-relaxed">{s.body[lang]}</p>

      <p className="mt-3 text-xs text-muted-foreground">
        {t("sourceLabel")}: {s.source}
      </p>
    </section>
  );
}
