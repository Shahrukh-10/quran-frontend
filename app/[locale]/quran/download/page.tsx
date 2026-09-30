import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { hreflangLanguages } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Download the Quran PDF — Madinah Mushaf & Translation",
    description:
      "Download the complete Quran as an authentic PDF: the King Fahd Complex Madinah Mushaf (Uthmani script, Hafs narration) and Saheeh International English translation. Every file is a mirror of the official, freely-distributed digital waqf edition.",
    alternates: {
      canonical: siteUrl(locale === "en" ? "/quran/download" : `/${locale}/quran/download`),
      languages: hreflangLanguages("/quran/download"),
    },
    openGraph: {
      title: "Download the Quran PDF",
      description:
        "The complete Quran as an authentic PDF — Madinah Mushaf and Saheeh International translation.",
      url: siteUrl(locale === "en" ? "/quran/download" : `/${locale}/quran/download`),
    },
  };
}

// Every entry here MUST point at an authentic, freely-distributable source.
// The 'source' field cites the publisher so users know what they're getting.
// We deliberately DON'T re-host these ourselves because (a) they're 50-500 MB
// each and would bloat our deploy bundle, and (b) mirroring them changes the
// checksum and defeats the point of pointing at the official waqf.
type Edition = {
  id: string;
  title: string;
  subtitle: string;
  publisher: string;
  pages: number;
  fileSize: string;
  format: string;
  url: string;
  embedUrl: string;
  notes: string;
  recommended?: boolean;
};

const EDITIONS: readonly Edition[] = [
  {
    id: "kfgqpc-madinah-hafs",
    title: "Madinah Mushaf (Hafs) — Superior HD",
    subtitle: "King Fahd Complex · full-color · Uthmani script · with tajweed marks",
    publisher: "King Fahd Glorious Quran Printing Complex (KFGQPC)",
    pages: 604,
    fileSize: "343 MB",
    format: "PDF (image-based)",
    url: "https://archive.org/download/Hafs-HD/mumtaz-1.pdf",
    embedUrl: "https://archive.org/embed/Hafs-HD",
    notes:
      "The official 'Superior' (النسخة الممتازة) edition published by KFGQPC as a digital waqf. Highest-resolution scan available — every tajweed mark and every diacritic is clearly readable. Recommended for printing or study.",
    recommended: true,
  },
  {
    id: "kfgqpc-madinah-hafs-text",
    title: "Madinah Mushaf (Hafs) — text-searchable",
    subtitle: "King Fahd Complex · Uthmani script · smaller file · searchable",
    publisher: "King Fahd Glorious Quran Printing Complex (KFGQPC)",
    pages: 604,
    fileSize: "53 MB",
    format: "PDF (searchable text overlay)",
    url: "https://archive.org/download/Hafs-HD/mumtaz-1_text.pdf",
    embedUrl: "https://archive.org/embed/Hafs-HD",
    notes:
      "Same content as the HD edition above, but with an OCR text layer so you can copy verses and search inside the PDF. Better for mobile — the file is 6× smaller.",
  },
  {
    id: "saheeh-arabic-english",
    title: "Saheeh International — Arabic + English",
    subtitle: "Arabic Uthmani text side-by-side with English translation",
    publisher: "Saheeh International (Al-Muntada al-Islami, Jeddah)",
    pages: 2000,
    fileSize: "517 MB",
    format: "PDF (image-based)",
    url: "https://archive.org/download/QuranSaheehInternationalTranslationWithMainArabicText/Quran%20Saheeh%20International%20Translation%20With%20Main%20Arabic%20Text.pdf",
    embedUrl: "https://archive.org/embed/QuranSaheehInternationalTranslationWithMainArabicText",
    notes:
      "The Saheeh International translation is the most widely-used modern English Quran translation. This edition ships the Arabic Uthmani text alongside the English on every page, plus ~2,000 footnotes and a subject index.",
  },
  {
    id: "saheeh-english-only",
    title: "Saheeh International — English only",
    subtitle: "English meanings only · 1997 first edition",
    publisher: "Saheeh International · Abul-Qasim Publishing House",
    pages: 712,
    fileSize: "22 MB",
    format: "PDF",
    url: "https://archive.org/download/englishquranpdf/1997%20-%20Saheeh%20International%20-%20The%20Qur%E2%80%99an.pdf",
    embedUrl: "https://archive.org/embed/englishquranpdf",
    notes:
      "The compact English-only edition — good for reading meaning without the Arabic. The 1997 Saheeh International first edition, cataloged by the King Fahd National Library.",
  },
  {
    id: "saheeh-2023",
    title: "Saheeh International — 2023 revised edition",
    subtitle: "Arabic Uthmani text + English meaning · latest revision",
    publisher: "Saheeh International (2022/2023 revision)",
    pages: 640,
    fileSize: "89 MB",
    format: "PDF",
    url: "https://archive.org/download/The_Quran_Arabic_Text_with_Corresponding_English_Meaning/Quran_%20Arabic%20Text%20with%20Corresponding%20English%20Meaning%202023%2C%20The%20-%20SAHEEH%20INTERNATIONAL.pdf",
    embedUrl: "https://archive.org/embed/The_Quran_Arabic_Text_with_Corresponding_English_Meaning",
    notes:
      "The most recent Saheeh International revision (2022 copyright, published 2023). Cleaner typesetting than the 1997 edition; recommended if you're reading with translation.",
  },
];

