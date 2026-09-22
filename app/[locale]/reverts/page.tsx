import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { getAllSections } from "@/lib/reverts";
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
  const t = await getTranslations({ locale, namespace: "reverts.index" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: siteUrl(locale === "en" ? "/reverts" : `/${locale}/reverts`),
      languages: hreflangLanguages('/reverts'),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/reverts" : `/${locale}/reverts`),
    },
  };
}

export default async function RevertsIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "reverts.index" });
  const bc = await breadcrumbs(locale);
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  const sections = getAllSections();

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: t("title"), url: siteUrl("/reverts") },
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
        <p className="mt-3 mx-auto max-w-prose text-xs text-muted-foreground italic leading-relaxed">
          {t("welcomeNote")}
        </p>
      </header>

      <div className="mt-14 space-y-14">
        {sections.map((section) => (
          <section
            key={section.slug}
            aria-labelledby={`section-${section.slug}`}
          >
            <h2
              id={`section-${section.slug}`}
              className="text-2xl font-bold tracking-title"
            >
              {section.title[lang]}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-prose">
              {section.description[lang]}
            </p>

            <ol className="mt-6 space-y-3">
              {section.articles.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`/reverts/${article.slug}` as "/reverts/[article]"}
                    className="focus-ring block rounded-2xl border border-separator bg-surface p-5 hover:bg-muted transition-colors duration-micro ease-spring"
                  >
                    <h3 className="font-semibold tracking-title text-lg">
                      {article.title[lang]}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {article.body[lang].split("\n")[0]}
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <p className="mt-16 text-center text-xs text-muted-foreground max-w-prose mx-auto">
        {t("dataSourceNotice")}
      </p>
    </article>
  );
}
