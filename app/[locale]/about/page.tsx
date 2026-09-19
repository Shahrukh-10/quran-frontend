import { locales } from "@/i18n/config";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return {
    title: t("title"),
    description: t("intro"),
  };
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AboutView />;
}

function AboutView() {
  const t = useTranslations("about");
  return (
    <>
      <section className="section section--hero">
        <div className="container container--narrow">
          <span className="eyebrow">About the project</span>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-lede">{t("intro")}</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container container--narrow">
          <div className="hig-grid" style={{ gap: 20 }}>
            <div className="hig-card">
              <p className="hig-card__eyebrow">Why</p>
              <h2 className="hig-card__title" style={{ fontSize: 20 }}>
                {t("whyTitle")}
              </h2>
              <p
                className="hig-card__body"
                style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55 }}
              >
                {t("whyBody")}
              </p>
            </div>
            <div className="hig-card">
              <p className="hig-card__eyebrow">How</p>
              <h2 className="hig-card__title" style={{ fontSize: 20 }}>
                {t("howTitle")}
              </h2>
              <p
                className="hig-card__body"
                style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55 }}
              >
                {t("howBody")}
              </p>
            </div>
            <div className="hig-info">
              <div className="hig-info__icon" aria-hidden>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <p className="hig-info__title">{t("notATitle")}</p>
                <p className="hig-info__body">{t("notABody")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
