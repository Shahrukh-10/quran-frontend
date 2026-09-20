import { PrayerTimesForCity } from "@/components/prayer-times/prayer-times-for-city";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { CITIES, getCity } from "@/lib/cities";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const params: Array<{ locale: string; city: string }> = [];
  for (const locale of locales) {
    for (const c of CITIES) {
      params.push({ locale, city: c.slug });
    }
  }
  return params;
}

type Props = { params: Promise<{ locale: string; city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, city } = await params;
  const bc = await breadcrumbs(locale);
  const c = getCity(city);
  if (!c) return {};
  return {
    title: `Prayer times in ${c.name}`,
    description: `Fajr, Dhuhr, Asr, Maghrib, and Isha times for ${c.name}, ${c.country}. Computed on your device.`,
    alternates: {
      canonical: siteUrl(
        locale === "en" ? `/prayer-times/${city}` : `/${locale}/prayer-times/${city}`,
      ),
    },
    openGraph: {
      url: siteUrl(
        locale === "en" ? `/prayer-times/${city}` : `/${locale}/prayer-times/${city}`,
      ),
    },
  };
}

export default async function CityPrayerTimesPage({ params }: Props) {
  const { locale, city } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const c = getCity(city);
  if (!c) notFound();

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("prayerTimes"), url: siteUrl("/prayer-times") },
          { name: c.name, url: siteUrl(`/prayer-times/${c.slug}`) },
        ]}
      />
      <Link href="/prayer-times" className="focus-ring text-sm text-accent hover:underline">
        ← All cities
      </Link>
      <header className="mt-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{c.country}</p>
        <h1 className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-display leading-tight">
          Prayer times in {c.name}
        </h1>
      </header>

      <div className="mt-8">
        <PrayerTimesForCity lat={c.lat} lon={c.lon} tz={c.tz} cityName={c.name} />
      </div>
    </article>
  );
}
