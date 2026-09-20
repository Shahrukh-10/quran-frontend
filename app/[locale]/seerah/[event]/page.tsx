import { ArticleSchema, BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { breadcrumbs } from "@/lib/breadcrumbs";
import {
  getAllEvents,
  getEra,
  getEvent,
  getEventsChronological,
} from "@/lib/seerah";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  const params: Array<{ locale: string; event: string }> = [];
  for (const locale of locales) {
    for (const e of getAllEvents()) {
      params.push({ locale, event: e.slug });
    }
  }
  return params;
}

type Props = { params: Promise<{ locale: string; event: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, event } = await params;
  const e = getEvent(event);
  if (!e) return {};
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  const desc = e.description[lang];
  return {
    title: e.title[lang],
    description: `${desc.slice(0, 155)}${desc.length > 155 ? "…" : ""}`,
    alternates: {
      canonical: siteUrl(locale === "en" ? `/seerah/${event}` : `/${locale}/seerah/${event}`),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? `/seerah/${event}` : `/${locale}/seerah/${event}`),
    },
  };
}

function formatYear(
  ah: number,
  ce: string,
  note: string | undefined,
  prefixes: { pre: string; ah: string },
): string {
  const yearLabel = ah < 0 ? `${Math.abs(ah)} ${prefixes.pre}` : `${ah} ${prefixes.ah}`;
  return note ? `${note} · ${yearLabel} / ${ce}` : `${yearLabel} / ${ce}`;
}

function parseQuranRef(ref: string): { surah: number; ayah: number; slug: string } | null {
  // "S:A" or "S:A-B" — link to the first ayah in the range.
  const match = ref.match(/^(\d+):(\d+)(?:-\d+)?$/);
  if (!match) return null;
  return { surah: Number(match[1]), ayah: Number(match[2]), slug: `${match[1]}-${match[2]}` };
}

export default async function SeerahEventPage({ params }: Props) {
  const { locale, event } = await params;
  const e = getEvent(event);
  if (!e) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "seerah.event" });
  const bc = await breadcrumbs(locale);
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  const era = getEra(e.era);
  const yearPrefix = { pre: t("beforeHijrah"), ah: t("afterHijrah") };

  const chron = getEventsChronological();
  const idx = chron.findIndex((x) => x.slug === e.slug);
  const prev = idx > 0 ? chron[idx - 1] : null;
  const next = idx < chron.length - 1 ? chron[idx + 1] : null;

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: t("seerah"), url: siteUrl("/seerah") },
          ...(era ? [{ name: era.name[lang], url: siteUrl(`/seerah#era-${era.slug}`) }] : []),
          { name: e.title[lang], url: siteUrl(`/seerah/${e.slug}`) },
        ]}
      />
      <ArticleSchema
        headline={e.title[lang]}
        description={e.description[lang]}
        url={siteUrl(`/seerah/${e.slug}`)}
        datePublished="2026-09-19"
      />

      <Link
        href="/seerah"
        className="focus-ring text-sm text-accent hover:underline"
      >
        {t("backToTimeline")}
      </Link>

      <header className="mt-4">
        {era && (
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {era.name[lang]}
          </p>
        )}
        <h1 className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-title leading-tight">
          {e.title[lang]}
        </h1>
        <p className="mt-3 text-sm text-accent font-medium">
          {formatYear(e.year.ah, e.year.ce, e.year.note, yearPrefix)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("location")}: {e.location}
        </p>
      </header>

      <div className="mt-8 prose prose-lg max-w-none">
        <p className="leading-relaxed">{e.description[lang]}</p>
      </div>

      {e.references && e.references.length > 0 && (
        <section aria-labelledby="refs-heading" className="mt-10 rounded-2xl border border-separator bg-surface p-5">
          <h2 id="refs-heading" className="text-sm font-semibold tracking-title">
            {t("referencesHeading")}
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {e.references.map((r) => {
              if (r.type === "quran") {
                const parsed = parseQuranRef(r.ref);
                return (
                  <li key={r.ref} className="flex items-baseline gap-2">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      {t("quran")}
                    </span>
                    {parsed ? (
                      <Link
                        href={`/quran/al-fatihah` as "/quran/[surah]"}
                        className="text-accent hover:underline"
                      >
                        {r.ref}
                      </Link>
                    ) : (
                      <span>{r.ref}</span>
                    )}
                  </li>
                );
              }
              return (
                <li key={r.ref} className="flex items-baseline gap-2">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    {t("hadith")}
                  </span>
                  <span>{r.ref}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Prev/next chronological navigation */}
      <nav
        aria-label={t("navAriaLabel")}
        className="mt-12 grid grid-cols-2 gap-4 border-t border-separator pt-8"
      >
        <div>
          {prev ? (
            <Link
              href={`/seerah/${prev.slug}` as "/seerah/[event]"}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">{t("previous")}</span>
              <span className="mt-1 block font-semibold tracking-title truncate">
                ← {prev.title[lang]}
              </span>
            </Link>
          ) : (
            <span />
          )}
        </div>
        <div>
          {next ? (
            <Link
              href={`/seerah/${next.slug}` as "/seerah/[event]"}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring text-right"
            >
              <span className="block text-xs text-muted-foreground">{t("next")}</span>
              <span className="mt-1 block font-semibold tracking-title truncate">
                {next.title[lang]} →
              </span>
            </Link>
          ) : (
            <span />
          )}
        </div>
      </nav>
    </article>
  );
}
