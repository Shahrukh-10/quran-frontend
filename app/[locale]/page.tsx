import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "./_home-hig.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home.hero" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

// Six featured surahs — real data pulled from the seeded corpus.
// Kept static here so the hero rail renders instantly with no fetch.
const FEATURED_SURAHS = [
  {
    n: 1,
    ar: "الفاتحة",
    name: "Al-Fatihah",
    en: "The Opening",
    type: "Meccan",
    count: 7,
    slug: "al-fatihah",
  },
  {
    n: 2,
    ar: "البقرة",
    name: "Al-Baqarah",
    en: "The Cow",
    type: "Medinan",
    count: 286,
    slug: "al-baqarah",
  },
  { n: 36, ar: "يس", name: "Ya-Sin", en: "Ya Sin", type: "Meccan", count: 83, slug: "ya-sin" },
  {
    n: 55,
    ar: "الرحمن",
    name: "Ar-Rahman",
    en: "The Most Merciful",
    type: "Medinan",
    count: 78,
    slug: "ar-rahman",
  },
  {
    n: 67,
    ar: "الملك",
    name: "Al-Mulk",
    en: "The Sovereignty",
    type: "Meccan",
    count: 30,
    slug: "al-mulk",
  },
  {
    n: 18,
    ar: "الكهف",
    name: "Al-Kahf",
    en: "The Cave",
    type: "Meccan",
    count: 110,
    slug: "al-kahf",
  },
] as const;

// Fake sample data for the hero prayer widget. On /prayer-times the real
// numbers are computed client-side; the home widget is illustrative.
const SAMPLE_TIMES = [
  { name: "Fajr", time: "4:55 AM" },
  { name: "Sunrise", time: "6:10 AM" },
  { name: "Dhuhr", time: "12:15 PM" },
  { name: "Asr", time: "3:35 PM" },
  { name: "Maghrib", time: "6:16 PM", active: true },
  { name: "Isha", time: "7:26 PM" },
] as const;

const FEATURES = [
  {
    href: "/quran",
    title: "Quran",
    caption: "All 114 surahs",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    href: "/duas",
    title: "Duas",
    caption: "35 authentic supplications",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M18 11V6a2 2 0 0 0-4 0v5" />
        <path d="M14 10V4a2 2 0 0 0-4 0v2" />
        <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
      </svg>
    ),
  },
  {
    href: "/prayer-times",
    title: "Prayer",
    caption: "Times for any city",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    href: "/qibla",
    title: "Qibla",
    caption: "Direction to Makkah",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    ),
  },
  {
    href: "/learn-salah",
    title: "Learn Salah",
    caption: "Step-by-step guide",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M22 10L12 5 2 10l10 5 10-5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  },
  {
    href: "/names-of-allah",
    title: "99 Names",
    caption: "Meanings & audio",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        <path d="M20 3v4" />
        <path d="M22 5h-4" />
      </svg>
    ),
  },
  {
    href: "/calendar",
    title: "Hijri",
    caption: "Islamic calendar",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: "/tools",
    title: "Tools",
    caption: "Tasbih & more",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
] as const;

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "home.hero" });

  return (
    <>
      {/* Hero — restored static hero (title/subtitle/CTAs on a soft Basmala
          watermark). The prayer widget lives on /prayer-times, not the home page. */}
      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__eyebrow">Sourced · Offline-first · Ad-free</div>
          <h1 className="hero__title">{t("title")}</h1>
          <p className="hero__subtitle">{t("subtitle")}</p>
          <div className="hero__ctas">
            <Link className="btn btn--primary" href="/quran">
              {t("ctaPrimary")}
            </Link>
            <Link className="btn btn--secondary" href="/duas">
              {t("ctaSecondary")}
            </Link>
          </div>
        </div>
      </section>

      {/* Featured surahs — horizontal-scroll rail */}
      <section className="section">
        <div className="container">
          <div className="section__head">
            <div>
              <h2>Featured surahs</h2>
              <p>Frequently read. Tap any card to open the reader.</p>
            </div>
            <Link className="section__link hstack" href="/quran">
              All 114{" "}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
        <div className="container">
          <div className="rail" role="list">
            {FEATURED_SURAHS.map((s) => (
              <Link key={s.n} className="surah-card" href={`/quran/${s.slug}`} role="listitem">
                <span className="surah-card__num">Surah {String(s.n).padStart(3, "0")}</span>
                <span className="surah-card__arabic" lang="ar" dir="rtl">
                  {s.ar}
                </span>
                <span className="surah-card__name">{s.name}</span>
                <span className="surah-card__meta">
                  {s.en} · {s.type} · {s.count} ayat
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Today · Prayer widget */}
      <section className="section">
        <div className="container">
          <div className="section__head">
            <div>
              <h2>Today · New Delhi</h2>
              <p>Karachi method · Sample times for illustration.</p>
            </div>
            <Link className="section__link hstack" href="/prayer-times">
              Change city{" "}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
          <div
            className="prayer-card"
            role="group"
            aria-label="Sample prayer times for New Delhi today"
          >
            <div>
              <div className="prayer-card__label">Next prayer</div>
              <div className="prayer-card__next">
                <span className="prayer-card__accent">Maghrib</span> · 6:16 PM
              </div>
              <div className="prayer-card__sub">in ~2h · sample data</div>
            </div>
            <div className="prayer-card__times">
              {SAMPLE_TIMES.map((p) => (
                <div
                  key={p.name}
                  className="prayer-card__tile"
                  {...("active" in p && p.active ? { "aria-current": "true" } : {})}
                >
                  <div className="prayer-card__tile-name">{p.name}</div>
                  <div className="prayer-card__tile-time">{p.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Everything you need — 8-card feature grid */}
      <section className="section">
        <div className="container">
          <div className="section__head">
            <div>
              <h2>Everything you need</h2>
              <p>Eight tools built for daily practice.</p>
            </div>
          </div>
          <div className="features">
            {FEATURES.map((f) => (
              <Link key={f.href} className="feature" href={f.href}>
                <div className="feature__icon">{f.icon}</div>
                <div className="feature__title">{f.title}</div>
                <div className="feature__caption">{f.caption}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How this site works — final section */}
      <section className="section">
        <div className="container">
          <div className="section__head">
            <div>
              <h2>How this site works</h2>
              <p>Three principles behind every page.</p>
            </div>
          </div>
          <div className="how">
            <div className="how__item">
              <div className="how__num">1</div>
              <h3 className="how__title">Sourced, not generated</h3>
              <p className="how__body">
                Every ayah, dua, hadith, and translation carries a citation. Nothing is invented by
                AI.
              </p>
            </div>
            <div className="how__item">
              <div className="how__num">2</div>
              <h3 className="how__title">Offline first</h3>
              <p className="how__body">
                The Quran text, all duas, and prayer-time schedules load once and work with no
                network.
              </p>
            </div>
            <div className="how__item">
              <div className="how__num">3</div>
              <h3 className="how__title">No tracking, no account</h3>
              <p className="how__body">
                Bookmarks live in your browser. No ads, no analytics, no login walls.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
