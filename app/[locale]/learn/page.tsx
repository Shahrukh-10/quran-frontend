import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { CATEGORY_META, FIGURES, type FigureCategory } from "@/lib/figures";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { hreflangLanguages } from "@/lib/seo";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  return {
    title: "Learn — Biographies of the Prophets, Ṣaḥābah, and Scholars",
    description:
      "Sourced biographies of the Prophets (peace be upon them), the Ṣaḥābah, the Rāshidūn caliphs, the Imams of the four Sunnī schools, and the classical scholars — every fact cites Bukhārī, Muslim, Ibn Hishām, adh-Dhahabī, or Ibn Kathīr.",
    alternates: {
      canonical: siteUrl(locale === "en" ? "/learn" : `/${locale}/learn`),
      languages: hreflangLanguages('/learn'),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/learn" : `/${locale}/learn`),
    },
  };
}

const ORDER: FigureCategory[] = ["prophets", "rashidun", "sahabah", "imams", "hadith", "scholars"];

export default async function LearnPage({ params }: PageProps) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);

  const byCat: Record<FigureCategory, typeof FIGURES> = {
    prophets: [],
    rashidun: [],
    sahabah: [],
    imams: [],
    hadith: [],
    scholars: [],
  };
  for (const f of FIGURES) byCat[f.category].push(f);

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("learn"), url: siteUrl("/learn") },
        ]}
      />
      <section className="section section--hero">
        <div className="container">
          <span className="eyebrow" style={{ color: "hsl(var(--accent))" }}>
            Learn
          </span>
          <h1 className="page-title" style={{ maxWidth: 640 }}>
            The people of Islam.
          </h1>
          <p className="page-lede">
            Biographies of the Prophets (peace be upon them), the Ṣaḥābah, and the classical
            scholars — every fact cited from Bukhārī, Muslim, Ibn Hishām, adh-Dhahabī, or Ibn
            Kathīr. No fabrications, no folk stories.
          </p>
        </div>
      </section>

      {ORDER.map((cat) => (
        <section key={cat} className="section" style={{ paddingTop: 8, paddingBottom: 32 }}>
          <div className="container">
            <div className="section__head">
              <div>
                <h2>{CATEGORY_META[cat].label}</h2>
              </div>
              <span className="hig-chip">
                {byCat[cat].length} {byCat[cat].length === 1 ? "figure" : "figures"}
              </span>
            </div>
            <div className="hig-grid hig-grid--3">
              {byCat[cat].map((f) => (
                <Link key={f.slug} href={`/learn/${f.slug}`} className="hig-card focus-ring">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div
                      aria-hidden
                      style={{
                        display: "inline-grid",
                        placeItems: "center",
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "hsl(var(--accent) / 0.12)",
                        color: "hsl(var(--accent))",
                        fontWeight: 600,
                        fontSize: 18,
                        fontFamily: "var(--font-amiri), Amiri, serif",
                      }}
                    >
                      {f.init}
                    </div>
                    <span className="hig-chip hig-chip--accent">{f.tag}</span>
                  </div>
                  <p className="hig-card__title" style={{ marginTop: 14, fontSize: 17 }}>
                    {f.name}
                  </p>
                  <p
                    lang="ar"
                    dir="rtl"
                    style={{
                      marginTop: 2,
                      textAlign: "right",
                      fontFamily: "var(--font-amiri), Amiri, serif",
                      fontSize: 20,
                      color: "hsl(var(--muted-foreground))",
                    }}
                  >
                    {f.nameArabic}
                  </p>
                  {f.epithet && (
                    <p
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: "hsl(var(--muted-foreground))",
                        fontStyle: "italic",
                      }}
                    >
                      {f.epithet}
                    </p>
                  )}
                  <p
                    style={{
                      marginTop: 12,
                      fontSize: 14,
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {f.body}
                  </p>
                  <p
                    style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: "0.5px solid hsl(var(--separator))",
                      fontSize: 11,
                      color: "hsl(var(--muted-foreground))",
                      fontStyle: "italic",
                    }}
                  >
                    {f.source}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="section" style={{ paddingTop: 16 }}>
        <div className="container">
          <p
            style={{
              paddingTop: 32,
              borderTop: "0.5px solid hsl(var(--separator))",
              fontSize: 14,
              color: "hsl(var(--muted-foreground))",
            }}
          >
            Every biography on this page cites a classical Islamic source. See the{" "}
            <Link
              href="/sources"
              style={{
                color: "hsl(var(--accent))",
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
            >
              sources page
            </Link>{" "}
            for the full editorial policy.
          </p>
        </div>
      </section>
    </>
  );
}
