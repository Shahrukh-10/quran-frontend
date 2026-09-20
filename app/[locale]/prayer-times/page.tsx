import { PrayerTimesGeolocated } from "@/components/prayer-times/prayer-times-geolocated";
import { BreadcrumbSchema, FaqSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { CITIES } from "@/lib/cities";
import { hreflangLanguages, mergedOgImages } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "./_prayer-hig.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  const t = await getTranslations({ locale, namespace: "prayer.index" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: siteUrl(locale === "en" ? "/prayer-times" : `/${locale}/prayer-times`),
      languages: hreflangLanguages("/prayer-times"),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/prayer-times" : `/${locale}/prayer-times`),
      type: "article",
      locale,
      images: mergedOgImages(t("title")),
    },
  };
}

// Illustrative Maghrib times per popular city — real times computed on the /prayer-times/[city] page.
const POPULAR = [
  {
    slug: "makkah",
    name: "Makkah",
    region: "Saudi Arabia · AST",
    time: "6:44 PM",
    label: "Maghrib",
  },
  {
    slug: "madinah",
    name: "Madinah",
    region: "Saudi Arabia · AST",
    time: "6:48 PM",
    label: "Maghrib",
  },
  { slug: "delhi", name: "Delhi", region: "India · IST", time: "6:16 PM", label: "Maghrib" },
  { slug: "mumbai", name: "Mumbai", region: "India · IST", time: "6:34 PM", label: "Maghrib" },
  {
    slug: "istanbul",
    name: "Istanbul",
    region: "Türkiye · TRT",
    time: "7:37 PM",
    label: "Maghrib",
  },
  { slug: "jakarta", name: "Jakarta", region: "Indonesia · WIB", time: "7:12 PM", label: "Isha" },
  {
    slug: "kuala-lumpur",
    name: "Kuala Lumpur",
    region: "Malaysia · MYT",
    time: "8:26 PM",
    label: "Isha",
  },
  { slug: "cairo", name: "Cairo", region: "Egypt · EET", time: "6:32 PM", label: "Maghrib" },
  { slug: "dubai", name: "Dubai", region: "UAE · GST", time: "7:44 PM", label: "Isha" },
  {
    slug: "riyadh",
    name: "Riyadh",
    region: "Saudi Arabia · AST",
    time: "6:20 PM",
    label: "Maghrib",
  },
  {
    slug: "london",
    name: "London",
    region: "United Kingdom · GMT",
    time: "6:16 PM",
    label: "Maghrib",
  },
  { slug: "new-york", name: "New York", region: "USA · EST", time: "5:38 PM", label: "Maghrib" },
  { slug: "toronto", name: "Toronto", region: "Canada · EST", time: "5:22 PM", label: "Maghrib" },
  { slug: "sydney", name: "Sydney", region: "Australia · AEDT", time: "7:04 PM", label: "Maghrib" },
] as const;

const METHODS = [
  "Muslim World League",
  "ISNA",
  "Egyptian",
  "Umm al-Qura",
  "Karachi",
  "Tehran",
  "Jafari",
] as const;

const SAMPLE_TIMES = [
  { name: "Fajr", time: "5:23 AM" },
  { name: "Sunrise", time: "6:52 AM" },
  { name: "Dhuhr", time: "12:34 PM" },
  { name: "Asr", time: "3:41 PM" },
  { name: "Maghrib", time: "6:16 PM", active: true },
  { name: "Isha", time: "7:44 PM" },
] as const;

export default async function PrayerTimesIndex({ params }: PageProps) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);

  // Only show cities that also exist in our CITIES list (so links go to real pages).
  const knownSlugs = new Set(CITIES.map((c) => c.slug));

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("prayerTimes"), url: siteUrl("/prayer-times") },
        ]}
      />
      <FaqSchema
        items={[
          {
            question: "How are prayer times calculated on this site?",
            answer:
              "Prayer times are computed on your device using the adhan-js library, which implements the standard astronomical formulae. All major calculation methods are supported: Muslim World League (MWL), ISNA, Egyptian, Umm al-Qura, University of Islamic Sciences Karachi, Institute of Geophysics Tehran, and Shia Ithna-Ashari (Jafari).",
          },
          {
            question: "Which calculation method should I use?",
            answer:
              "Use the method most followed in your region: MWL for most of Europe and the West, ISNA for North America, Umm al-Qura for Saudi Arabia and the Gulf, Karachi for Pakistan and India, Egyptian for Egypt and much of North Africa. When in doubt, follow your local masjid.",
          },
          {
            question: "Do my location or preferences leave my device?",
            answer:
              "No. Prayer times are computed entirely in your browser. Nothing is sent to any server. Your city preference is stored in your browser's localStorage only.",
          },
        ]}
      />

      <section className="pt-hero">
        <div className="container">
          <h1>Prayer times</h1>
          <p>
            Accurate times for any city, calculated with your preferred method — no login, no
            tracking.
          </p>
        </div>
      </section>

      {/* Real geolocated widget (progressive enhancement) sits above the illustrative card */}
      <section className="section">
        <div className="container">
          <PrayerTimesGeolocated />
        </div>
      </section>

      {/* Illustrative sample card in the mockup style */}
      <section className="section">
        <div className="container">
          <div className="pt-card" role="region" aria-label="Sample prayer times for London today">
            <div className="pt-card__meta">
              <span>
                <strong>London, GMT</strong>
              </span>
              <span className="dot" aria-hidden />
              <span>Muslim World League</span>
              <span className="dot" aria-hidden />
              <span>Sample times</span>
            </div>
            <div className="pt-card__next">
              <span className="pt-card__next-name">Maghrib</span> · <span>18:16</span>
            </div>
            <div className="pt-card__count">Sample — real countdown appears after location.</div>
            <div className="pt-card__tiles">
              {SAMPLE_TIMES.map((p) => (
                <div
                  key={p.name}
                  className="pt-tile"
                  {...("active" in p && p.active ? { "aria-current": "true" } : {})}
                >
                  <div className="pt-tile__name">{p.name}</div>
                  <div className="pt-tile__time">{p.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Calculation method</h2>
          <p className="section__caption">
            Different methods use different Fajr/Isha twilight angles. Pick the one your local
            mosque follows.
          </p>
          <div className="segmented" role="tablist" aria-label="Calculation method">
            {METHODS.map((m, i) => (
              <button key={m} type="button" className="segmented__seg" aria-selected={i === 0}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Popular cities</h2>
          <p className="section__caption">Tap any city to see its full schedule.</p>
          <ul className="cities">
            {POPULAR.map((c) => {
              const href = knownSlugs.has(c.slug) ? `/prayer-times/${c.slug}` : "/prayer-times";
              return (
                <li key={c.slug}>
                  <Link
                    href={href}
                    className="city city--link"
                    aria-label={`Prayer times for ${c.name}`}
                  >
                    <div>
                      <div className="city__name">{c.name}</div>
                      <div className="city__region">{c.region}</div>
                    </div>
                    <div className="city__time">
                      <div className="city__time-name">{c.label}</div>
                      <div className="city__time-value">{c.time}</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </>
  );
}
