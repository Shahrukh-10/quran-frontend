import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  const t = await getTranslations({ locale, namespace: "tools.index" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: siteUrl(locale === "en" ? "/tools" : `/${locale}/tools`) },
    openGraph: {
      url: siteUrl(locale === "en" ? "/tools" : `/${locale}/tools`),
    },
  };
}

// Per-tool icon (matches SF-Symbols-ish style used in the mockups).
const ICONS: Record<string, React.ReactNode> = {
  tasbih: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="3.5" r="1.6" fill="currentColor" />
      <circle cx="20.5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="20.5" r="1.6" fill="currentColor" />
      <circle cx="3.5" cy="12" r="1.6" fill="currentColor" />
    </svg>
  ),
  "prayer-tracker": (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M9 11l3 3 8-8" />
      <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
    </svg>
  ),
  zakat: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v12M9 9h4.5a2 2 0 0 1 0 4H9m0 0h4.5a2 2 0 0 1 0 4H9" />
    </svg>
  ),
  adhkar: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M14 3v6h6" />
    </svg>
  ),
};

export default async function ToolsIndex({ params }: PageProps) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "tools.index" });
  const tasbih = await getTranslations({ locale, namespace: "tools.tasbih" });
  const tracker = await getTranslations({ locale, namespace: "tools.prayerTracker" });
  const zakat = await getTranslations({ locale, namespace: "tools.zakat" });
  const adhkar = await getTranslations({ locale, namespace: "tools.adhkar" });

  const tools = [
    { slug: "tasbih", title: tasbih("title"), description: tasbih("description") },
    { slug: "prayer-tracker", title: tracker("title"), description: tracker("description") },
    { slug: "zakat", title: zakat("title"), description: zakat("description") },
    { slug: "adhkar", title: adhkar("title"), description: adhkar("description") },
  ];

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("tools"), url: siteUrl("/tools") },
        ]}
      />
      <section className="section section--hero">
        <div className="container container--narrow">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-lede">{t("description")}</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="hig-grid hig-grid--2">
            {tools.map((tool) => (
              <Link key={tool.slug} className="hig-card focus-ring" href={`/tools/${tool.slug}`}>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div
                    className="hig-list__row-icon"
                    style={{ width: 44, height: 44, borderRadius: 12 }}
                  >
                    {ICONS[tool.slug]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="hig-card__title">{tool.title}</p>
                    <p className="hig-card__body">{tool.description}</p>
                  </div>
                  <div className="hig-list__row-chev" aria-hidden>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
