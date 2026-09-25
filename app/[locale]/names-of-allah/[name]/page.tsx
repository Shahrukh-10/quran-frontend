import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getAllNames, getName } from "@/lib/names";
import { getSurahByNumber } from "@/lib/quran";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hreflangLanguages } from "@/lib/seo";

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
  const title = `${n.transliteration} (${n.arabic}) — "${n.meaning[lang]}" · Name of Allah ${n.order}/99`;
  const desc = `${n.transliteration} means "${n.meaning[lang]}". ${n.reflection[lang]} — The ${n.order}${ord(n.order)} of the 99 Names of Allah (Asma-ul-Husna) in Islam.${n.quranicRef ? ` Referenced in Quran ${n.quranicRef}.` : ""}`;
  return {
    title: title.slice(0, 70),
    description: desc.slice(0, 300),
    keywords: [
      n.transliteration,
      `${n.transliteration} meaning`,
      `${n.transliteration} in Arabic`,
      `Name of Allah ${n.transliteration}`,
      `Asma-ul-Husna`,
      "99 Names of Allah",
      `Allah name ${n.order}`,
      n.arabic,
      n.meaning[lang],
    ].join(", "),
    alternates: {
      canonical: siteUrl(
        locale === "en" ? `/names-of-allah/${name}` : `/${locale}/names-of-allah/${name}`,
      ),
      languages: hreflangLanguages(`/names-of-allah/${name}`),
    },
    openGraph: {
      title: title.slice(0, 90),
      description: n.reflection[lang],
      url: siteUrl(
        locale === "en" ? `/names-of-allah/${name}` : `/${locale}/names-of-allah/${name}`,
      ),
      type: "article",
    },
  };
}

