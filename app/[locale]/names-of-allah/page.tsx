import { BreadcrumbSchema, FaqSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getAllNames } from "@/lib/names";
import { hreflangLanguages, mergedOgImages } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import "./_names-hig.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  return {
    title: "The 99 Names of Allah — Al-Asmāʾ al-Ḥusnā",
    description:
      'The 99 beautiful names of Allah, each with Arabic, transliteration, and translation. "To Allah belong the most beautiful names, so call upon Him by them." (Qur\'ān 7:180)',
    alternates: {
      canonical: siteUrl(locale === "en" ? "/names-of-allah" : `/${locale}/names-of-allah`),
      languages: hreflangLanguages("/names-of-allah"),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/names-of-allah" : `/${locale}/names-of-allah`),
      type: "article",
      locale,
      images: mergedOgImages("The 99 Names of Allah — Al-Asmāʾ al-Ḥusnā"),
    },
  };
}

export default async function NamesIndexPage({ params }: PageProps) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const names = getAllNames();
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";

  return (
    <div className="container" style={{ paddingTop: 64, paddingBottom: 96 }}>
      <FaqSchema
        items={[
          {
            question: 'What are the 99 Names of Allah?',
            answer:
              'The 99 Names of Allah (Asmāʾ al-Ḥusnā, الأسماء الحسنى) are the beautiful names by which Muslims refer to God, drawn from the Quran and authentic hadith. The Prophet ﷺ said: "To Allah belong the most beautiful names, so call upon Him by them" (Sahih al-Bukhari 7392, Sahih Muslim 2677).',
          },
          {
            question: 'Is the number 99 literal or symbolic?',
            answer:
              'Scholarly consensus is that the number 99 represents a comprehensive but not exhaustive list — some hadith describe 100 names, and multiple classical lists exist (al-Walīd bin Muslim, al-Tirmidhī, Ibn Mājah). The version on this site follows the widely accepted at-Tirmidhī enumeration.',
          },
          {
            question: 'How do I pronounce each name correctly?',
            answer:
              'Every name page includes the Arabic text, precise scholarly transliteration (using diacritical marks — ā ī ū for long vowels; ḥ ṣ ḍ for emphatic consonants), and an English gloss. Audio pronunciation is provided via the browser\'s SpeechSynthesis API where an Arabic voice is available.',
          },
          {
            question: 'Can I use the Names in dua?',
            answer:
              'Yes — invoking Allah by His names is explicitly encouraged in the Quran (7:180). Traditional practice is to choose names that fit your situation: al-Ghafūr (the Oft-Forgiving) when seeking forgiveness, al-Razzāq (the Provider) when seeking sustenance, al-Shāfī (the Healer) when seeking healing.',
          },
          {
            question: 'What is the difference between an Attribute (ṣifah) and a Name (ism)?',
            answer:
              'A Name (ism) refers to Allah\'s essence — al-Raḥmān, al-Malik. An Attribute (ṣifah) describes an aspect of His action or being — mercy, sovereignty. Every Name implies an Attribute, but not every Attribute is expressed as a proper Name. Classical theology treats them together.',
          },
          {
            question: 'Are the Names authored by humans or from revelation?',
            answer:
              'The names themselves are all from the Quran and authentic hadith — no human invention. Different classical scholars produced slightly different enumerations to reach 99, since the Quran and Sunnah mention more than 99 names collectively. The consensus is that all authentic names of Allah are equally to be revered.',
          },
        ]}
      />
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: "99 Names", url: siteUrl("/names-of-allah") },
        ]}
      />

      <header>
        <p className="kicker">Al-Asmāʾ al-Ḥusnā</p>
        <h1 className="page-title">The 99 Names of Allāh.</h1>
        <p className="page-lede">
          &ldquo;To Allāh belong the most beautiful names, so call upon Him by them.&rdquo;
          (Qur&apos;ān 7:180)
        </p>
      </header>

      {/* Question-shaped H2 for AEO — the outline reads H1 (topic) → H2
          (question) → grid of 99 names. AI answer engines quote the two
          paragraphs directly below `<h2>` when the query is phrased as a
          question ("What are the 99 Names of Allah?"). */}
      <section aria-labelledby="what-are-99-names" style={{ marginTop: "32px" }}>
        <h2 id="what-are-99-names" className="page-subtitle">
          What are the 99 Names of Allah?
        </h2>
        <p className="page-lede" style={{ marginTop: "12px" }}>
          The 99 Names of Allah — al-Asmāʾ al-Ḥusnā (الأسماء الحسنى, &ldquo;the
          most beautiful names&rdquo;) — are the attributes by which Allah has
          named Himself in the Qur&apos;an and in the authentic hadith of the
          Prophet Muḥammad ﷺ. Each name describes a facet of the divine — such
          as ar-Raḥmān (the Entirely Merciful), al-Ḥakīm (the All-Wise), or
          al-Ghafūr (the Most-Forgiving) — and Muslims are taught to invoke
          Allah by them. The Prophet ﷺ said: &ldquo;Allah has ninety-nine
          names; whoever memorizes them will enter Paradise&rdquo; (Ṣaḥīḥ
          al-Bukhārī 2736, Muslim 2677).
        </p>
      </section>

      <div className="names-grid">
        {names.map((n) => (
          <Link key={n.slug} href={`/names-of-allah/${n.slug}`} className="focus-ring name-card">
            <span className="name-number">{n.order}</span>
            <div className="name-ar" lang="ar" dir="rtl">
              {n.arabic}
            </div>
            <div className="name-translit">{n.transliteration}</div>
            <div className="name-en">{n.meaning[lang]}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
