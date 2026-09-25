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
import { hreflangLanguages } from "@/lib/seo";

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
  const c = getCity(city);
  if (!c) return {};
  const title = `Prayer Times ${c.name} — Fajr, Dhuhr, Asr, Maghrib, Isha Today`;
  const desc = `Today's accurate prayer times for ${c.name}, ${c.country}. Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha timings computed on-device using ${c.tz} timezone. Multiple calculation methods supported: Muslim World League, ISNA, Umm al-Qura, Egyptian, Karachi. No account needed.`;
  return {
    title: title.slice(0, 70),
    description: desc.slice(0, 260),
    keywords: [
      `${c.name} prayer times`,
      `${c.name} namaz timings`,
      `${c.name} salah times`,
      `Fajr time ${c.name}`,
      `Maghrib ${c.name}`,
      `Isha ${c.name}`,
      `prayer schedule ${c.name}`,
      `Islamic prayer times ${c.name}`,
      `${c.country} prayer times`,
    ].join(", "),
    alternates: {
      canonical: siteUrl(
        locale === "en" ? `/prayer-times/${city}` : `/${locale}/prayer-times/${city}`,
      ),
      languages: hreflangLanguages(`/prayer-times/${city}`),
    },
    openGraph: {
      title: title.slice(0, 90),
      description: desc.slice(0, 200),
      url: siteUrl(
        locale === "en" ? `/prayer-times/${city}` : `/${locale}/prayer-times/${city}`,
      ),
      type: "article",
    },
  };
}

