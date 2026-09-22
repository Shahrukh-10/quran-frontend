import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { getAllBooks } from "@/lib/hadith";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hreflangLanguages } from "@/lib/seo";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hadith.index" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: siteUrl(locale === "en" ? "/hadith" : `/${locale}/hadith`),
      languages: hreflangLanguages('/hadith'),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/hadith" : `/${locale}/hadith`),
    },
  };
}

export default async function HadithIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "hadith.index" });
  const bc = await breadcrumbs(locale);
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  const books = getAllBooks();

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: t("title"), url: siteUrl("/hadith") },
        ]}
      />

      <header className="text-center">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold tracking-display">
          {t("title")}
        </h1>
        <p className="mt-4 mx-auto max-w-prose text-muted-foreground leading-relaxed">
          {t("description")}
        </p>
      </header>

      <section aria-labelledby="collections-heading" className="mt-12">
        <h2 id="collections-heading" className="sr-only">
          {t("collectionsHeading")}
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2">
          {books.map((b) => (
            <li key={b.slug}>
              <Link
                href={`/hadith/${b.slug}` as "/hadith/[book]"}
                className="focus-ring block h-full rounded-2xl border border-separator bg-surface p-5 hover:bg-muted transition-colors duration-micro ease-spring"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold tracking-title text-lg">{b.name[lang]}</span>
                  <span
                    className="font-quran text-xl text-foreground/80 shrink-0"
                    lang="ar"
                    dir="rtl"
                  >
                    {b.arabicName}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {b.description[lang]}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {b.compiler[lang]} · {b.eraCE} · {b.totalHadith.toLocaleString()} {t("hadiths")}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-12 text-center text-xs text-muted-foreground max-w-prose mx-auto">
        {t("dataSourceNotice")}
      </p>
    </article>
  );
}
