import { AyahCard } from "@/components/quran/ayah-card";
import {
  ArticleSchema,
  AyahQuotationSchema,
  BreadcrumbSchema,
} from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getAllSurahs, getSurahBySlug, loadAyah, loadSurahAyat } from "@/lib/quran";
import { hreflangLanguages, mergedOgImages } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
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
    name: "Terjemahan Indonesia",
    note: "Bahasa Indonesia translation for the largest Muslim-majority population.",
  },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, surah, ayah } = await params;
  const s = getSurahBySlug(surah);
  if (!s) return {};
  const ayahNum = Number.parseInt(ayah, 10);
  if (!Number.isInteger(ayahNum) || ayahNum < 1 || ayahNum > s.ayahCount) return {};
  const loaded = await loadAyah(s.number, ayahNum);
  const translation =
    loaded?.translations["en.sahih"] ?? `Ayah ${ayahNum} of Surah ${s.name}.`;
  const title = `Quran ${s.number}:${ayahNum} — ${s.name} · "${translation.slice(0, 55)}${translation.length > 55 ? "…" : ""}"`;
  const desc = `${translation} — Surah ${s.name} (${s.arabicName}), verse ${ayahNum} of ${s.ayahCount}. Read Arabic Uthmani text, transliteration, Saheeh International, Pickthall and Yusuf Ali translations. Sourced from Tanzil.`;
  return {
    title: title.slice(0, 70),
    description: desc.slice(0, 300),
    keywords: [
      `Quran ${s.number}:${ayahNum}`,
      `Surah ${s.name}`,
      `${s.name} ayah ${ayahNum}`,
      `${s.name} verse ${ayahNum}`,
      `${s.arabicName} ${ayahNum}`,
      "Quran translation",
      "Quran Arabic",
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
      title: title.slice(0, 90),
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

  const sahih = a?.translations["en.sahih"] ?? "";
  const translationsPresent = TRANSLATORS.filter((tr) => a?.translations[tr.id]);

  // FAQ data (used both for visible content and JSON-LD FAQPage schema)
  const faqs = a
    ? [
        {
          q: `What does Quran ${s.number}:${ayahNum} say?`,
          a: `${sahih} This is verse ${ayahNum} of Surah ${s.name} (${s.arabicName}, "${s.englishTranslation}"), a ${s.revelation === "meccan" ? "Meccan" : "Medinan"} surah.`,
        },
        {
          q: `What is the Arabic text of Surah ${s.name} verse ${ayahNum}?`,
          a: `The Arabic (Uthmani script): ${a.arabic}${a.transliteration ? ` — transliteration: ${a.transliteration}` : ""}.`,
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
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("quran"), url: siteUrl("/quran") },
          { name: s.name, url: siteUrl(`/quran/${s.slug}`) },
          {
            name: `${s.number}:${ayahNum}`,
            url: siteUrl(`/quran/${s.slug}/${ayahNum}`),
          },
        ]}
      />
      <ArticleSchema
        headline={`Quran ${s.number}:${ayahNum} — ${s.name}`}
        description={sahih || `Ayah ${ayahNum} of Surah ${s.name}.`}
        url={siteUrl(`/quran/${s.slug}/${ayahNum}`)}
      />
      <AyahQuotationSchema
        arabic={a?.arabic ?? ""}
        translation={sahih || `Ayah ${ayahNum} of Surah ${s.name}.`}
        surahName={s.name}
        surahNumber={s.number}
        ayahNumber={ayahNum}
        url={siteUrl(`/quran/${s.slug}/${ayahNum}`)}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD injection
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* Visible breadcrumb — Google requires visible breadcrumb text on top of BreadcrumbList schema */}
      <nav
        aria-label="Breadcrumb"
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
        <span className="text-foreground">
          {s.number}:{ayahNum}
        </span>
      </nav>

      <header>
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          {t("eyebrow", { surah: s.name, ayah: ayahNum })}
        </p>
        <h1 className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-title">
          {sahih
            ? `"${sahih.slice(0, 80)}${sahih.length > 80 ? "…" : ""}" — ${s.name} ${s.number}:${ayahNum}`
            : `Surah ${s.name} · Ayah ${ayahNum}`}
        </h1>
        {/* Surah context — one sentence, server-rendered, gives Google & AI a
            durable factual snippet about the surah on every ayah page. */}
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Verse {ayahNum} of {s.ayahCount} · Surah {s.name} ({s.arabicName}) —{" "}
          <em>{s.englishTranslation}</em>. This is the {s.number}
          {ord(s.number)} chapter of the Holy Quran, a{" "}
          {s.revelation === "meccan" ? "Meccan" : "Medinan"} surah.{" "}
          {a?.juz ? `Located in Juz ${a.juz}.` : null}
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
          className="mt-10 rounded-2xl border border-separator bg-surface p-6"
          aria-labelledby="translations-heading"
        >
          <h2
            id="translations-heading"
            className="text-lg font-bold tracking-title"
          >
            Translations of {s.name} {s.number}:{ayahNum}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {translationsPresent.length} sourced translations of this verse.
            Different translators make different choices — reading multiple
            renderings deepens understanding.
          </p>
          {a.transliteration && (
            <div className="mt-4 rounded-xl bg-muted/30 p-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Transliteration
              </div>
              <p className="mt-1 text-base italic">{a.transliteration}</p>
            </div>
          )}
          <dl className="mt-4 space-y-4">
            {translationsPresent.map((tr) => (
              <div
                key={tr.id}
                className="border-t border-separator pt-4 first:border-0 first:pt-0"
              >
                <dt className="text-sm font-semibold">{tr.name}</dt>
                <dd className="mt-1 text-base leading-relaxed">
                  {a.translations[tr.id]}
                </dd>
                <p className="mt-1 text-xs text-muted-foreground">{tr.note}</p>
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
        <section
          className="mt-10"
          aria-labelledby="context-heading"
        >
          <h2
            id="context-heading"
            className="text-lg font-bold tracking-title"
          >
            Surrounding verses in Surah {s.name}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {prevAyah && (
              <Link
                href={`/quran/${s.slug}/${prevAyah.ayah}` as "/quran/[surah]/[ayah]"}
                className="focus-ring block rounded-2xl border border-separator bg-surface p-5 hover:bg-muted transition-colors"
              >
                <span className="block text-xs uppercase tracking-widest text-muted-foreground">
                  Previous · {s.name} {s.number}:{prevAyah.ayah}
                </span>
                <p className="mt-2 text-sm leading-relaxed">
                  {(prevAyah.translations["en.sahih"] ?? "").slice(0, 200)}
                  {(prevAyah.translations["en.sahih"] ?? "").length > 200
                    ? "…"
                    : ""}
                </p>
              </Link>
            )}
            {nextAyah && (
              <Link
                href={`/quran/${s.slug}/${nextAyah.ayah}` as "/quran/[surah]/[ayah]"}
                className="focus-ring block rounded-2xl border border-separator bg-surface p-5 hover:bg-muted transition-colors"
              >
                <span className="block text-xs uppercase tracking-widest text-muted-foreground">
                  Next · {s.name} {s.number}:{nextAyah.ayah}
                </span>
                <p className="mt-2 text-sm leading-relaxed">
                  {(nextAyah.translations["en.sahih"] ?? "").slice(0, 200)}
                  {(nextAyah.translations["en.sahih"] ?? "").length > 200
                    ? "…"
                    : ""}
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
        <section className="mt-10" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-lg font-bold tracking-title">
            Frequently asked about {s.name} {s.number}:{ayahNum}
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
      )}

      {/* About-this-surah callout — durable factual content that will not change,
          giving every ayah page a stable topical anchor. */}
      <section
        className="mt-10 rounded-2xl border border-separator bg-surface p-6"
        aria-labelledby="about-surah-heading"
      >
        <h2 id="about-surah-heading" className="text-lg font-bold tracking-title">
          About Surah {s.name}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Surah {s.name} ({s.arabicName}) — <em>{s.englishTranslation}</em> — is
          the {s.number}
          {ord(s.number)} chapter of the Holy Quran. It contains {s.ayahCount}{" "}
          verses (ayat) and was revealed in{" "}
          {s.revelation === "meccan" ? "Mecca" : "Medina"}, making it a{" "}
          {s.revelation === "meccan" ? "Meccan" : "Medinan"} surah in the
          traditional classification.
        </p>
        <p className="mt-3 text-sm">
          <Link
            href={`/quran/${s.slug}` as "/quran/[surah]"}
            className="text-accent hover:underline"
          >
            Read the full Surah {s.name} →
          </Link>
        </p>
      </section>

      <nav
        aria-label="Ayah navigation"
        className="mt-16 grid grid-cols-2 gap-4 border-t border-separator pt-8"
      >
        <div>
          {prevSlug && (
            <Link
              href={`/quran/${prevSlug}` as "/quran/[surah]/[ayah]"}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">
                {t("previous")}
              </span>
              <span className="mt-1 block font-semibold tracking-title">
                Ayah {ayahNum - 1}
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
              <span className="block text-xs text-muted-foreground">
                {t("next")}
              </span>
              <span className="mt-1 block font-semibold tracking-title">
                Ayah {ayahNum + 1}
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
