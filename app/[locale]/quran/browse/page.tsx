// /quran/browse — the "table of contents" for divisions of the Quran.
// Surahs are already listed on /quran. This page indexes the OTHER canonical
// divisions: Juz, Hizb, Manzil, Ruku, Page. All static, no client JS.

import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { Link } from "@/i18n/routing";
import { summarizeHizb, summarizeJuz, summarizeManzil } from "@/lib/quran-index";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { hreflangLanguages } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  return {
    title: "Browse the Quran by Juz, Hizb, Manzil, Ruku, or Page",
    description:
      "Every canonical division of the Quran — 30 Juz, 60 Hizb, 7 Manzil, 558 Ruku, and 604 pages of the Madinah muṣḥaf. Jump straight in.",
    alternates: {
      canonical: siteUrl(locale === "en" ? "/quran/browse" : `/${locale}/quran/browse`),
      languages: hreflangLanguages('/quran/browse'),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/quran/browse" : `/${locale}/quran/browse`),
    },
  };
}

export default async function BrowsePage({ params }: Props) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);

  const [juzs, hizbs, manzils] = await Promise.all([
    summarizeJuz(),
    summarizeHizb(),
    summarizeManzil(),
  ]);

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("quran"), url: siteUrl("/quran") },
          { name: bc("browse"), url: siteUrl("/quran/browse") },
        ]}
      />

      <header>
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Browse</p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold tracking-display">
          Quran divisions
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-prose">
          The Quran can be read chapter by chapter (114 surahs), or by any of the traditional
          divisions used by imams, scholars, and reading schedules across the centuries.
        </p>
      </header>

      {/* Juz — 30 */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-title">Juz — 30 parts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One Juz per day completes the Quran in a month — the traditional Ramadan schedule.
        </p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {juzs.map((j) => (
            <Link
              key={j.juz}
              href={`/quran/juz/${j.juz}`}
              className="focus-ring rounded-lg border border-separator bg-surface px-3 py-2 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <div className="text-sm font-semibold">Juz {j.juz}</div>
              <div className="text-xs text-muted-foreground truncate">
                {j.firstKey} → {j.lastKey}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Hizb — 60 */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-title">Hizb — 60 half-parts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Half of a Juz. Two per day completes the Quran in a month; four per day, in two weeks.
        </p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {hizbs.map((h) => (
            <Link
              key={h.hizb}
              href={`/quran/hizb/${h.hizb}`}
              className="focus-ring rounded-lg border border-separator bg-surface px-3 py-2 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <div className="text-sm font-semibold">Hizb {h.hizb}</div>
              <div className="text-xs text-muted-foreground">Juz {h.juz}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Manzil — 7 */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-title">Manzil — 7 portions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One Manzil per day of the week completes the Quran in a week — a schedule attributed to
          companions of the Prophet ﷺ.
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {manzils.map((m) => (
            <Link
              key={m.manzil}
              href={`/quran/manzil/${m.manzil}`}
              className="focus-ring rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <div className="text-sm font-semibold">Manzil {m.manzil}</div>
              <div className="text-xs text-muted-foreground">
                {m.firstKey} → {m.lastKey} · {m.ayahCount} ayat
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Pages — 604 (linked in bulk, not enumerated) */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-title">Mushaf pages — 604</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every page of the Madinah muṣḥaf has a dedicated route. Enter a page number:
        </p>
        <form
          method="get"
          action={locale === "en" ? "/quran/browse/go" : `/${locale}/quran/browse/go`}
          className="mt-3 flex flex-wrap items-end gap-3"
        >
          <label>
            <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">
              Page (1–604)
            </span>
            <input
              type="number"
              name="page"
              min={1}
              max={604}
              defaultValue={1}
              className="focus-ring h-11 w-24 rounded-lg border border-separator bg-background px-3 text-sm"
            />
          </label>
          <button
            type="submit"
            className="focus-ring h-11 rounded-lg bg-accent px-5 text-sm font-semibold text-[hsl(var(--accent-foreground))] hover:bg-accent/90"
          >
            Go to page
          </button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">
          Jump straight in:{" "}
          {[1, 100, 200, 300, 400, 500, 604].map((p, i, arr) => (
            <span key={p}>
              <Link href={`/quran/page/${p}`} className="text-accent hover:underline">
                Page {p}
              </Link>
              {i < arr.length - 1 ? " · " : ""}
            </span>
          ))}
        </p>
      </section>

      {/* Ruku — 558 (linked in bulk) */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-title">Ruku — 558 sections</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Rukus mark natural pausing points for the imam during Salah. There are 558 rukus in the
          Madinah muṣḥaf.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Sample:{" "}
          {[1, 50, 100, 200, 300, 400, 500, 558].map((r, i, arr) => (
            <span key={r}>
              <Link href={`/quran/ruku/${r}`} className="text-accent hover:underline">
                Ruku {r}
              </Link>
              {i < arr.length - 1 ? " · " : ""}
            </span>
          ))}
        </p>
      </section>
    </article>
  );
}