export default async function NamePage({ params }: Props) {
  const { locale, name } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const n = getName(name);
  if (!n) notFound();
  const t = await getTranslations({ locale, namespace: "names.name" });
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  const all = getAllNames();
  const prev = all.find((x) => x.order === n.order - 1);
  const next = all.find((x) => x.order === n.order + 1);

  // Related — take 4 names around this one for the "explore more" band
  const related = all
    .filter((x) => x.slug !== n.slug && Math.abs(x.order - n.order) <= 3)
    .slice(0, 4);

  const faqs = [
    {
      q: `What does ${n.transliteration} mean?`,
      a: `${n.transliteration} (${n.arabic}) means "${n.meaning.en}" in English. It is the ${n.order}${ord(n.order)} of the 99 Names of Allah (Asma-ul-Husna) in Islam. ${n.reflection.en}`,
    },
    {
      q: `How is ${n.transliteration} written in Arabic?`,
      a: `${n.transliteration} is written in Arabic as ${n.arabic}. The definite article "Al-" prefix means "The", so ${n.transliteration} literally means "The ${n.meaning.en.replace(/^The /, "")}".`,
    },
    {
      q: `Is ${n.transliteration} mentioned in the Quran?`,
      a: n.quranicRef
        ? `Yes — ${n.transliteration} is referenced in Quran ${n.quranicRef}. The Quran describes Allah using His most beautiful names throughout its verses, and this particular name appears in Surah ${n.quranicRef.split(":")[0]}.`
        : `${n.transliteration} appears in the wider Islamic tradition of the 99 Names of Allah (Asma-ul-Husna), which are compiled from the Quran and authentic hadith. Not every name has a single Quranic verse citation, but they collectively describe Allah's attributes as revealed in Islamic scripture.`,
    },
    {
      q: `What are the 99 Names of Allah?`,
      a: `The 99 Names of Allah — Asma-ul-Husna (الأسماء الحسنى, "The Most Beautiful Names") — are the names by which Muslims describe and remember Allah. Compiled from the Quran and authentic hadith, each name reveals an attribute of Allah's essence, actions, or mercy. The Prophet Muhammad ﷺ said whoever memorises them will enter Paradise (Sahih al-Bukhari 2736).`,
    },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: "99 Names of Allah", url: siteUrl("/names-of-allah") },
          { name: n.transliteration, url: siteUrl(`/names-of-allah/${n.slug}`) },
        ]}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD injection
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Visible breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-accent hover:underline">
          {bc("home")}
        </Link>
        <span className="mx-2">›</span>
        <Link href="/names-of-allah" className="hover:text-accent hover:underline">
          99 Names of Allah
        </Link>
        <span className="mx-2">›</span>
        <span className="text-foreground">{n.transliteration}</span>
      </nav>

      <header className="text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {n.order} of 99 · Asma-ul-Husna
        </p>
        <p
          className="mt-8 font-quran text-[clamp(3rem,7vw,5rem)] leading-none"
          lang="ar"
          dir="rtl"
        >
          {n.arabic}
        </p>
        <h1 className="mt-6 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-display">
          {n.transliteration}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          "{n.meaning[lang]}" — the {n.order}
          {ord(n.order)} of the 99 Names of Allah
        </p>
      </header>

      {/* Reflection + Quranic ref (existing content, kept) */}
      <section className="mt-12 rounded-2xl border border-separator bg-surface p-6">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("reflectionTitle")}
        </h2>
        <p className="mt-3 leading-relaxed text-lg">{n.reflection[lang]}</p>
        {n.quranicRef && (
          <p className="mt-6 text-sm text-muted-foreground">
            <span className="uppercase tracking-widest text-xs">
              {t("quranicRef")}:{" "}
            </span>
            <Link
              href={buildAyahHref(n.quranicRef) as "/quran/[surah]/[ayah]"}
              className="focus-ring text-accent hover:underline"
            >
              Quran {n.quranicRef}
            </Link>
          </p>
        )}
      </section>

      {/* About Asma-ul-Husna — durable topical anchor */}
      <section
        className="mt-8 rounded-2xl border border-separator bg-surface p-6"
        aria-labelledby="about-asma-heading"
      >
        <h2 id="about-asma-heading" className="text-lg font-bold tracking-title">
          About the 99 Names of Allah
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The 99 Names of Allah — Asma-ul-Husna (الأسماء الحسنى, "The Most
          Beautiful Names") — are the names by which Allah is described in the
          Quran and authentic hadith. Each name reveals an attribute of Allah:
          His mercy, might, wisdom, forgiveness, sustenance, and countless
          others. The Prophet Muhammad ﷺ said, "Allah has ninety-nine names,
          one hundred less one; whoever memorises them will enter Paradise"
          (Sahih al-Bukhari 2736). {n.transliteration} is one of these names.
        </p>
        <p className="mt-3 text-sm">
          <Link href="/names-of-allah" className="text-accent hover:underline">
            Explore all 99 Names of Allah →
          </Link>
        </p>
      </section>

      {/* Related names */}
      {related.length > 0 && (
        <section className="mt-8" aria-labelledby="related-names-heading">
          <h2
            id="related-names-heading"
            className="text-lg font-bold tracking-title"
          >
            Nearby names of Allah
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/names-of-allah/${r.slug}` as "/names-of-allah/[name]"}
                className="focus-ring rounded-xl border border-separator bg-surface p-4 hover:bg-muted transition-colors"
              >
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-quran text-2xl"
                    lang="ar"
                    dir="rtl"
                  >
                    {r.arabic}
                  </span>
                  <span className="text-sm font-semibold">
                    {r.transliteration}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.meaning[lang]}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="mt-8" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-lg font-bold tracking-title">
          Frequently asked about {n.transliteration}
        </h2>
        <div className="mt-4 space-y-4">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="rounded-2xl border border-separator bg-surface p-5"
            >
              <summary className="cursor-pointer text-base font-semibold">
                {f.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <nav
        aria-label="Names navigation"
        className="mt-16 grid grid-cols-2 gap-4 border-t border-separator pt-8"
      >
        <div>
          {prev && (
            <Link
              href={`/names-of-allah/${prev.slug}` as "/names-of-allah/[name]"}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">
                ← {prev.order}
              </span>
              <span className="mt-1 block font-semibold tracking-title">
                {prev.transliteration}
              </span>
            </Link>
          )}
        </div>
        <div className="text-right">
          {next && (
            <Link
              href={`/names-of-allah/${next.slug}` as "/names-of-allah/[name]"}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">
                {next.order} →
              </span>
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

function ord(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  const idx = (v - 20) % 10;
  return suffixes[idx] ?? suffixes[v] ?? suffixes[0] ?? "th";
}
