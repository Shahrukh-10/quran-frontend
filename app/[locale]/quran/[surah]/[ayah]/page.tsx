import { AyahCard } from "@/components/quran/ayah-card";
import { ArticleSchema, BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getAllSurahs, getSurahBySlug, loadAyah, loadSurahAyat } from "@/lib/quran";
import { siteUrl } from "@/lib/site";
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, surah, ayah } = await params;
  const s = getSurahBySlug(surah);
  if (!s) return {};
  const ayahNum = Number.parseInt(ayah, 10);
  if (!Number.isInteger(ayahNum) || ayahNum < 1 || ayahNum > s.ayahCount) return {};
  const loaded = await loadAyah(s.number, ayahNum);
  const desc = loaded?.translations["en.sahih"] ?? `Ayah ${ayahNum} of Surah ${s.name}.`;
  return {
    title: `${s.name} ${s.number}:${ayahNum}`,
    description: `${desc.slice(0, 155)}${desc.length > 155 ? "…" : ""}`,
    alternates: {
      canonical: siteUrl(
        locale === "en" ? `/quran/${surah}/${ayahNum}` : `/${locale}/quran/${surah}/${ayahNum}`,
      ),
      // hreflang: emit an alternate for every supported locale so Google serves the right
      // language version. `as-needed` prefix strategy → default locale (en) has no prefix.
      languages: Object.fromEntries(
        locales.map((l) => [
          l,
          siteUrl(l === "en" ? `/quran/${surah}/${ayahNum}` : `/${l}/quran/${surah}/${ayahNum}`),
        ]),
      ),
    },
  };
}

export default async function AyahPage({ params }: Props) {
  const { locale, surah, ayah } = await params;
  setRequestLocale(locale);
  const s = getSurahBySlug(surah);
  if (!s) notFound();
  const ayahNum = Number.parseInt(ayah, 10);
  if (!Number.isInteger(ayahNum) || ayahNum < 1 || ayahNum > s.ayahCount) notFound();

  const t = await getTranslations({ locale, namespace: "quran.ayah" });
  const full = await loadSurahAyat(s.number);
  const a = full?.find((x) => x.ayah === ayahNum);

  const prevSlug = ayahNum > 1 ? `${s.slug}/${ayahNum - 1}` : null;
  const nextSlug = ayahNum < s.ayahCount ? `${s.slug}/${ayahNum + 1}` : null;

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: siteUrl("/") },
          { name: "Quran", url: siteUrl("/quran") },
          { name: s.name, url: siteUrl(`/quran/${s.slug}`) },
          {
            name: `${s.number}:${ayahNum}`,
            url: siteUrl(`/quran/${s.slug}/${ayahNum}`),
          },
        ]}
      />
      <ArticleSchema
        headline={`Quran ${s.number}:${ayahNum} — ${s.name}`}
        description={a?.translations["en.sahih"] ?? `Ayah ${ayahNum} of Surah ${s.name}.`}
        url={siteUrl(`/quran/${s.slug}/${ayahNum}`)}
        datePublished="2026-09-18"
      />

      <header>
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          {t("eyebrow", { surah: s.name, ayah: ayahNum })}
        </p>
        <h1 className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-title">
          Surah {s.name} · Ayah {ayahNum}
        </h1>
        <Link
          href={`/quran/${s.slug}`}
          className="focus-ring mt-2 inline-block text-sm text-accent hover:underline"
        >
          {t("backToSurah", { surah: s.name })}
        </Link>
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

      <nav
        aria-label="Ayah navigation"
        className="mt-16 grid grid-cols-2 gap-4 border-t border-separator pt-8"
      >
        <div>
          {prevSlug && (
            <Link
              href={`/quran/${prevSlug}`}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">{t("previous")}</span>
              <span className="mt-1 block font-semibold tracking-title">Ayah {ayahNum - 1}</span>
            </Link>
          )}
        </div>
        <div className="text-right">
          {nextSlug && (
            <Link
              href={`/quran/${nextSlug}`}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">{t("next")}</span>
              <span className="mt-1 block font-semibold tracking-title">Ayah {ayahNum + 1}</span>
            </Link>
          )}
        </div>
      </nav>
    </article>
  );
}
