import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getAllNames, getName } from "@/lib/names";
import { getSurahByNumber } from "@/lib/quran";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const params: Array<{ locale: string; name: string }> = [];
  for (const locale of locales) {
    for (const n of getAllNames()) {
      params.push({ locale, name: n.slug });
    }
  }
  return params;
}

type Props = { params: Promise<{ locale: string; name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, name } = await params;
  const n = getName(name);
  if (!n) return {};
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  return {
    title: `${n.transliteration} — ${n.meaning[lang]}`,
    description: n.reflection[lang],
    alternates: {
      canonical: siteUrl(
        locale === "en" ? `/names-of-allah/${name}` : `/${locale}/names-of-allah/${name}`,
      ),
    },
  };
}

export default async function NamePage({ params }: Props) {
  const { locale, name } = await params;
  setRequestLocale(locale);
  const n = getName(name);
  if (!n) notFound();
  const t = await getTranslations({ locale, namespace: "names.name" });
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  const all = getAllNames();
  const prev = all.find((x) => x.order === n.order - 1);
  const next = all.find((x) => x.order === n.order + 1);

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: siteUrl("/") },
          { name: "99 Names of Allah", url: siteUrl("/names-of-allah") },
          { name: n.transliteration, url: siteUrl(`/names-of-allah/${n.slug}`) },
        ]}
      />
      <Link href="/names-of-allah" className="focus-ring text-sm text-accent hover:underline">
        {t("backToIndex")}
      </Link>

      <header className="mt-6 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{n.order} / 99</p>
        <p className="mt-8 font-quran text-[clamp(3rem,7vw,5rem)] leading-none" lang="ar" dir="rtl">
          {n.arabic}
        </p>
        <h1 className="mt-6 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-display">
          {n.transliteration}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">{n.meaning[lang]}</p>
      </header>

      <section className="mt-12 rounded-2xl border border-separator bg-surface p-6">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("reflectionTitle")}
        </h2>
        <p className="mt-3 leading-relaxed text-lg">{n.reflection[lang]}</p>
        {n.quranicRef && (
          <p className="mt-6 text-sm text-muted-foreground">
            <span className="uppercase tracking-widest text-xs">{t("quranicRef")}: </span>
            <Link
              href={buildAyahHref(n.quranicRef)}
              className="focus-ring text-accent hover:underline"
            >
              Quran {n.quranicRef}
            </Link>
          </p>
        )}
      </section>

      <nav
        aria-label="Names navigation"
        className="mt-16 grid grid-cols-2 gap-4 border-t border-separator pt-8"
      >
        <div>
          {prev && (
            <Link
              href={`/names-of-allah/${prev.slug}`}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">← {prev.order}</span>
              <span className="mt-1 block font-semibold tracking-title">
                {prev.transliteration}
              </span>
            </Link>
          )}
        </div>
        <div className="text-right">
          {next && (
            <Link
              href={`/names-of-allah/${next.slug}`}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">{next.order} →</span>
              <span className="mt-1 block font-semibold tracking-title">
                {next.transliteration}
              </span>
            </Link>
          )}
        </div>
      </nav>
    </article>
  );
}

// Convert "2:255" → "/quran/al-baqarah/255". Falls back to /quran on any surprise.
function buildAyahHref(ref: string): string {
  const [surahStr, ayahStr] = ref.split(":");
  if (!surahStr || !ayahStr) return "/quran";
  const surahNum = Number.parseInt(surahStr, 10);
  const surah = getSurahByNumber(surahNum);
  if (!surah) return "/quran";
  return `/quran/${surah.slug}/${ayahStr}`;
}
