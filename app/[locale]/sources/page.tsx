import { locales } from "@/i18n/config";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sources" });
  return {
    title: t("title"),
    description: t("intro"),
  };
}

// External source list. Kept as a plain data array so we can render it identically in every locale.
const sources = {
  quran: [
    { name: "Tanzil", url: "https://tanzil.net/", note: "Verified Uthmani Quran text." },
    { name: "Al-Quran Cloud", url: "https://alquran.cloud/", note: "Quran + translations API." },
  ],
  translations: [
    {
      name: "Sahih International (English)",
      url: "https://quran.com/",
      note: "Widely-used English translation.",
    },
    { name: "Pickthall (English)", url: "https://quran.com/", note: "Public domain." },
    { name: "Yusuf Ali (English)", url: "https://quran.com/", note: "Public domain." },
  ],
  hadith: [
    {
      name: "Sunnah.com",
      url: "https://sunnah.com/",
      note: "Bukhari, Muslim, and other collections with grading.",
    },
  ],
  prayerTimes: [
    {
      name: "adhan (npm)",
      url: "https://github.com/batoulapps/adhan-js",
      note: "MIT-licensed prayer-time library. All calculation happens on-device.",
    },
    {
      name: "Aladhan",
      url: "https://aladhan.com/prayer-times-api",
      note: "Cross-checked against Aladhan for major methods.",
    },
  ],
  duas: [
    {
      name: "Hisnul Muslim (Fortress of the Muslim)",
      url: "https://sunnah.com/hisn",
      note: "Every dua on this site cites its narration and grading.",
    },
  ],
} as const;

export default async function SourcesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SourcesView />;
}

function SourcesView() {
  const t = useTranslations("sources");
  return (
    <>
      <section className="section section--hero">
        <div className="container container--narrow">
          <span className="eyebrow">Editorial</span>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-lede">{t("intro")}</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container container--narrow" style={{ display: "grid", gap: 32 }}>
          <Group title={t("quranTitle")} items={sources.quran} />
          <Group title={t("translationsTitle")} items={sources.translations} />
          <Group title={t("hadithTitle")} items={sources.hadith} />
          <Group title={t("prayerTimesTitle")} items={sources.prayerTimes} />
          <Group title={t("duasTitle")} items={sources.duas} />
        </div>
      </section>
    </>
  );
}

function Group({
  title,
  items,
}: {
  title: string;
  items: readonly { name: string; url: string; note: string }[];
}) {
  return (
    <div>
      <div className="section__head" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>
            {title}
          </h2>
        </div>
      </div>
      <div className="hig-list">
        {items.map((item, idx) => (
          <a
            // Use name+url as the key: multiple items can share the same URL
            // (e.g. all three English Quran translations link to quran.com).
            // Falling back to name+url keeps keys stable across renders while
            // avoiding React's duplicate-key warning.
            key={`${item.name}::${item.url}::${idx}`}
            href={item.url}
            rel="noopener noreferrer external"
            target="_blank"
            className="hig-list__row focus-ring"
          >
            <div className="hig-list__row-icon" aria-hidden>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <div className="hig-list__row-body">
              <div className="hig-list__row-title">{item.name}</div>
              <div className="hig-list__row-sub">{item.note}</div>
            </div>
            <div className="hig-list__row-chev" aria-hidden>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
