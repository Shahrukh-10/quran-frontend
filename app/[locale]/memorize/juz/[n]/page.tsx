import { AyahAdder } from "@/components/memorize/ayah-adder";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { getAllSurahs, loadSurahAyat } from "@/lib/quran";
import { ayatInJuz } from "@/lib/quran-index";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  const params: Array<{ locale: string; n: string }> = [];
  for (const locale of locales) {
    for (let n = 1; n <= 30; n++) {
      params.push({ locale, n: String(n) });
    }
  }
  return params;
}

type Props = { params: Promise<{ locale: string; n: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, n } = await params;
  const juz = Number.parseInt(n, 10);
  if (!Number.isInteger(juz) || juz < 1 || juz > 30) return {};
  const t = await getTranslations({ locale, namespace: "memorize.juz" });
  return {
    title: t("pageTitle", { juz }),
    description: t("pageDescription", { juz }),
    alternates: {
      canonical: siteUrl(locale === "en" ? `/memorize/juz/${juz}` : `/${locale}/memorize/juz/${juz}`),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? `/memorize/juz/${juz}` : `/${locale}/memorize/juz/${juz}`),
    },
  };
}

export default async function MemorizeJuzPage({ params }: Props) {
  const { locale, n } = await params;
  const juz = Number.parseInt(n, 10);
  if (!Number.isInteger(juz) || juz < 1 || juz > 30) notFound();

  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "memorize.juz" });
  const bc = await breadcrumbs(locale);
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  const translationKey = lang === "id" ? "id.indonesian" : "en.sahih";

  // Fetch the verse keys in this juz, then load Arabic + translation for each.
  const keys = await ayatInJuz(juz);
  const surahs = getAllSurahs();
  const surahAyatCache = new Map<number, Awaited<ReturnType<typeof loadSurahAyat>>>();

  const rows: Array<{
    verseKey: string;
    surah: number;
    ayah: number;
    arabic: string;
    translation: string;
  }> = [];

  for (const key of keys) {
    const [s, a] = key.split(":").map(Number);
    if (!s || !a) continue;
    if (!surahAyatCache.has(s)) {
      surahAyatCache.set(s, await loadSurahAyat(s));
    }
    const surahData = surahAyatCache.get(s);
    if (!surahData) continue;
    const ayah = surahData.find((x) => x.ayah === a);
    if (!ayah) continue;
    rows.push({
      verseKey: key,
      surah: s,
      ayah: a,
      arabic: ayah.arabic,
      translation: ayah.translations[translationKey] ?? ayah.translations["en.sahih"] ?? "",
    });
  }

  const surahList = Array.from(new Set(rows.map((r) => r.surah)))
    .map((n) => surahs.find((s) => s.number === n))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: t("memorize"), url: siteUrl("/memorize") },
          { name: t("juzLabel", { juz }), url: siteUrl(`/memorize/juz/${juz}`) },
        ]}
      />

      <Link href="/memorize" className="focus-ring text-sm text-accent hover:underline">
        {t("backToDashboard")}
      </Link>

      <header className="mt-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("juzOf", { juz })}
        </p>
        <h1 className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-title">
          {t("pageTitle", { juz })}
        </h1>
        {surahList.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("coversSurahs")}: {surahList.map((s) => s.name).join(", ")}
          </p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          {t("verseCount", { count: rows.length })}
        </p>
      </header>

      <AyahAdder juz={juz} ayat={rows} />
    </article>
  );
}
