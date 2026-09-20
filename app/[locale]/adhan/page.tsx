import { AdhanPlayer } from "@/components/adhan/adhan-player";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  const t = await getTranslations({ locale, namespace: "adhan" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: siteUrl(locale === "en" ? "/adhan" : `/${locale}/adhan`) },
    openGraph: {
      url: siteUrl(locale === "en" ? "/adhan" : `/${locale}/adhan`),
    },
  };
}

export default async function AdhanPage({ params }: Props) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "adhan" });

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: t("title"), url: siteUrl("/adhan") },
        ]}
      />
      <section className="section section--hero">
        <div className="container container--narrow">
          <span className="eyebrow">Call to prayer</span>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-lede">{t("description")}</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container container--narrow">
          <div className="hig-card">
            <AdhanPlayer />
            <p style={{ marginTop: 16, fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
              Note: the current audio samples are Quranic recitations, not full adhan recordings.
              Curated adhan MP3s can be added under <code>public/audio/adhan/</code> and wired up
              here — for now these serve as a preview of the audio player UX.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
