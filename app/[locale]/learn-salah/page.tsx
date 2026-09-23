import { BreadcrumbSchema, FaqSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getAllSalahTutorials } from "@/lib/salah";
import { hreflangLanguages, mergedOgImages } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "./_salah-hig.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  const t = await getTranslations({ locale, namespace: "learnSalah.index" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: siteUrl(locale === "en" ? "/learn-salah" : `/${locale}/learn-salah`),
      languages: hreflangLanguages("/learn-salah"),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/learn-salah" : `/${locale}/learn-salah`),
      type: "article",
      locale,
      images: mergedOgImages(t("title")),
    },
  };
}

export default async function LearnSalahIndex({ params }: PageProps) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "learnSalah.index" });
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  const tutorials = getAllSalahTutorials();

  return (
    <main className="mx-auto max-w-dashboard px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <FaqSchema
        items={[
          {
            question: 'What is Salah?',
            answer:
              'Ṣalāh (صَلَاة) is the five daily obligatory Muslim prayers: Fajr (dawn), Dhuhr (midday), ʿAṣr (afternoon), Maghrib (sunset), and ʿIshāʾ (night). It is the second pillar of Islam after the shahādah (declaration of faith).',
          },
          {
            question: 'How many rakʿah does each prayer have?',
            answer:
              'Fajr: 2 rakʿah (obligatory). Dhuhr: 4. ʿAṣr: 4. Maghrib: 3. ʿIshāʾ: 4. Sunnah and nawāfil (supererogatory) rakʿah are additional. On Friday, Dhuhr is replaced with the 2-rakʿah Jumuʿah prayer.',
          },
          {
            question: 'What must I do before praying?',
            answer:
              'Perform wuḍūʾ (ritual ablution), face the Qibla (direction of Mecca), ensure your body and clothes are clean, and pray at the correct time. Women in menses or postnatal bleeding do not pray; they make up any missed obligations.',
          },
          {
            question: 'Do I have to pray in Arabic?',
            answer:
              'The formal words of ṣalāh (takbīr, Surah al-Fātiḥah, taḥiyyāt, etc.) must be recited in Arabic per the four Sunni schools. Duʿāʾ (personal supplication) between and after the formal parts may be in any language.',
          },
          {
            question: 'What if I miss a prayer?',
            answer:
              'Prayers that are missed (qaḍāʾ) should be made up as soon as one remembers. The Prophet ﷺ said: "Whoever forgets a prayer, let him pray it when he remembers it; there is no expiation other than that" (Sahih al-Bukhari 597). Deliberately abandoning prayer is a major sin.',
          },
          {
            question: 'How do I learn the movements and words?',
            answer:
              'The /learn-salah pages break each prayer into step-by-step movements — takbīr, qiyām (standing), rukūʿ (bowing), sujūd (prostration), julūs (sitting), taḥiyyāt, and taslīm — with the Arabic recitation, transliteration, and translation for each. Best learned in person from a qualified teacher, but the visual reference helps memorization.',
          },
        ]}
      />
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("learnSalah"), url: siteUrl("/learn-salah") },
        ]}
      />

      <p className="kicker">{t("eyebrow")}</p>
      <h1 className="page-title">{t("title")}</h1>
      <p className="page-lede">{t("description")}</p>

      {/* Question-shaped H2 for AEO — Google AI Overviews and Perplexity
          look for `<h2>`s that phrase the search intent as a question and
          answer it directly beneath. Placed above the fold, before the
          picker, so the crawlable outline reads: H1 (topic) → H2 (question)
          → tutorials. */}
      <section aria-labelledby="what-is-salah" style={{ marginTop: "32px" }}>
        <h2 id="what-is-salah" className="page-subtitle">
          What is Salah?
        </h2>
        <p className="page-lede" style={{ marginTop: "12px" }}>
          Salah (Arabic: صَلَاة) is the ritual prayer performed five times daily
          by every Muslim beyond puberty — at dawn (Fajr), midday (Zuhr),
          afternoon (Asr), sunset (Maghrib), and night (Isha). Each prayer is
          a fixed sequence of standing, bowing (rukūʿ), and prostrating
          (sujūd), recited in Arabic while facing the Qiblah — the direction
          of the Kaʿbah in Makkah. It is the second pillar of Islam after the
          shahada and the first act every Muslim is accountable for on the
          Day of Judgement.
        </p>
      </section>

      <div className="prayer-picker" role="tablist" style={{ marginTop: "24px" }}>
        {tutorials.map((tut, i) => (
          <Link key={tut.slug} href={`/learn-salah/${tut.slug}`} role="tab" aria-selected={i === 0}>
            {tut.title[lang]}
          </Link>
        ))}
      </div>

      <div className="timeline">
        {tutorials.map((tut, i) => (
          <div key={tut.slug} className="step">
            <span className="step-num">Tutorial {i + 1}</span>
            <h3>{tut.title[lang]}</h3>
            <p className="subtitle">
              {tut.category}
              {tut.rakats ? ` · ${tut.rakats} rakats` : ""}
            </p>
            <div className="body">
              <p>{tut.summary[lang]}</p>
            </div>
            <p className="source" style={{ marginTop: 12 }}>
              <Link
                href={`/learn-salah/${tut.slug}`}
                className="focus-ring"
                style={{
                  color: "hsl(var(--accent))",
                  textDecoration: "underline",
                  textUnderlineOffset: 2,
                }}
              >
                Open the full tutorial →
              </Link>
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
