import { CalendarView } from "@/components/calendar/calendar-view";
import { BreadcrumbSchema, FaqSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hreflangLanguages } from "@/lib/seo";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  const t = await getTranslations({ locale, namespace: "calendar" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: siteUrl(locale === "en" ? "/calendar" : `/${locale}/calendar`),
      languages: hreflangLanguages('/calendar'), },
    openGraph: {
      url: siteUrl(locale === "en" ? "/calendar" : `/${locale}/calendar`),
    },
  };
}

export default async function CalendarPage({ params }: PageProps) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "calendar" });

  return (
    <>
      {/* GEO/AEO — FAQPage schema for AI answer engines (ChatGPT,
          Perplexity, Claude, Google AI Overviews). Seeds citation-eligible
          Q&A that mirrors the highest-intent search queries for this hub.
          English-only for now — JSON-LD is crawler-facing. */}
      <FaqSchema
        items={[
          {
            question: 'What is the Hijri calendar?',
            answer:
              'The Hijri calendar (التقويم الهجري) is the Islamic lunar calendar, dating from the Prophet Muḥammad\'s ﷺ emigration (hijrah) from Mecca to Madinah in 622 CE. It has 12 lunar months of 29 or 30 days, totaling roughly 354 days — 11 days shorter than the Gregorian solar year.',
          },
          {
            question: 'What are the 12 Islamic months?',
            answer:
              'Muḥarram, Ṣafar, Rabīʿ al-Awwal, Rabīʿ ath-Thānī, Jumādā al-Ūlā, Jumādā ath-Thāniyah, Rajab, Shaʿbān, Ramaḍān, Shawwāl, Dhū al-Qaʿdah, and Dhū al-Ḥijjah. Four are considered sacred (ashhur al-ḥurum): Muḥarram, Rajab, Dhū al-Qaʿdah, and Dhū al-Ḥijjah.',
          },
          {
            question: 'Which Hijri calculation does Quran Daily use?',
            answer:
              'The calendar uses Umm al-Qura (the official Saudi Arabian calendar tables) with visibility calibration at the Kaaba\'s coordinates. Umm al-Qura is a calculated calendar, not a moonsighting-only method — traditional communities that follow local moonsighting may see dates shift by one day.',
          },
          {
            question: 'What are the major Islamic dates?',
            answer:
              '1 Muḥarram (Islamic New Year), 10 Muḥarram (ʿĀshūrāʾ), 12 Rabīʿ al-Awwal (Mawlid), 27 Rajab (Isrāʾ and Miʿrāj by tradition), 15 Shaʿbān (Laylat al-Barāʾah in some traditions), all of Ramaḍān, 1 Shawwāl (ʿĪd al-Fiṭr), 8–13 Dhū al-Ḥijjah (Ḥajj), 10 Dhū al-Ḥijjah (ʿĪd al-Aḍḥā).',
          },
          {
            question: 'Why does Ramadan start on a different date each year?',
            answer:
              'Because the lunar year is ~11 days shorter than the solar (Gregorian) year, every Hijri date shifts backward ~11 days per Gregorian year. Ramaḍān thus cycles through all four seasons over roughly 33 years. The month always begins with the actual (or calculated) sighting of the new moon.',
          },
          {
            question: 'Can I convert dates between Hijri and Gregorian?',
            answer:
              'Yes — the /calendar page lets you input any Gregorian date and see its Hijri equivalent, and vice versa. Conversions use the Umm al-Qura table for post-1425 AH dates and Tabular Islamic calendar arithmetic for pre-1425 AH historical dates.',
          },
        ]}
      />
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: "Islamic calendar", url: siteUrl("/calendar") },
        ]}
      />
      <section className="section section--hero">
        <div className="container container--narrow">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-lede">{t("description")}</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="hig-card">
            <CalendarView locale={locale as "en" | "id"} />
          </div>
        </div>
      </section>
    </>
  );
}
