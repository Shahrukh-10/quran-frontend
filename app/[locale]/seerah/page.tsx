import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { getAllEras, getEventsByEra } from "@/lib/seerah";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seerah.index" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: siteUrl(locale === "en" ? "/seerah" : `/${locale}/seerah`),
      languages: Object.fromEntries(
        locales.map((l) => [l, siteUrl(l === "en" ? "/seerah" : `/${l}/seerah`)]),
      ),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/seerah" : `/${locale}/seerah`),
    },
  };
}

function formatYear(ah: number, ce: string, note?: string, prefix?: { pre: string; ah: string }): string {
  const prefixes = prefix ?? { pre: "BH", ah: "AH" };
  const yearLabel = ah < 0 ? `${Math.abs(ah)} ${prefixes.pre}` : `${ah} ${prefixes.ah}`;
  return note ? `${note} · ${yearLabel} / ${ce}` : `${yearLabel} / ${ce}`;
}

export default async function SeerahIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "seerah.index" });
  const bc = await breadcrumbs(locale);
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  const yearPrefix = { pre: t("beforeHijrah"), ah: t("afterHijrah") };
  const eras = getAllEras();

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: t("title"), url: siteUrl("/seerah") },
        ]}
      />

      <header className="text-center">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold tracking-display">
          {t("title")}
        </h1>
        <p className="mt-4 mx-auto max-w-prose text-muted-foreground leading-relaxed">
          {t("description")}
        </p>
      </header>

      <div className="mt-14 space-y-16">
        {eras.map((era) => {
          const events = getEventsByEra(era.slug);
          return (
            <section
              key={era.slug}
              aria-labelledby={`era-${era.slug}`}
              className="relative"
            >
              <div className="mb-8">
                <p className="text-xs uppercase tracking-widest text-accent font-medium">
                  {t("era")}
                </p>
                <h2
                  id={`era-${era.slug}`}
                  className="mt-2 text-2xl font-bold tracking-title"
                >
                  {era.name[lang]}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-prose">
                  {era.description[lang]}
                </p>
              </div>

              {/* Vertical timeline rail — decorative on desktop, hidden on mobile */}
              <ol className="relative space-y-4 sm:pl-8 sm:before:absolute sm:before:left-2 sm:before:top-2 sm:before:bottom-2 sm:before:w-0.5 sm:before:rounded-full sm:before:bg-separator">
                {events.map((event) => (
                  <li
                    key={event.slug}
                    className="relative sm:before:absolute sm:before:left-[-1.75rem] sm:before:top-6 sm:before:size-3 sm:before:rounded-full sm:before:bg-accent sm:before:border-2 sm:before:border-background sm:before:z-10"
                  >
                    <Link
                      href={`/seerah/${event.slug}` as "/seerah/[event]"}
                      className="focus-ring group relative block overflow-hidden rounded-2xl border border-separator bg-surface p-5 transition-all duration-micro ease-spring hover:border-accent/40 hover:shadow-md hover:-translate-y-0.5"
                    >
                      {/* Decorative left accent bar — reinforces the
                          timeline "dot on rail" pattern. Wider (3px) and
                          more opaque than a hairline so it's visible on
                          both light and dark surfaces. */}
                      <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-gradient-to-b from-accent via-accent/80 to-accent/30" />
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                          {formatYear(event.year.ah, event.year.ce, event.year.note, yearPrefix)}
                        </p>
                        <p className="text-xs text-muted-foreground">{event.location}</p>
                      </div>
                      <h3 className="mt-2 font-semibold tracking-title text-lg leading-snug">
                        {event.title[lang]}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-4">
                        {event.description[lang]}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                        Read more <span aria-hidden>→</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      <p className="mt-16 text-center text-xs text-muted-foreground max-w-prose mx-auto">
        {t("dataSourceNotice")}
      </p>
    </article>
  );
}
