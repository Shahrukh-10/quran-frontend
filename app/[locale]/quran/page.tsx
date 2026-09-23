import { QuranIndexSearch } from "@/components/quran/index-search";
import { BreadcrumbSchema, FaqSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { type Surah, getAllSurahs } from "@/lib/quran";
import { hreflangLanguages, mergedOgImages } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "./_quran-hig.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  const t = await getTranslations({ locale, namespace: "quran.list" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: siteUrl(locale === "en" ? "/quran" : `/${locale}/quran`),
      languages: hreflangLanguages("/quran"),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/quran" : `/${locale}/quran`),
      type: "article",
      locale,
      images: mergedOgImages(t("title")),
    },
  };
}

// Classical division of the surahs — used by exegetes to group the muṣḥaf into
// four categories by length. See az-Zarkashī, al-Burhān fī ʿUlūm al-Qurʾān.
type GroupKey = "tiwal" | "miin" | "mathani" | "mufassal_long" | "mufassal_med" | "mufassal_short";
const GROUP_META: Record<GroupKey, { title: string; caption: string; range: [number, number] }> = {
  tiwal: {
    title: "Al-Fatihah & The Seven Long (as-Sabʿ aṭ-Ṭiwāl)",
    caption: "Surahs 1–7 — the opening chapter and the longest of the muṣḥaf.",
    range: [1, 7],
  },
  miin: {
    title: "Al-Miʾīn",
    caption: "Surahs 8–29 — the medium-long chapters.",
    range: [8, 29],
  },
  mathani: {
    title: "Al-Mathānī",
    caption: "Surahs 30–49 — repeated moderate-length chapters.",
    range: [30, 49],
  },
  mufassal_long: {
    title: "Al-Mufaṣṣal — Ṭiwāl (long)",
    caption: "Surahs 50–77 — the detailed chapters, longer group.",
    range: [50, 77],
  },
  mufassal_med: {
    title: "Al-Mufaṣṣal — Awsāṭ (medium)",
    caption: "Surahs 78–92 — the detailed chapters, medium group.",
    range: [78, 92],
  },
  mufassal_short: {
    title: "Al-Mufaṣṣal — Qiṣār (short)",
    caption: "Surahs 93–114 — the detailed chapters, short group.",
    range: [93, 114],
  },
};

function groupSurahs(surahs: readonly Surah[]) {
  const groups: Record<GroupKey, Surah[]> = {
    tiwal: [],
    miin: [],
    mathani: [],
    mufassal_long: [],
    mufassal_med: [],
    mufassal_short: [],
  };
  for (const s of surahs) {
    for (const [key, meta] of Object.entries(GROUP_META) as [GroupKey, typeof GROUP_META.tiwal][]) {
      const [lo, hi] = meta.range;
      if (s.number >= lo && s.number <= hi) {
        groups[key].push(s);
        break;
      }
    }
  }
  return groups;
}

export default async function QuranIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const surahs = getAllSurahs();
  const groups = groupSurahs(surahs);

  return (
    <>
      {/* GEO/AEO — FAQPage schema for AI answer engines (ChatGPT,
          Perplexity, Claude, Google AI Overviews). Seeds citation-eligible
          Q&A that mirrors the highest-intent search queries for this hub.
          English-only for now — JSON-LD is crawler-facing. */}
      <FaqSchema
        items={[
          {
            question: 'How many surahs and ayahs are in the Quran?',
            answer:
              'The Quran contains 114 surahs (chapters) and 6,236 ayat (verses). The surahs are of varying lengths — the longest is Surah al-Baqarah (286 ayat) and the shortest is Surah al-Kawthar (3 ayat). Surahs are broadly classified as Makkan (revealed in Mecca) or Madinan (revealed in Madinah).',
          },
          {
            question: 'Which Quran text does Quran Daily use?',
            answer:
              'Quran Daily uses the Uthmani script (rasm ʿUthmānī) sourced from Tanzil (tanzil.net), verified against the King Fahd Complex printing in Madinah. This is the standard script used in most printed Mushafs and taught in traditional Quran schools worldwide.',
          },
          {
            question: 'Can I read the Quran by juz, hizb, or page?',
            answer:
              'Yes. The reader supports multiple navigation paths: /quran/juz/[1-30] for the 30 juz (paras), /quran/hizb/[1-60] for the 60 hizb, /quran/page/[1-604] for the standard Madinah Mushaf 604-page layout, plus /quran/manzil/[1-7] and /quran/ruku/[1-558].',
          },
          {
            question: 'What translations are available?',
            answer:
              'English translations include Sahih International, Yusuf Ali, and Taqi Usmani. The interface itself is available in six languages (English, Bahasa Indonesia, Arabic, French, Turkish, Urdu) with per-language Quran translations. Every translation cites its source.',
          },
          {
            question: 'Is word-by-word Arabic-English translation available?',
            answer:
              'Yes. Visit /quran/word-by-word/[surah] for a per-word Arabic-English grammatical breakdown of every verse — useful for learners studying Quranic Arabic. Word data is sourced from the Corpus Quran / QuranicCorpus scholarly datasets.',
          },
          {
            question: 'Can I listen to audio recitation?',
            answer:
              'Yes. Every ayah page includes verse-level audio recitation. The audio is streamed from the standard Alafasy recitation available via the Quran.com API — no per-ayah files are hosted on this site.',
          },
        ]}
      />
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("quran"), url: siteUrl("/quran") },
        ]}
      />

      <section className="page-hero">
        <div className="container container--narrow">
          <span className="page-hero__eyebrow">Al-Qurʾān al-Karīm · 114 sūrahs</span>
          <h1 className="page-hero__title">The Noble Quran.</h1>
          <p className="page-hero__subtitle">
            All 114 surahs, verse-by-verse, with translation, transliteration, and audio from five
            reciters. Static and offline-first — every ayah has a permanent URL.
          </p>
        </div>
      </section>

      <div className="search-bar">
        <div className="container container--narrow">
          <QuranIndexSearch />
        </div>
      </div>

      <div className="container container--narrow grouped-list" id="grouped-list">
        {(Object.entries(GROUP_META) as [GroupKey, typeof GROUP_META.tiwal][]).map(
          ([key, meta]) => (
            <section key={key} className="group">
              <h2 className="group__header">{meta.title}</h2>
              <p className="group__caption">{meta.caption}</p>
              <ul className="group__list">
                {groups[key].map((s) => (
                  <li
                    key={s.number}
                    className="row"
                    data-search={`${s.slug} ${s.name} ${s.englishTranslation} ${s.arabicName} ${s.number}`.toLowerCase()}
                  >
                    <Link href={`/quran/${s.slug}`} className="row__link">
                      <div className="row__num">{s.number}</div>
                      <div className="row__main">
                        <div className="row__name">
                          {s.name}
                          <span className="row__meaning"> · {s.englishTranslation}</span>
                        </div>
                        <div className="row__caption">
                          {s.revelation === "meccan" ? "Meccan" : "Medinan"} · {s.ayahCount} ayat
                        </div>
                      </div>
                      <div className="hstack">
                        <span className="row__arabic" lang="ar" dir="rtl">
                          {s.arabicName}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ),
        )}
      </div>
    </>
  );
}
