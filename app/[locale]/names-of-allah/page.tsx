import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getAllNames } from "@/lib/names";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import "./_names-hig.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "The 99 Names of Allah — Al-Asmāʾ al-Ḥusnā",
    description:
      'The 99 beautiful names of Allah, each with Arabic, transliteration, and translation. "To Allah belong the most beautiful names, so call upon Him by them." (Qur\'ān 7:180)',
    alternates: {
      canonical: siteUrl(locale === "en" ? "/names-of-allah" : `/${locale}/names-of-allah`),
    },
  };
}

export default async function NamesIndexPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const names = getAllNames();
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";

  return (
    <div className="container" style={{ paddingTop: 64, paddingBottom: 96 }}>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: siteUrl("/") },
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
