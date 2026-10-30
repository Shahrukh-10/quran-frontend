import { AyahCard } from "@/components/quran/ayah-card";
import {
  ArticleSchema,
  AyahQuotationSchema,
  BreadcrumbSchema,
} from "@/components/seo/structured-data";
import { isLocale, locales, rtlLocales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { cleanArabicForDisplay } from "@/lib/arabic-text";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { getAllSurahs, getSurahBySlug, loadAyah, loadSurahAyat } from "@/lib/quran";
import { buildAyahTitle, hreflangLanguages, mergedOgImages } from "@/lib/seo";
import { siteName, siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

// Static params for all 6,236 ayat per docs/ARCHITECTURE.md — every ayah is its own HTML file.
export async function generateStaticParams() {
  const surahs = getAllSurahs();
  const params: Array<{ locale: string; surah: string; ayah: string }> = [];
  for (const locale of locales) {
    for (const s of surahs) {
      for (let n = 1; n <= s.ayahCount; n++) {
        params.push({ locale, surah: s.slug, ayah: String(n) });
      }
    }
  }
  return params;
}

type Props = { params: Promise<{ locale: string; surah: string; ayah: string }> };

// Translator display metadata, ordered by SEO/AEO citation weight — Sahih International
// is the modern standard citation in AI answer engines and academic queries; Pickthall
// and Yusuf Ali are classic references that widen the query-match surface.
const TRANSLATORS: Array<{ id: string; name: string; note: string }> = [
  {
    id: "en.sahih",
    name: "Saheeh International",
    note: "Modern standard English translation, published by Abul-Qasim.",
  },
  {
    id: "en.pickthall",
    name: "Marmaduke Pickthall",
    note: "1930 — first English translation of the Qur'an by a Muslim scholar.",
  },
  {
    id: "en.yusufali",
    name: "Abdullah Yusuf Ali",
    note: "1934 — widely-cited classic English rendering with commentary tradition.",
  },
  {
    id: "id.indonesian",
    name: "Kementerian Agama RI",
    note: "Bahasa Indonesia, edition id.indonesian, supplied through Al-Quran Cloud.",
  },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, surah, ayah } = await params;
  const s = getSurahBySlug(surah);
  if (!s) return {};
  const ayahNum = Number.parseInt(ayah, 10);
  if (!Number.isInteger(ayahNum) || ayahNum < 1 || ayahNum > s.ayahCount) return {};
  const loaded = await loadAyah(s.number, ayahNum);
  const isIndonesian = locale === "id";
  const translation = loaded?.translations[isIndonesian ? "id.indonesian" : "en.sahih"] ?? "";
  const title = buildAyahTitle(s.number, ayahNum, s.name, translation);
  const desc = isIndonesian
    ? `Surah ${s.name}, ayat ${ayahNum} dari ${s.ayahCount}. Baca teks Arab, transliterasi, dan terjemahan bahasa Indonesia. ${translation}`
    : `${translation} — Surah ${s.name} (${s.arabicName}), verse ${ayahNum} of ${s.ayahCount}. Read Arabic text, transliteration, Saheeh International, Pickthall and Yusuf Ali translations.`;
  return {
    title: { absolute: title },
    description: desc.slice(0, 300),
    keywords: [
      `Quran ${s.number}:${ayahNum}`,
      `Surah ${s.name}`,
      `${s.name} ${isIndonesian ? "ayat" : "ayah"} ${ayahNum}`,
      `${s.name} ${isIndonesian ? "ayat" : "verse"} ${ayahNum}`,
      `${s.arabicName} ${ayahNum}`,
      isIndonesian ? "terjemahan Quran" : "Quran translation",
      isIndonesian ? "Quran bahasa Arab" : "Quran Arabic",
      "Quran online",
      translation.split(" ").slice(0, 5).join(" "),
    ].join(", "),
    alternates: {
      canonical: siteUrl(
        locale === "en" ? `/quran/${surah}/${ayahNum}` : `/${locale}/quran/${surah}/${ayahNum}`,
      ),
      languages: hreflangLanguages(`/quran/${surah}/${ayahNum}`),
    },
    openGraph: {
      title,
      description: translation,
      url: siteUrl(
        locale === "en" ? `/quran/${surah}/${ayahNum}` : `/${locale}/quran/${surah}/${ayahNum}`,
      ),
      type: "article",
      locale,
      images: mergedOgImages(`Quran ${s.number}:${ayahNum} — ${s.name}`),
    },
  };
}

export default async function AyahPage({ params }: Props) {
  const { locale, surah, ayah } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const s = getSurahBySlug(surah);
  if (!s) notFound();
  const ayahNum = Number.parseInt(ayah, 10);
  if (!Number.isInteger(ayahNum) || ayahNum < 1 || ayahNum > s.ayahCount) notFound();

  const t = await getTranslations({ locale, namespace: "quran.ayah" });
  const full = await loadSurahAyat(s.number);
  const a = full?.find((x) => x.ayah === ayahNum);
  const prevAyah = full?.find((x) => x.ayah === ayahNum - 1);
  const nextAyah = full?.find((x) => x.ayah === ayahNum + 1);

  const prevSlug = ayahNum > 1 ? `${s.slug}/${ayahNum - 1}` : null;
  const nextSlug = ayahNum < s.ayahCount ? `${s.slug}/${ayahNum + 1}` : null;

  const isIndonesian = locale === "id";
  const contentLocale = isIndonesian ? "id" : "en";
  const translationId = isIndonesian ? "id.indonesian" : "en.sahih";
  const sahih = a?.translations[translationId] ?? "";
  const localizedUrl = (path: string) => siteUrl(locale === "en" ? path : `/${locale}${path}`);
  const ayahUrl = localizedUrl(`/quran/${s.slug}/${ayahNum}`);
  const fallback = isIndonesian
    ? `Surah ${s.name}, ayat ${ayahNum}.`
    : `Ayah ${ayahNum} of Surah ${s.name}.`;
  const translationsPresent = TRANSLATORS.filter((tr) => a?.translations[tr.id]);

  // FAQ data (used both for visible content and JSON-LD FAQPage schema)
  const faqs = a
    ? isIndonesian
      ? [
          {
            q: `Apa isi Quran ${s.number}:${ayahNum}?`,
            a: `${sahih} Ini adalah ayat ${ayahNum} dari Surah ${s.name} (${s.arabicName}).`,
          },
          {
            q: `Apa teks Arab Surah ${s.name} ayat ${ayahNum}?`,
            a: `Teks Arab: ${cleanArabicForDisplay(a.arabic ?? a.uthmani ?? "")}${a.transliteration ? ` — transliterasi: ${a.transliteration}` : ""}.`,
          },
          {
            q: `Quran ${s.number}:${ayahNum} ada di juz dan halaman berapa?`,
            a: `${s.name} ${s.number}:${ayahNum} ada di juz ${a.juz}${a.page ? `, halaman mushaf ${a.page}` : ""}.`,
          },
          {
            q: `Berapa jumlah ayat Surah ${s.name}?`,
            a: `Surah ${s.name} terdiri dari ${s.ayahCount} ayat. Surah ini adalah surah ke-${s.number} dalam Al-Quran dan diturunkan di ${s.revelation === "meccan" ? "Makkah" : "Madinah"}.`,
          },
        ]
      : [
          {
            q: `What does Quran ${s.number}:${ayahNum} say?`,
            a: `${sahih} This is verse ${ayahNum} of Surah ${s.name} (${s.arabicName}, "${s.englishTranslation}"), a ${s.revelation === "meccan" ? "Meccan" : "Medinan"} surah.`,
          },
          {
            q: `What is the Arabic text of Surah ${s.name} verse ${ayahNum}?`,
            a: `The Arabic text: ${cleanArabicForDisplay(a.arabic ?? a.uthmani ?? "")}${a.transliteration ? ` — transliteration: ${a.transliteration}` : ""}.`,
          },
          {
            q: `Which juz and page is Quran ${s.number}:${ayahNum} in?`,
            a: `${s.name} ${s.number}:${ayahNum} appears in Juz ${a.juz}${a.page ? `, on Mushaf page ${a.page}` : ""}.`,
          },
          {
            q: `How many verses does Surah ${s.name} have?`,
            a: `Surah ${s.name} contains ${s.ayahCount} verses (ayat) in total. It is the ${s.number}${ord(s.number)} surah of the Quran and was revealed in ${s.revelation === "meccan" ? "Mecca" : "Medina"}.`,
          },
        ]
    : [];

  const faqSchema = faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        inLanguage: contentLocale,
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  return (
    <article
      lang={locale}
      dir={isLocale(locale) && rtlLocales.includes(locale) ? "rtl" : "ltr"}
      className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16"
    >
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: localizedUrl("") },
          { name: bc("quran"), url: localizedUrl("/quran") },
          { name: s.name, url: localizedUrl(`/quran/${s.slug}`) },
          {
            name: `${s.number}:${ayahNum}`,
            url: ayahUrl,
          },
        ]}
      />
      {isIndonesian ? (
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD from sourced Quran data
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Article",
                  headline: `Quran ${s.number}:${ayahNum} — ${s.name}`,
                  description: sahih || fallback,
                  inLanguage: "id",
                  url: ayahUrl,
                  mainEntityOfPage: ayahUrl,
                  image: siteUrl("/opengraph-image"),
                  author: { "@type": "Organization", name: siteName, url: siteUrl("/") },
                  publisher: { "@type": "Organization", name: siteName, url: siteUrl("/") },
                },
                {
                  "@type": "Quotation",
                  text: sahih,
                  citation: `Qur'an ${s.number}:${ayahNum} — Surah ${s.name} — Kementerian Agama RI (id.indonesian)`,
                  inLanguage: "id",
                  url: ayahUrl,
                  translationOfWork: {
                    "@type": "CreativeWork",
                    name: `Surah ${s.name}, ayat ${ayahNum}`,
                    text: cleanArabicForDisplay(a?.arabic ?? a?.uthmani ?? ""),
                    inLanguage: "ar",
                  },
                  isPartOf: {
                    "@type": "Chapter",
                    name: `Surah ${s.name}`,
                    position: s.number,
                    isPartOf: { "@type": "Book", "@id": siteUrl("/quran"), name: "The Qur'an" },
                  },
                },
              ],
            }).replace(/</g, "\\u003c"),
          }}
        />
      ) : (
        <>
          <ArticleSchema
            headline={`Quran ${s.number}:${ayahNum} — ${s.name}`}
            description={sahih || `Ayah ${ayahNum} of Surah ${s.name}.`}
            url={ayahUrl}
          />
          <AyahQuotationSchema
            arabic={cleanArabicForDisplay(a?.arabic ?? a?.uthmani ?? "")}
            translation={sahih || `Ayah ${ayahNum} of Surah ${s.name}.`}
            surahName={s.name}
            surahNumber={s.number}
            ayahNumber={ayahNum}
            url={ayahUrl}
          />
        </>
      )}
      {faqSchema && (
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD injection
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* Visible breadcrumb — Google requires visible breadcrumb text on top of BreadcrumbList schema */}
      <nav
        aria-label={isIndonesian ? "Jejak navigasi" : "Breadcrumb"}
        className="mb-6 text-sm text-muted-foreground"
      >
        <Link href="/" className="hover:text-accent hover:underline">
          {bc("home")}
        </Link>
        <span className="mx-2">›</span>
        <Link href="/quran" className="hover:text-accent hover:underline">
          {bc("quran")}
        </Link>
        <span className="mx-2">›</span>
        <Link
          href={`/quran/${s.slug}` as "/quran/[surah]"}
          className="hover:text-accent hover:underline"
        >
          {s.name}
        </Link>
        <span className="mx-2">›</span>
        <bdi dir="ltr" className="text-foreground">
          {s.number}:{ayahNum}
        </bdi>
      </nav>

      <header>
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          {t("eyebrow", { surah: s.name, ayah: ayahNum })}
        </p>
        <h1
          lang={contentLocale}
          dir="ltr"
          className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-title"
        >
          {buildAyahTitle(s.number, ayahNum, s.name, sahih)}
        </h1>
        {/* Surah context — one sentence, server-rendered, gives Google & AI a
            durable factual snippet about the surah on every ayah page. */}
        <p
          lang={contentLocale}
          dir="ltr"
          className="mt-3 text-sm leading-relaxed text-muted-foreground"
        >
          {isIndonesian ? (
            <>
              Ayat {ayahNum} dari {s.ayahCount} · Surah {s.name} (
              <span lang="ar" dir="rtl">
                {s.arabicName}
              </span>
              ). Surah ke-{s.number} dalam Al-Quran, termasuk surah{" "}
              {s.revelation === "meccan" ? "Makkiyah" : "Madaniyah"}.
              {a?.juz ? ` Juz ${a.juz}.` : null}
            </>
          ) : (
            <>
              Verse {ayahNum} of {s.ayahCount} · Surah {s.name} (
              <span lang="ar" dir="rtl">
                {s.arabicName}
              </span>
              ) — <em>{s.englishTranslation}</em>. This is the {s.number}
              {ord(s.number)} chapter of the Holy Quran, a{" "}
              {s.revelation === "meccan" ? "Meccan" : "Medinan"} surah.{" "}
              {a?.juz ? `Located in Juz ${a.juz}.` : null}
            </>
          )}
        </p>
      </header>

      <div className="mt-10">
        {a ? (
          <AyahCard ayah={a} surahSlug={s.slug} surahName={s.name} standalone />
        ) : (
          <p className="rounded-2xl border border-separator bg-surface p-6 text-sm text-muted-foreground">
            {t("stub")}
          </p>
        )}
      </div>

      {/* Server-rendered translations panel — ensures every English translation
          + Indonesian + transliteration lands in the initial SSR HTML for
          Googlebot and AI answer engines. This is the primary AEO/GEO surface. */}
      {a && translationsPresent.length > 0 && (
        <section
          lang={contentLocale}
          dir="ltr"
          className="mt-10 rounded-2xl border border-separator bg-surface p-6"
          aria-labelledby="translations-heading"
        >
          <h2 id="translations-heading" className="text-lg font-bold tracking-title">
            {isIndonesian ? "Terjemahan" : "Translations of"} {s.name} {s.number}:{ayahNum}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {isIndonesian
              ? `${translationsPresent.length} terjemahan ayat ini.`
              : `${translationsPresent.length} sourced translations of this verse. Different translators make different choices — reading multiple renderings deepens understanding.`}
          </p>
          {a.transliteration && (
            <div className="mt-4 rounded-xl bg-muted/30 p-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                {isIndonesian ? "Transliterasi" : "Transliteration"}
              </div>
              <p lang="ar-Latn" dir="ltr" className="mt-1 text-base italic">
                {a.transliteration}
              </p>
            </div>
          )}
          <dl className="mt-4 space-y-4">
            {translationsPresent.map((tr) => (
              <div key={tr.id} className="border-t border-separator pt-4 first:border-0 first:pt-0">
                <dt className="text-sm font-semibold">{tr.name}</dt>
                <dd
                  lang={tr.id === "id.indonesian" ? "id" : "en"}
                  dir="ltr"
                  className="mt-1 text-base leading-relaxed"
                >
                  {a.translations[tr.id]}
                </dd>
                <p lang="en" dir="ltr" className="mt-1 text-xs text-muted-foreground">
                  {tr.note}
                </p>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Surrounding-verse context — anchors this URL in a neighborhood so
          Google's classifier can see it's part of a coherent surah, not an
          isolated thin page. Each snippet includes the neighboring ayah's
          translation for meaningful content, not just "Next verse". */}
      {(prevAyah || nextAyah) && (
        <section lang={contentLocale} dir="ltr" className="mt-10" aria-labelledby="context-heading">
          <h2 id="context-heading" className="text-lg font-bold tracking-title">
            {isIndonesian ? "Ayat sekitar dalam Surah" : "Surrounding verses in Surah"} {s.name}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {prevAyah && (
              <Link
                href={`/quran/${s.slug}/${prevAyah.ayah}` as "/quran/[surah]/[ayah]"}
                className="focus-ring block rounded-2xl border border-separator bg-surface p-5 hover:bg-muted transition-colors"
              >
                <span className="block text-xs uppercase tracking-widest text-muted-foreground">
                  {isIndonesian ? "Sebelumnya" : "Previous"} · {s.name} {s.number}:{prevAyah.ayah}
                </span>
                <p className="mt-2 text-sm leading-relaxed">
                  {prevAyah.translations[translationId] ?? ""}
                </p>
              </Link>
            )}
            {nextAyah && (
              <Link
                href={`/quran/${s.slug}/${nextAyah.ayah}` as "/quran/[surah]/[ayah]"}
                className="focus-ring block rounded-2xl border border-separator bg-surface p-5 hover:bg-muted transition-colors"
              >
                <span className="block text-xs uppercase tracking-widest text-muted-foreground">
                  {isIndonesian ? "Berikutnya" : "Next"} · {s.name} {s.number}:{nextAyah.ayah}
                </span>
                <p className="mt-2 text-sm leading-relaxed">
                  {nextAyah.translations[translationId] ?? ""}
                </p>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* FAQ block — visible AND JSON-LD. AEO/GEO signal: this is the format
          ChatGPT/Perplexity/Google AI Overviews specifically look for when
          picking answer sources for factual queries like "what does Quran
          1:1 mean" or "how many verses in Surah Al-Fatihah". */}
      {faqs.length > 0 && (
        <section lang={contentLocale} dir="ltr" className="mt-10" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-lg font-bold tracking-title">
            {isIndonesian ? "Pertanyaan tentang" : "Frequently asked about"} {s.name} {s.number}:
            {ayahNum}
          </h2>
          <div className="mt-4 space-y-4">
            {faqs.map((f) => (
              <details key={f.q} className="rounded-2xl border border-separator bg-surface p-5">
                <summary className="cursor-pointer text-base font-semibold">{f.q}</summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {f === faqs[1] ? (
                    <>
                      {isIndonesian ? "Teks Arab: " : "The Arabic text: "}
                      <span lang="ar" dir="rtl">
                        {cleanArabicForDisplay(a?.arabic ?? a?.uthmani ?? "")}
                      </span>
                      {a?.transliteration && (
                        <>
                          {isIndonesian ? " — transliterasi: " : " — transliteration: "}
                          <span lang="ar-Latn" dir="ltr">
                            {a.transliteration}
                          </span>
                        </>
                      )}
                      .
                    </>
                  ) : (
                    f.a
                  )}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* About-this-surah callout — durable factual content that will not change,
          giving every ayah page a stable topical anchor. */}
      <section
        lang={contentLocale}
        dir="ltr"
        className="mt-10 rounded-2xl border border-separator bg-surface p-6"
        aria-labelledby="about-surah-heading"
      >
        <h2 id="about-surah-heading" className="text-lg font-bold tracking-title">
          {isIndonesian ? "Tentang Surah" : "About Surah"} {s.name}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {isIndonesian ? (
            <>
              Surah {s.name} (
              <span lang="ar" dir="rtl">
                {s.arabicName}
              </span>
              ) adalah surah ke-{s.number} dalam Al-Quran. Surah ini terdiri dari {s.ayahCount} ayat
              dan diturunkan di {s.revelation === "meccan" ? "Makkah" : "Madinah"}.
            </>
          ) : (
            <>
              Surah {s.name} (
              <span lang="ar" dir="rtl">
                {s.arabicName}
              </span>
              ) — <em>{s.englishTranslation}</em> — is the {s.number}
              {ord(s.number)} chapter of the Holy Quran. It contains {s.ayahCount} verses (ayat) and
              was revealed in {s.revelation === "meccan" ? "Mecca" : "Medina"}, making it a{" "}
              {s.revelation === "meccan" ? "Meccan" : "Medinan"} surah in the traditional
              classification.
            </>
          )}
        </p>
        <p className="mt-3 text-sm">
          <Link
            href={`/quran/${s.slug}` as "/quran/[surah]"}
            className="text-accent hover:underline"
          >
            {isIndonesian ? "Baca Surah lengkap" : "Read the full Surah"} {s.name} →
          </Link>
        </p>
      </section>

      <nav
        aria-label={isIndonesian ? "Navigasi ayat" : "Ayah navigation"}
        className="mt-16 grid grid-cols-2 gap-4 border-t border-separator pt-8"
      >
        <div>
          {prevSlug && (
            <Link
              href={`/quran/${prevSlug}` as "/quran/[surah]/[ayah]"}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">{t("previous")}</span>
              <span
                lang={contentLocale}
                dir="ltr"
                className="mt-1 block font-semibold tracking-title"
              >
                {isIndonesian ? "Ayat" : "Ayah"} {ayahNum - 1}
              </span>
            </Link>
          )}
        </div>
        <div className="text-right">
          {nextSlug && (
            <Link
              href={`/quran/${nextSlug}` as "/quran/[surah]/[ayah]"}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">{t("next")}</span>
              <span
                lang={contentLocale}
                dir="ltr"
                className="mt-1 block font-semibold tracking-title"
              >
                {isIndonesian ? "Ayat" : "Ayah"} {ayahNum + 1}
              </span>
            </Link>
          )}
        </div>
      </nav>
    </article>
  );
}

function ord(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  const idx = (v - 20) % 10;
  return suffixes[idx] ?? suffixes[v] ?? suffixes[0] ?? "th";
}
