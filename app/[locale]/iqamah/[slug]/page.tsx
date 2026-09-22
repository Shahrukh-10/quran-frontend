import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { getMasjid, listMasjids } from "@/lib/iqamah";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hreflangLanguages } from "@/lib/seo";

// Only pre-generate slug pages we currently know about. Everything else
// falls back to SSR on demand — safe because the API returns 404 for
// unknown slugs and the page calls notFound() in that case.
export async function generateStaticParams() {
  const params: Array<{ locale: string; slug: string }> = [];
  const masjids = await listMasjids();
  for (const locale of locales) {
    for (const m of masjids) {
      params.push({ locale, slug: m.slug });
    }
  }
  return params;
}

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const m = await getMasjid(slug);
  if (!m) return {};
  return {
    title: `${m.name} — ${m.city}`,
    description: `Iqamah times at ${m.name} in ${m.city}, ${m.country}.`,
    alternates: {
      canonical: siteUrl(locale === "en" ? `/iqamah/${slug}` : `/${locale}/iqamah/${slug}`),
      languages: hreflangLanguages(`/iqamah/${slug}`),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? `/iqamah/${slug}` : `/${locale}/iqamah/${slug}`),
    },
  };
}

export default async function MasjidPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "iqamah.detail" });
  const bc = await breadcrumbs(locale);
  const m = await getMasjid(slug);
  if (!m) notFound();

  const updatedDate = new Date(m.updatedAt);

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: t("iqamah"), url: siteUrl("/iqamah") },
          { name: m.name, url: siteUrl(`/iqamah/${m.slug}`) },
        ]}
      />

      <Link href="/iqamah" className="focus-ring text-sm text-accent hover:underline">
        {t("backToList")}
      </Link>

      <header className="mt-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {m.city} · {m.country}
        </p>
        <h1 className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-title">
          {m.name}
        </h1>
        {m.address && <p className="mt-2 text-sm text-muted-foreground">{m.address}</p>}
        {m.timezone && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("timezoneLabel")}: {m.timezone}
          </p>
        )}
      </header>

      <section aria-labelledby="iqamah-heading" className="mt-8 rounded-2xl border border-separator bg-surface p-5">
        <h2 id="iqamah-heading" className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {t("iqamahHeading")}
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["fajr", "Fajr"],
              ["dhuhr", "Dhuhr"],
              ["asr", "Asr"],
              ["maghrib", "Maghrib"],
              ["isha", "Isha"],
              ["jumuah", "Jumu'ah"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="flex items-baseline justify-between border-b border-separator/50 pb-2">
              <dt className="text-sm">{label}</dt>
              <dd className="font-mono text-lg tabular-nums">
                {m.iqamah[k] ?? <span className="text-muted-foreground">—</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {m.notes && (
        <section aria-labelledby="notes-heading" className="mt-6 rounded-2xl border border-separator bg-surface p-5">
          <h2 id="notes-heading" className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            {t("notesHeading")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed">{m.notes}</p>
        </section>
      )}

      <footer className="mt-8 text-xs text-muted-foreground">
        {t("lastUpdated")}: <time dateTime={updatedDate.toISOString()}>{updatedDate.toLocaleDateString()}</time>
        {" · "}
        <Link href="/iqamah/submit" className="text-accent hover:underline">
          {t("suggestUpdate")}
        </Link>
      </footer>
    </article>
  );
}