export default async function QuranDownloadPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const bc = await breadcrumbs(locale);

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("quran"), url: siteUrl("/quran") },
          { name: "Download PDF", url: siteUrl("/quran/download") },
        ]}
      />

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-accent hover:underline">
          {bc("home")}
        </Link>
        <span className="mx-2">›</span>
        <Link href="/quran" className="hover:text-accent hover:underline">
          {bc("quran")}
        </Link>
        <span className="mx-2">›</span>
        <span className="text-foreground">Download PDF</span>
      </nav>

      <header className="relative overflow-hidden rounded-3xl border border-separator bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-8 md:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(circle_at_20%_20%,hsl(var(--accent)/0.35),transparent_60%)]"
        />
        <div className="relative">
          <p className="text-xs uppercase tracking-widest text-accent font-semibold">
            Read offline · Print · Study
          </p>
          <h1 className="mt-3 text-[clamp(2rem,4.5vw,3.25rem)] font-bold tracking-display leading-[1.05]">
            Download the Quran <span className="text-accent">as PDF</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground max-w-prose">
            Every file below is a mirror of an <strong className="text-foreground">authentic, freely-distributed</strong> edition
            — the King Fahd Complex Madinah Mushaf and the Saheeh International translation. Nothing
            has been re-typeset by us. Read in your browser, or download for offline use.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-separator bg-surface/70 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              5 editions
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-separator bg-surface/70 px-3 py-1.5">
              KFGQPC + Saheeh International
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-separator bg-surface/70 px-3 py-1.5">
              Free · Waqf · No signup
            </span>
          </div>
        </div>
      </header>

      {/* Trust panel — makes it explicit where PDFs come from */}
      <section
        className="mt-8 rounded-2xl border border-separator bg-surface p-5"
        aria-label="About these PDFs"
      >
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          About these PDFs
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed">
          <li>
            <strong>KFGQPC Madinah Mushaf</strong> — the official, physically-printed Quran
            distributed free by the Saudi government (~10 million copies/year). The digital PDF is a{" "}
            <em>waqf</em> (religious endowment) released by KFGQPC itself.
          </li>
          <li>
            <strong>Saheeh International</strong> — the most widely-used modern English translation,
            first published 1997 (Abul-Qasim Publishing House, Jeddah). Cataloged by the King Fahd
            National Library.
          </li>
          <li>
            <strong>Source mirror:</strong> archive.org (Internet Archive). We link to the mirror
            rather than re-hosting so the checksum matches the original waqf. If you prefer to
            download directly from the publisher, visit{" "}
            <a
              href="https://qurancomplex.gov.sa"
              className="text-accent hover:underline"
              rel="noopener noreferrer"
              target="_blank"
            >
              qurancomplex.gov.sa
            </a>
            .
          </li>
        </ul>
      </section>

      {/* Editions grid */}
      <section className="mt-12" aria-labelledby="editions-heading">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 id="editions-heading" className="text-2xl md:text-3xl font-bold tracking-title">
              Available editions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Five authentic PDFs, sorted by quality and size.
            </p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {EDITIONS.map((ed) => (
            <div
              key={ed.id}
              className={`group relative flex flex-col rounded-2xl border p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                ed.recommended
                  ? "border-accent/40 bg-gradient-to-br from-accent/[0.08] to-transparent ring-1 ring-accent/20"
                  : "border-separator bg-surface hover:border-accent/30"
              }`}
            >
              {ed.recommended && (
                <span className="absolute -top-2.5 right-5 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-foreground shadow-sm">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3" aria-hidden="true">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
                  </svg>
                  Recommended
                </span>
              )}

              {/* Cover-style visual header */}
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-separator">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-7 w-7 text-accent"
                    aria-hidden="true"
                  >
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold tracking-title leading-snug">{ed.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{ed.subtitle}</p>
                </div>
              </div>

              {/* Meta chips */}
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{ed.pages}</span>
                  pages
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{ed.fileSize}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
                  {ed.format}
                </span>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-muted-foreground flex-1">
                {ed.notes}
              </p>

              <p className="mt-4 text-[11px] uppercase tracking-widest text-muted-foreground">
                Publisher · {ed.publisher}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={ed.url}
                  className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 transition-opacity shadow-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download
                </a>
                <a
                  href={`#read-${ed.id}`}
                  className="focus-ring inline-flex items-center gap-2 rounded-full border border-separator bg-surface px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                  Read here
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Embedded readers — one per edition, lazy-loaded via anchor targets */}
      <section className="mt-14 space-y-12" aria-labelledby="readers-heading">
        <h2 id="readers-heading" className="text-2xl font-bold tracking-title">
          Read in your browser
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Each edition is embedded below as a read-only viewer. Click a title in the grid above to
          jump to it. First load streams pages from archive.org — if you plan to read a lot,
          download the PDF instead so nothing is fetched on every page turn.
        </p>

        {EDITIONS.map((ed) => (
          <div key={ed.id} id={`read-${ed.id}`} className="scroll-mt-24">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-separator pb-3">
              <h3 className="text-lg font-bold">{ed.title}</h3>
              <a
                href={ed.url}
                className="text-sm text-accent hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in new tab →
              </a>
            </div>
            <div className="mt-4 aspect-[3/4] overflow-hidden rounded-xl border border-separator">
              <iframe
                src={ed.embedUrl}
                title={ed.title}
                className="h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer"
                allowFullScreen
              />
            </div>
          </div>
        ))}
      </section>

      {/* Authenticity + rights */}
      <section className="mt-16 rounded-2xl border border-separator bg-surface p-6">
        <h2 className="text-lg font-bold tracking-title">Authenticity & rights</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The Quran itself is not copyrighted — its text is the Word of Allah, preserved for over
          1,400 years. Individual editions (translations, calligraphy, typesetting, footnotes) may
          carry publisher rights. The KFGQPC Madinah Mushaf and the Saheeh International translation
          are both released as a <em>waqf</em> — freely distributable for non-commercial reading and
          study. If you re-publish these files commercially, please contact the original publisher
          for permission.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Report any typographic or textual error you find in these mirrors to the respective
          publisher — they maintain the master files, not us.
        </p>
      </section>
    </article>
  );
}
