import { BreadcrumbSchema, HowToSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getAllSalahTutorials, getSalahTutorial } from "@/lib/salah";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hreflangLanguages } from "@/lib/seo";

export async function generateStaticParams() {
  const params: Array<{ locale: string; topic: string }> = [];
  for (const locale of locales) {
    for (const t of getAllSalahTutorials()) {
      params.push({ locale, topic: t.slug });
    }
  }
  return params;
}

type Props = { params: Promise<{ locale: string; topic: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, topic } = await params;
  const bc = await breadcrumbs(locale);
  const tut = getSalahTutorial(topic);
  if (!tut) return {};
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  return {
    title: tut.title[lang],
    description: tut.summary[lang],
    alternates: {
      canonical: siteUrl(
        locale === "en" ? `/learn-salah/${topic}` : `/${locale}/learn-salah/${topic}`,
      ),
      languages: hreflangLanguages(`/learn-salah/${topic}`),
    },
    openGraph: {
      url: siteUrl(
        locale === "en" ? `/learn-salah/${topic}` : `/${locale}/learn-salah/${topic}`,
      ),
    },
  };
}

export default async function TopicPage({ params }: Props) {
  const { locale, topic } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const tut = getSalahTutorial(topic);
  if (!tut) notFound();
  const t = await getTranslations({ locale, namespace: "learnSalah.topic" });
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("learnSalah"), url: siteUrl("/learn-salah") },
          { name: tut.title.en, url: siteUrl(`/learn-salah/${topic}`) },
        ]}
      />
      <HowToSchema
        name={tut.title.en}
        description={tut.summary.en}
        steps={tut.steps.map((s) => ({ name: s.title.en, text: s.body.en }))}
      />

      <Link href="/learn-salah" className="focus-ring text-sm text-accent hover:underline">
        {t("backToIndex")}
      </Link>

      <header className="mt-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {tut.category}
          {tut.rakats && ` · ${tut.rakats} rakats`}
        </p>
        <h1 className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-display leading-tight">
          {tut.title[lang]}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{tut.summary[lang]}</p>
        <p className="mt-3 text-sm">
          <span className="text-muted-foreground uppercase tracking-widest text-xs">When: </span>
          {tut.when[lang]}
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("stepsTitle")}
        </h2>
        <ol className="mt-4 space-y-4">
          {tut.steps.map((step, i) => (
            <li
              key={`${step.title.en}-${i}`}
              className="rounded-2xl border border-separator bg-surface p-5"
            >
              <div className="flex items-start gap-4">
                <span
                  aria-hidden
                  className="flex-none inline-grid h-8 w-8 place-items-center rounded-lg bg-accent-muted text-accent font-semibold text-sm"
                >
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold tracking-title">{step.title[lang]}</p>
                  <p className="mt-1 leading-relaxed">{step.body[lang]}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {tut.duas && tut.duas.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("duasTitle")}
          </h2>
          <ul className="mt-4 space-y-4">
            {tut.duas.map((d, i) => (
              <li
                // Fallback to arabic slice + index because a dua record has no
                // stable id here. The arabic text uniquely identifies the dua
                // within a tutorial in practice; index guards against literal
                // duplicates without ever colliding across renders.
                key={`${d.arabic.slice(0, 24)}-${i}`}
                className="rounded-2xl border border-separator bg-surface p-5"
              >
                <p lang="ar" dir="rtl" className="font-quran text-4xl leading-[2.2] text-right">
                  {d.arabic}
                </p>
                <p className="mt-3 italic text-muted-foreground text-sm">{d.transliteration}</p>
                <p className="mt-2 leading-relaxed">{d.translation[lang]}</p>
                {d.note && <p className="mt-2 text-xs text-muted-foreground">{d.note[lang]}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tut.notes && tut.notes[lang].length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("notesTitle")}
          </h2>
          <ul className="mt-4 list-disc list-inside space-y-2 text-muted-foreground leading-relaxed">
            {tut.notes[lang].map((n, i) => (
              <li key={`note-${i}-${n.slice(0, 16)}`}>{n}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
