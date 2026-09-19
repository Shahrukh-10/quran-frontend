import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getAllCategories, getCategory, getDuasInCategory } from "@/lib/duas";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const params: Array<{ locale: string; category: string }> = [];
  for (const locale of locales) {
    for (const c of getAllCategories()) {
      params.push({ locale, category: c.slug });
    }
  }
  return params;
}

type Props = { params: Promise<{ locale: string; category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  const cat = getCategory(category);
  if (!cat) return {};
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  return {
    title: cat.title[lang],
    description: cat.description[lang],
    alternates: {
      canonical: siteUrl(locale === "en" ? `/duas/${category}` : `/${locale}/duas/${category}`),
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { locale, category } = await params;
  setRequestLocale(locale);
  const cat = getCategory(category);
  if (!cat) notFound();
  const t = await getTranslations({ locale, namespace: "duas.category" });
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  const duas = getDuasInCategory(category);

  return (
    <div className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: siteUrl("/") },
          { name: "Duas", url: siteUrl("/duas") },
          { name: cat.title.en, url: siteUrl(`/duas/${category}`) },
        ]}
      />
      <Link href="/duas" className="focus-ring text-sm text-accent hover:underline">
        {t("backToDuas")}
      </Link>
      <h1 className="mt-3 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-display">
        {cat.title[lang]}
      </h1>
      <p className="mt-3 text-muted-foreground leading-relaxed">{cat.description[lang]}</p>
      <p className="mt-2 text-xs text-muted-foreground uppercase tracking-widest">
        {t("count", { count: duas.length })}
      </p>

      <ol className="mt-8 space-y-3">
        {duas.map((d) => (
          <li key={d.slug}>
            <Link
              href={`/duas/${category}/${d.slug}`}
              className="focus-ring flex items-start justify-between gap-4 rounded-2xl border border-separator bg-surface p-5 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span>
                <span className="block font-semibold tracking-title">{d.title[lang]}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{d.source}</span>
              </span>
              <span className="font-quran text-xl text-foreground/80 shrink-0" lang="ar" dir="rtl">
                →
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
