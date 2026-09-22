import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { listMasjids } from "@/lib/iqamah";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hreflangLanguages } from "@/lib/seo";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "iqamah.index" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: siteUrl(locale === "en" ? "/iqamah" : `/${locale}/iqamah`),
      languages: hreflangLanguages('/iqamah'),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/iqamah" : `/${locale}/iqamah`),
    },
  };
}

export default async function IqamahIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "iqamah.index" });
  const bc = await breadcrumbs(locale);
  const masjids = await listMasjids();

  // Group by country → city for scannable browsing.
  const byCountry = new Map<string, typeof masjids>();
  for (const m of masjids) {
    if (!byCountry.has(m.country)) byCountry.set(m.country, []);
    byCountry.get(m.country)?.push(m);
  }

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: t("title"), url: siteUrl("/iqamah") },
        ]}
      />

      <header className="text-center">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">{t("eyebrow")}</p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold tracking-display">
          {t("title")}
        </h1>
        <p className="mt-4 mx-auto max-w-prose text-muted-foreground leading-relaxed">
          {t("description")}
        </p>
        <p className="mt-2 mx-auto max-w-prose text-xs text-muted-foreground italic leading-relaxed">
          {t("crowdsourcedNote")}
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/iqamah/submit"
          className="focus-ring inline-flex items-center justify-center min-h-11 px-6 rounded-lg bg-accent text-[hsl(var(--accent-foreground))] font-medium"
        >
          {t("submitButton")}
        </Link>
      </div>

      {masjids.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-separator bg-surface p-8 text-center">
          <p className="text-lg font-semibold tracking-title">{t("emptyTitle")}</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-prose mx-auto">
            {t("emptyBody")}
          </p>
        </div>
      ) : (
        <div className="mt-12 space-y-8">
          {[...byCountry.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([country, list]) => (
              <section key={country} aria-labelledby={`country-${country}`}>
                <h2
                  id={`country-${country}`}
                  className="text-lg font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  {country} · {t("countHint", { count: list.length })}
                </h2>
                <ol className="mt-3 space-y-3">
                  {list.map((m) => (
                    <li key={m.slug}>
                      <Link
                        href={`/iqamah/${m.slug}` as "/iqamah/[slug]"}
                        className="focus-ring block rounded-2xl border border-separator bg-surface p-5 hover:bg-muted transition-colors duration-micro ease-spring"
                      >
                        <p className="font-semibold tracking-title">{m.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {m.city} · {m.country}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          {(["fajr", "dhuhr", "asr", "maghrib", "isha", "jumuah"] as const).map(
                            (k) =>
                              m.iqamah[k] ? (
                                <span key={k} className="text-muted-foreground">
                                  <span className="uppercase text-[10px] tracking-widest">
                                    {k}
                                  </span>{" "}
                                  <span className="font-medium text-foreground">
                                    {m.iqamah[k]}
                                  </span>
                                </span>
                              ) : null,
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
        </div>
      )}
    </article>
  );
}