export default async function CityPrayerTimesPage({ params }: Props) {
  const { locale, city } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const c = getCity(city);
  if (!c) notFound();

  // Related cities: same country first, then geographically-nearest by rough distance.
  const sameCountry = CITIES.filter((x) => x.slug !== c.slug && x.country === c.country).slice(
    0,
    6,
  );
  const nearest = CITIES.filter((x) => x.slug !== c.slug && x.country !== c.country)
    .map((x) => ({
      ...x,
      d: Math.hypot(x.lat - c.lat, x.lon - c.lon),
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 6);

  const faqs = [
    {
      q: `What are the 5 daily prayer times in ${c.name}?`,
      a: `The five daily prayers in Islam are Fajr (dawn), Dhuhr (midday), Asr (afternoon), Maghrib (sunset), and Isha (night). In ${c.name}, ${c.country}, these times are calculated based on the sun's position using the ${c.tz} timezone. The exact times shift by a minute or two each day and are shown live below, computed on your device from your coordinates (${c.lat.toFixed(4)}°N, ${c.lon.toFixed(4)}°E).`,
    },
    {
      q: `Which prayer time calculation method is used in ${c.country}?`,
      a: `${c.country === "Saudi Arabia" ? "Saudi Arabia uses the Umm al-Qura method." : c.country === "Pakistan" || c.country === "India" || c.country === "Bangladesh" ? `${c.country} traditionally uses the University of Islamic Sciences, Karachi method.` : c.country === "United States" || c.country === "Canada" ? `${c.country} typically uses the Islamic Society of North America (ISNA) method.` : c.country === "Egypt" ? "Egypt uses the Egyptian General Authority of Survey method." : c.country === "Turkey" ? "Turkey uses the Diyanet method." : `In ${c.country}, most Muslim communities follow the Muslim World League (MWL) method, though Umm al-Qura and ISNA are also common.`} You can switch methods in the settings — the live times below will recompute instantly.`,
    },
    {
      q: `How is Fajr time calculated for ${c.name}?`,
      a: `Fajr begins at true dawn (subh sadiq), when the sky first shows a horizontal band of light along the eastern horizon. Different scholarly bodies use different sun-angle values (typically 15° to 20° below the horizon) to compute this. On this page for ${c.name}, the default is the Muslim World League method (18°), but you can change it below.`,
    },
    {
      q: `Is ${c.name} at a high latitude?`,
      a:
        Math.abs(c.lat) > 48
          ? `Yes — ${c.name} is at a high latitude (${c.lat.toFixed(1)}°). In summer, Fajr and Isha can be very close together or persist all night; in winter the reverse. The prayer-time calculator below applies a high-latitude adjustment rule ("Middle of the Night" by default) to give practical times. Consult your local mosque for their preferred adjustment method.`
          : `No — ${c.name} is at latitude ${c.lat.toFixed(1)}°, well within normal ranges where the sun sets and rises reliably every day. Standard prayer-time calculation methods apply directly, without high-latitude adjustments.`,
    },
    {
      q: `Do prayer times differ within ${c.name}?`,
      a: `Within the city of ${c.name}, prayer times differ by seconds — not enough to matter in practice. The times shown are for the city center coordinates (${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}). If you're outside the metropolitan area, use the Qibla and location tools to get times for your exact location.`,
    },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  // Place schema for the city — helps local knowledge-graph indexing
  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: c.name,
    address: {
      "@type": "PostalAddress",
      addressLocality: c.name,
      addressCountry: c.countryCode,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: c.lat,
      longitude: c.lon,
    },
  };

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("prayerTimes"), url: siteUrl("/prayer-times") },
          { name: c.name, url: siteUrl(`/prayer-times/${c.slug}`) },
        ]}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD injection
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD injection
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeSchema) }}
      />

      {/* Visible breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-accent hover:underline">
          {bc("home")}
        </Link>
        <span className="mx-2">›</span>
        <Link href="/prayer-times" className="hover:text-accent hover:underline">
          {bc("prayerTimes")}
        </Link>
        <span className="mx-2">›</span>
        <span className="text-foreground">{c.name}</span>
      </nav>

      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {c.country}
        </p>
        <h1 className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-display leading-tight">
          Prayer Times in {c.name}, {c.country}
        </h1>
        {/* Server-rendered intro — 60+ words of unique content per city */}
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Accurate Fajr, Dhuhr, Asr, Maghrib, and Isha prayer times for {c.name}
          {c.country ? `, ${c.country}` : ""}. Times are computed on your
          device using astronomical calculations (the{" "}
          <a
            href="https://github.com/batoulapps/adhan-js"
            className="text-accent hover:underline"
            rel="noopener"
          >
            adhan library
          </a>
          ) based on {c.name}&apos;s coordinates ({c.lat.toFixed(4)}°,{" "}
          {c.lon.toFixed(4)}°) and the {c.tz} timezone. Switch calculation
          methods (MWL, ISNA, Umm al-Qura, Egyptian, Karachi) to match your
          local mosque.
        </p>
      </header>

      {/* Client component that renders live prayer times for today. */}
      <div className="mt-8">
        <PrayerTimesForCity lat={c.lat} lon={c.lon} tz={c.tz} cityName={c.name} />
      </div>

      {/* City facts panel */}
      <section
        className="mt-10 rounded-2xl border border-separator bg-surface p-6"
        aria-labelledby="city-facts-heading"
      >
        <h2
          id="city-facts-heading"
          className="text-sm font-semibold uppercase tracking-widest text-muted-foreground"
        >
          {c.name} — Geographic Facts
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Country</dt>
            <dd className="mt-1 font-semibold">{c.country}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Timezone</dt>
            <dd className="mt-1 font-semibold">{c.tz}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Latitude</dt>
            <dd className="mt-1">{c.lat.toFixed(4)}° N</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Longitude</dt>
            <dd className="mt-1">{c.lon.toFixed(4)}° E</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Population</dt>
            <dd className="mt-1">~{c.population.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Country code</dt>
            <dd className="mt-1">{c.countryCode}</dd>
          </div>
        </dl>
      </section>

      {/* Understanding the 5 prayers */}
      <section className="mt-10" aria-labelledby="prayers-heading">
        <h2 id="prayers-heading" className="text-lg font-bold tracking-title">
          The five daily prayers
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              name: "Fajr",
              arabic: "الفجر",
              desc: "Dawn prayer, before sunrise. Two rakats. Begins at true dawn (subh sadiq) when the horizontal line of light appears on the eastern horizon.",
            },
            {
              name: "Dhuhr",
              arabic: "الظهر",
              desc: "Midday prayer, after the sun has crossed the meridian. Four rakats. Begins when the sun begins to decline from its zenith.",
            },
            {
              name: "Asr",
              arabic: "العصر",
              desc: "Afternoon prayer. Four rakats. Two schools: Shafi'i (shadow = object length) and Hanafi (shadow = 2× object length).",
            },
            {
              name: "Maghrib",
              arabic: "المغرب",
              desc: "Sunset prayer, immediately after the sun has fully set. Three rakats. The shortest window of the five prayers.",
            },
            {
              name: "Isha",
              arabic: "العشاء",
              desc: "Night prayer, after twilight has completely disappeared. Four rakats. Extends until midnight (or until Fajr in emergencies).",
            },
          ].map((p) => (
            <div
              key={p.name}
              className="rounded-xl border border-separator bg-surface p-4"
            >
              <div className="flex items-baseline gap-3">
                <span className="text-base font-bold">{p.name}</span>
                <span lang="ar" dir="rtl" className="text-lg font-quran">
                  {p.arabic}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Same-country cities */}
      {sameCountry.length > 0 && (
        <section className="mt-10" aria-labelledby="same-country-heading">
          <h2
            id="same-country-heading"
            className="text-lg font-bold tracking-title"
          >
            Prayer times in other {c.country} cities
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {sameCountry.map((x) => (
              <Link
                key={x.slug}
                href={`/prayer-times/${x.slug}` as "/prayer-times/[city]"}
                className="focus-ring rounded-full border border-separator bg-surface px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                {x.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Nearest cities globally */}
      <section className="mt-10" aria-labelledby="nearest-heading">
        <h2 id="nearest-heading" className="text-lg font-bold tracking-title">
          Nearest major cities
        </h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {nearest.map((x) => (
            <Link
              key={x.slug}
              href={`/prayer-times/${x.slug}` as "/prayer-times/[city]"}
              className="focus-ring rounded-xl border border-separator bg-surface p-3 hover:bg-muted transition-colors"
            >
              <span className="block text-sm font-semibold">
                {x.name}, {x.country}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Prayer times in {x.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-lg font-bold tracking-title">
          Frequently asked about prayer times in {c.name}
        </h2>
        <div className="mt-4 space-y-4">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="rounded-2xl border border-separator bg-surface p-5"
            >
              <summary className="cursor-pointer text-base font-semibold">
                {f.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </article>
  );
}
